from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput, AcquisitionCostItem
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.models.funding import FundingAssumption
from backend.app.models.schedule import ScheduleMilestone
from backend.app.schemas.scenario import (
    ScenarioCreate,
    ScenarioUpdate,
    ScenarioRead,
    ScenarioCloneInput,
    ScenarioMetrics,
    ScenarioComparisonResponse,
)
from backend.app.calculations.costs import calculate_development_costs, calculate_land_acquisition_totals
from backend.app.calculations.revenue import calculate_gross_revenue
from backend.app.calculations.funding import calculate_funding_capital_stack
from backend.app.calculations.cashflow import generate_cash_flow_schedule
from backend.app.api.v1.costs import DEFAULT_COST_TEMPLATES
from backend.app.api.v1.sales import DEFAULT_SALES_TEMPLATES

router = APIRouter(tags=["Scenarios"])

def compute_single_scenario_metrics(scenario: Scenario, db: Session) -> ScenarioMetrics:
    # 1. Land
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario.id).first()
    land_price = Decimal("0.00")
    land_total = Decimal("0.00")
    land_costs_amt = Decimal("0.00")
    if land:
        land_price = land.purchase_price
        cost_amounts = [item.amount for item in land.acquisition_costs]
        totals = calculate_land_acquisition_totals(land.purchase_price, land.deposit_amount, cost_amounts)
        land_total = totals["total_land_acquisition"]
        land_costs_amt = totals["total_acquisition_costs"]

    # 2. Costs
    cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario.id).all()
    if not cost_items:
        for t in DEFAULT_COST_TEMPLATES:
            item = CostItem(scenario_id=scenario.id, **t)
            db.add(item)
        db.commit()
        cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario.id).all()

    cost_dicts = [
        {"category": c.category, "name": c.name, "amount": c.amount, "phasing_curve": c.phasing_curve, "start_month": c.start_month, "end_month": c.end_month, "calculation_method": c.calculation_method, "quantity": c.quantity, "rate": c.rate}
        for c in cost_items
    ]
    cost_calc = calculate_development_costs(cost_dicts, land_acquisition_total=land_total)

    # 3. Sales
    sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario.id).all()
    if not sales_items:
        for t in DEFAULT_SALES_TEMPLATES:
            item = SalesProductItem(scenario_id=scenario.id, **t)
            db.add(item)
        db.commit()
        sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario.id).all()

    sales_dicts = [
        {"name": s.name, "total_units": s.total_units, "avg_internal_area": s.avg_internal_area, "avg_external_area": s.avg_external_area, "price_per_sqm": s.price_per_sqm, "unit_sale_price": s.unit_sale_price, "total_revenue": s.total_revenue, "sales_commission_pct": s.sales_commission_pct, "marketing_cost_pct": s.marketing_cost_pct, "sales_start_month": s.sales_start_month, "sales_end_month": s.sales_end_month, "settlement_month": s.settlement_month}
        for s in sales_items
    ]
    rev_calc = calculate_gross_revenue(sales_dicts)

    total_project_cost = cost_calc["total_project_cost"]
    grv = rev_calc["gross_realisation_value"]
    nrv = rev_calc["net_realisation_value"]
    net_profit = nrv - total_project_cost

    margin_on_cost = (net_profit / total_project_cost * Decimal("100.0")) if total_project_cost > 0 else Decimal("0.00")
    margin_on_grv = (net_profit / grv * Decimal("100.0")) if grv > 0 else Decimal("0.00")

    # 4. Funding
    funding = db.query(FundingAssumption).filter(FundingAssumption.scenario_id == scenario.id).first()
    if not funding:
        funding_calc = calculate_funding_capital_stack(
            total_project_cost=total_project_cost,
            gross_realisation_value=grv,
            senior_debt_enabled=True,
            senior_max_ltc_pct=Decimal("70.00"),
            senior_max_lvr_pct=Decimal("65.00"),
            senior_interest_rate_pct=Decimal("8.50"),
            senior_line_fee_pct=Decimal("1.50"),
            senior_establishment_fee_pct=Decimal("1.00"),
            net_profit_before_finance=net_profit
        )
    else:
        funding_calc = calculate_funding_capital_stack(
            total_project_cost=total_project_cost,
            gross_realisation_value=grv,
            senior_debt_enabled=funding.senior_debt_enabled,
            senior_max_ltc_pct=funding.senior_max_ltc_pct,
            senior_max_lvr_pct=funding.senior_max_lvr_pct,
            senior_interest_rate_pct=funding.senior_interest_rate_pct,
            senior_line_fee_pct=funding.senior_line_fee_pct,
            senior_establishment_fee_pct=funding.senior_establishment_fee_pct,
            mezzanine_enabled=funding.mezzanine_enabled,
            mezzanine_amount=funding.mezzanine_amount,
            mezzanine_interest_rate_pct=funding.mezzanine_interest_rate_pct,
            net_profit_before_finance=net_profit
        )

    # 5. Cash Flow & Duration
    cf_res = generate_cash_flow_schedule(
        land_purchase_price=float(land_price),
        land_acquisition_costs=float(land_costs_amt),
        cost_items=cost_dicts,
        sales_items=sales_dicts
    )

    return ScenarioMetrics(
        scenario_id=scenario.id,
        name=scenario.name,
        is_baseline=scenario.is_baseline,
        status=scenario.status,
        total_units=rev_calc["total_units"],
        total_internal_area=rev_calc["total_internal_area"],
        gross_realisation_value=grv,
        net_realisation_value=nrv,
        land_acquisition_total=land_total,
        construction_subtotal=cost_calc["construction_subtotal"],
        total_development_cost_ex_land=cost_calc["total_development_cost_ex_land"],
        total_project_cost=total_project_cost,
        net_profit=net_profit,
        margin_on_cost_pct=margin_on_cost,
        margin_on_grv_pct=margin_on_grv,
        project_irr=cf_res["project_irr"],
        peak_debt=cf_res["peak_debt"],
        required_developer_equity=funding_calc["required_developer_equity"],
        return_on_equity_pct=funding_calc["return_on_equity_pct"],
        duration_months=cf_res["project_duration_months"],
    )

@router.post("/projects/{project_id}/scenarios", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def create_scenario_for_project(
    project_id: str,
    scenario_in: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if scenario_in.is_baseline:
        db.query(Scenario).filter(Scenario.project_id == project_id).update({"is_baseline": False})

    scenario = Scenario(
        project_id=project.id,
        name=scenario_in.name.strip(),
        description=scenario_in.description,
        is_baseline=scenario_in.is_baseline,
        status=scenario_in.status
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

@router.get("/projects/{project_id}/scenarios", response_model=List[ScenarioRead])
def list_scenarios_for_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.asc()).all()

@router.get("/projects/{project_id}/scenarios/comparison", response_model=ScenarioComparisonResponse)
def get_scenario_comparison(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.asc()).all()
    baseline = next((s for s in scenarios if s.is_baseline), scenarios[0] if scenarios else None)

    metrics_list = [compute_single_scenario_metrics(s, db) for s in scenarios]

    return ScenarioComparisonResponse(
        project_id=project.id,
        project_name=project.name,
        baseline_scenario_id=baseline.id if baseline else None,
        scenarios=metrics_list
    )

@router.get("/scenarios/compare", response_model=ScenarioComparisonResponse)
def compare_scenarios_query(
    ids: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if not id_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No IDs provided for comparison")

    # Check if first ID is a project ID
    first_id = id_list[0]
    project = db.query(Project).filter(
        Project.id == first_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if project and len(id_list) == 1:
        scenarios = db.query(Scenario).filter(Scenario.project_id == project.id).order_by(Scenario.created_at.asc()).all()
        baseline = next((s for s in scenarios if s.is_baseline), scenarios[0] if scenarios else None)
        metrics_list = [compute_single_scenario_metrics(s, db) for s in scenarios]
        return ScenarioComparisonResponse(
            project_id=project.id,
            project_name=project.name,
            baseline_scenario_id=baseline.id if baseline else None,
            scenarios=metrics_list
        )

    # Otherwise query by scenario IDs
    scenarios = db.query(Scenario).join(Project).filter(
        Scenario.id.in_(id_list),
        Project.organization_id == current_user.organization_id
    ).order_by(Scenario.created_at.asc()).all()

    if not scenarios:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching scenarios found")

    proj = db.query(Project).filter(Project.id == scenarios[0].project_id).first()
    baseline = next((s for s in scenarios if s.is_baseline), scenarios[0])
    metrics_list = [compute_single_scenario_metrics(s, db) for s in scenarios]

    return ScenarioComparisonResponse(
        project_id=proj.id if proj else scenarios[0].project_id,
        project_name=proj.name if proj else "Feasibility Model",
        baseline_scenario_id=baseline.id,
        scenarios=metrics_list
    )


@router.post("/projects/{project_id}/scenarios/{scenario_id}/clone", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def clone_scenario(
    project_id: str,
    scenario_id: str,
    payload: Optional[ScenarioCloneInput] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    source = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.project_id == project_id
    ).first()

    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source scenario not found")

    new_name = payload.name.strip() if (payload and payload.name) else f"Copy of {source.name}"
    new_desc = payload.description if (payload and payload.description) else f"Cloned branch from '{source.name}'"

    new_scenario = Scenario(
        project_id=project.id,
        name=new_name,
        description=new_desc,
        is_baseline=False,
        status="draft"
    )
    db.add(new_scenario)
    db.commit()
    db.refresh(new_scenario)

    # 1. Clone Land
    source_land = db.query(LandInput).filter(LandInput.scenario_id == source.id).first()
    if source_land:
        new_land = LandInput(
            scenario_id=new_scenario.id,
            purchase_price=source_land.purchase_price,
            deposit_amount=source_land.deposit_amount,
            contract_date=source_land.contract_date,
            deposit_due_date=source_land.deposit_due_date,
            settlement_date=source_land.settlement_date,
            site_area=source_land.site_area,
            site_area_unit=source_land.site_area_unit,
            current_zoning=source_land.current_zoning,
            existing_improvements=source_land.existing_improvements,
            planning_notes=source_land.planning_notes,
            development_potential_notes=source_land.development_potential_notes,
        )
        db.add(new_land)
        db.flush()

        for c in source_land.acquisition_costs:
            new_cost = AcquisitionCostItem(
                land_id=new_land.id,
                category=c.category,
                name=c.name,
                amount=c.amount,
                notes=c.notes,
                date=c.date
            )
            db.add(new_cost)

    # 2. Clone Costs
    source_costs = db.query(CostItem).filter(CostItem.scenario_id == source.id).all()
    for c in source_costs:
        new_c = CostItem(
            scenario_id=new_scenario.id,
            category=c.category,
            name=c.name,
            calculation_method=c.calculation_method,
            quantity=c.quantity,
            rate=c.rate,
            amount=c.amount,
            phasing_curve=c.phasing_curve,
            start_month=c.start_month,
            end_month=c.end_month,
            notes=c.notes,
        )
        db.add(new_c)

    # 3. Clone Sales
    source_sales = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == source.id).all()
    for s in source_sales:
        new_s = SalesProductItem(
            scenario_id=new_scenario.id,
            name=s.name,
            unit_type=s.unit_type,
            total_units=s.total_units,
            avg_internal_area=s.avg_internal_area,
            avg_external_area=s.avg_external_area,
            price_per_sqm=s.price_per_sqm,
            unit_sale_price=s.unit_sale_price,
            total_revenue=s.total_revenue,
            sales_commission_pct=s.sales_commission_pct,
            marketing_cost_pct=s.marketing_cost_pct,
            gst_applicable=s.gst_applicable,
            sales_start_month=s.sales_start_month,
            sales_end_month=s.sales_end_month,
            settlement_month=s.settlement_month,
            notes=s.notes,
        )
        db.add(new_s)

    # 4. Clone Funding
    source_funding = db.query(FundingAssumption).filter(FundingAssumption.scenario_id == source.id).first()
    if source_funding:
        new_f = FundingAssumption(
            scenario_id=new_scenario.id,
            senior_debt_enabled=source_funding.senior_debt_enabled,
            senior_max_ltc_pct=source_funding.senior_max_ltc_pct,
            senior_max_lvr_pct=source_funding.senior_max_lvr_pct,
            senior_interest_rate_pct=source_funding.senior_interest_rate_pct,
            senior_line_fee_pct=source_funding.senior_line_fee_pct,
            senior_establishment_fee_pct=source_funding.senior_establishment_fee_pct,
            mezzanine_enabled=source_funding.mezzanine_enabled,
            mezzanine_amount=source_funding.mezzanine_amount,
            mezzanine_interest_rate_pct=source_funding.mezzanine_interest_rate_pct,
            target_equity_contribution=source_funding.target_equity_contribution,
        )
        db.add(new_f)

    # 5. Clone Schedule
    source_sched = db.query(ScheduleMilestone).filter(ScheduleMilestone.scenario_id == source.id).all()
    for m in source_sched:
        new_m = ScheduleMilestone(
            scenario_id=new_scenario.id,
            stage=m.stage,
            name=m.name,
            start_month=m.start_month,
            duration_months=m.duration_months,
            end_month=m.end_month,
            status=m.status,
            notes=m.notes,
        )
        db.add(new_m)

    db.commit()
    db.refresh(new_scenario)
    return new_scenario

@router.get("/scenarios/{scenario_id}", response_model=ScenarioRead)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scenario = db.query(Scenario).join(Project).filter(
        Scenario.id == scenario_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    return scenario

@router.patch("/scenarios/{scenario_id}", response_model=ScenarioRead)
def update_scenario(
    scenario_id: str,
    scenario_update: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scenario = db.query(Scenario).join(Project).filter(
        Scenario.id == scenario_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    update_data = scenario_update.model_dump(exclude_unset=True)

    if update_data.get("is_baseline"):
        db.query(Scenario).filter(
            Scenario.project_id == scenario.project_id,
            Scenario.id != scenario.id
        ).update({"is_baseline": False})

    for key, value in update_data.items():
        setattr(scenario, key, value)

    db.commit()
    db.refresh(scenario)
    return scenario

@router.delete("/scenarios/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scenario = db.query(Scenario).join(Project).filter(
        Scenario.id == scenario_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    total_scenarios = db.query(Scenario).filter(Scenario.project_id == scenario.project_id).count()
    if total_scenarios <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the only remaining scenario in a project.")

    db.delete(scenario)
    db.commit()
    return None
