from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.models.funding import FundingAssumption
from backend.app.models.schedule import ScheduleMilestone
from backend.app.calculations.engine import FeasibilityCoreEngine
from backend.app.calculations.sensitivity import (
    generate_2d_sensitivity_matrix,
    calculate_interest_rate_sensitivity,
    calculate_timeline_delay_stress_test,
    calculate_breakeven_thresholds,
    calculate_tornado_elasticity_ranking,
)
from backend.app.calculations.valuation import calculate_residual_land_value
from backend.app.schemas.sensitivity import (
    SensitivityDashboardResponse,
    SensitivitySimulateInput,
    SensitivitySimulateResponse,
    BaselineKPIs,
    Sensitivity2DMatrix,
)
from backend.app.api.v1.costs import DEFAULT_COST_TEMPLATES
from backend.app.api.v1.sales import DEFAULT_SALES_TEMPLATES

router = APIRouter(tags=["Sensitivity Analysis & Stress Testing"])

def verify_scenario_access(project_id: str, scenario_id: str, db: Session, user: User) -> tuple[Project, Scenario]:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == user.organization_id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.project_id == project_id
    ).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    return project, scenario

def get_base_scenario_feasibility(scenario: Scenario, db: Session) -> Dict[str, Any]:
    # 1. Land
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario.id).first()
    purchase_price = land.purchase_price if land else Decimal("0.00")
    deposit = land.deposit_amount if land else Decimal("0.00")
    acq_amounts = [c.amount for c in land.acquisition_costs] if (land and land.acquisition_costs) else []

    # 2. Costs
    cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario.id).all()
    if not cost_items:
        for t in DEFAULT_COST_TEMPLATES:
            item = CostItem(scenario_id=scenario.id, **t)
            db.add(item)
        db.commit()
        cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario.id).all()

    cost_dicts = [
        {
            "id": c.id,
            "category": c.category,
            "name": c.name,
            "amount": c.amount,
            "phasing_curve": c.phasing_curve,
            "start_month": c.start_month,
            "end_month": c.end_month,
            "calculation_method": c.calculation_method,
            "quantity": c.quantity,
            "rate": c.rate,
        }
        for c in cost_items
    ]

    # 3. Sales
    sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario.id).all()
    if not sales_items:
        for t in DEFAULT_SALES_TEMPLATES:
            item = SalesProductItem(scenario_id=scenario.id, **t)
            db.add(item)
        db.commit()
        sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario.id).all()

    sales_dicts = [
        {
            "id": s.id,
            "name": s.name,
            "total_units": s.total_units,
            "avg_internal_area": s.avg_internal_area,
            "avg_external_area": s.avg_external_area,
            "price_per_sqm": s.price_per_sqm,
            "unit_sale_price": s.unit_sale_price,
            "total_revenue": s.total_revenue,
            "sales_commission_pct": s.sales_commission_pct,
            "marketing_cost_pct": s.marketing_cost_pct,
            "sales_start_month": s.sales_start_month,
            "sales_end_month": s.sales_end_month,
            "settlement_month": s.settlement_month,
        }
        for s in sales_items
    ]

    # 4. Funding
    funding = db.query(FundingAssumption).filter(FundingAssumption.scenario_id == scenario.id).first()
    senior_enabled = funding.senior_debt_enabled if funding else True
    senior_ltc = funding.senior_max_ltc_pct if funding else Decimal("70.00")
    senior_lvr = funding.senior_max_lvr_pct if funding else Decimal("65.00")
    senior_rate = funding.senior_interest_rate_pct if funding else Decimal("8.50")
    senior_line = funding.senior_line_fee_pct if funding else Decimal("1.50")
    senior_est = funding.senior_establishment_fee_pct if funding else Decimal("1.00")
    mezz_enabled = funding.mezzanine_enabled if funding else False
    mezz_amt = funding.mezzanine_amount if funding else Decimal("0.00")
    mezz_rate = funding.mezzanine_interest_rate_pct if funding else Decimal("15.00")

    # 5. Milestones & Duration
    milestones = db.query(ScheduleMilestone).filter(ScheduleMilestone.scenario_id == scenario.id).all()
    duration = max([m.end_month for m in milestones], default=18) if milestones else 18

    # 6. Total GFA & Construction cost breakdown
    total_gfa = sum((s.total_units or 0) * (s.avg_internal_area or 0.0) for s in sales_items)
    total_units = sum((s.total_units or 0) for s in sales_items)
    construction_cost = sum(
        (c.amount for c in cost_items if c.category == "construction"),
        Decimal("0.00")
    )

    # Master calculation
    engine_output = FeasibilityCoreEngine.run_full_feasibility(
        land_purchase_price=purchase_price,
        land_deposit_amount=deposit,
        land_acquisition_costs=acq_amounts if acq_amounts else None,
        state=land.state if land else "QLD",
        is_foreign_purchaser=land.is_foreign_purchaser if land else False,
        cost_items=cost_dicts,
        sales_items=sales_dicts,
        senior_debt_enabled=senior_enabled,
        senior_max_ltc_pct=senior_ltc,
        senior_max_lvr_pct=senior_lvr,
        senior_interest_rate_pct=senior_rate,
        senior_line_fee_pct=senior_line,
        senior_establishment_fee_pct=senior_est,
        mezzanine_enabled=mezz_enabled,
        mezzanine_amount=mezz_amt,
        mezzanine_interest_rate_pct=mezz_rate,
        project_duration_months=duration,
        discount_rate_pct=10.0,
        target_margin_for_rlv_pct=Decimal("20.00"),
    )

    return {
        "engine_output": engine_output,
        "purchase_price": purchase_price,
        "deposit": deposit,
        "acq_amounts": acq_amounts,
        "cost_dicts": cost_dicts,
        "sales_dicts": sales_dicts,
        "duration": duration,
        "total_gfa": total_gfa,
        "total_units": total_units,
        "construction_cost": construction_cost,
        "senior_rate": senior_rate,
    }


@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/sensitivity",
    response_model=SensitivityDashboardResponse,
    summary="Get full sensitivity analysis, 2D matrix, interest rate shocks, delay stress test, breakeven, and tornado ranking"
)
def get_sensitivity_analysis(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, scenario = verify_scenario_access(project_id, scenario_id, db, current_user)
    base_data = get_base_scenario_feasibility(scenario, db)
    out = base_data["engine_output"]
    metrics = out["metrics"]
    funding = out["funding"]
    land = out["land"]

    grv = metrics["gross_realisation_value"]
    nrv = metrics["net_realisation_value"]
    total_cost = metrics["total_project_cost"]
    tdc_ex_land = metrics["total_development_cost_ex_land"]
    land_total = land["total_land_acquisition"]
    finance_cost = funding["total_estimated_finance_cost"]
    debt_facility = funding["total_debt_facility"]
    equity = funding["required_developer_equity"]
    irr = metrics["project_irr_pct"]
    duration = base_data["duration"]
    gfa = base_data["total_gfa"]
    units = base_data["total_units"]
    construction_cost = base_data["construction_cost"]
    rate = base_data["senior_rate"]

    # 1. 2D Sensitivity Matrix
    matrix_2d_raw = generate_2d_sensitivity_matrix(
        base_grv=grv,
        base_nrv=nrv,
        base_total_project_cost=total_cost,
        base_tdc_ex_land=tdc_ex_land,
        base_land_acquisition=land_total,
        base_finance_cost=finance_cost,
        base_irr_pct=irr,
        target_margin_pct=Decimal("20.00"),
    )

    # 2. Interest Rate Sensitivity
    rate_matrix_raw = calculate_interest_rate_sensitivity(
        base_cost=total_cost,
        base_grv=grv,
        base_nrv=nrv,
        base_debt_facility=debt_facility,
        base_interest_rate_pct=rate,
        base_finance_cost=finance_cost,
        base_equity=equity,
        project_duration_months=duration,
    )

    # 3. Timeline Delay Stress Test
    delay_test_raw = calculate_timeline_delay_stress_test(
        base_duration_months=duration,
        base_cost=total_cost,
        base_nrv=nrv,
        base_debt=debt_facility,
        base_finance_cost=finance_cost,
        base_irr_pct=irr,
    )

    # 4. Breakeven Thresholds
    breakeven_raw = calculate_breakeven_thresholds(
        base_grv=grv,
        base_nrv=nrv,
        base_total_project_cost=total_cost,
        base_land_cost=land_total,
        total_gfa_sqm=gfa,
        total_units=units,
    )

    # 5. Tornado Elasticity Ranking
    tornado_raw = calculate_tornado_elasticity_ranking(
        base_grv=grv,
        base_nrv=nrv,
        base_total_project_cost=total_cost,
        base_construction_cost=construction_cost,
        base_land_cost=land_total,
        base_finance_cost=finance_cost,
        base_duration_months=duration,
    )

    baseline_kpis = BaselineKPIs(
        gross_realisation_value=grv,
        net_realisation_value=nrv,
        total_project_cost=total_cost,
        land_cost=land_total,
        construction_cost=construction_cost,
        finance_cost=finance_cost,
        net_profit=metrics["net_profit"],
        dev_margin_on_cost_pct=metrics["margin_on_cost_pct"],
        project_irr_pct=irr,
        equity_amount=equity,
        interest_rate_pct=rate,
        duration_months=duration,
    )

    return SensitivityDashboardResponse(
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        is_baseline=scenario.is_baseline,
        baseline_kpis=baseline_kpis,
        matrix_2d=matrix_2d_raw,
        interest_rate_matrix=rate_matrix_raw,
        delay_stress_test=delay_test_raw,
        breakeven=breakeven_raw,
        tornado_ranking=tornado_raw,
    )


@router.post(
    "/projects/{project_id}/scenarios/{scenario_id}/sensitivity/simulate",
    response_model=SensitivitySimulateResponse,
    summary="Simulate on-the-fly feasibility under custom price, cost, rate, and delay shifts"
)
def simulate_feasibility_scenario(
    project_id: str,
    scenario_id: str,
    payload: SensitivitySimulateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, scenario = verify_scenario_access(project_id, scenario_id, db, current_user)
    base_data = get_base_scenario_feasibility(scenario, db)
    out = base_data["engine_output"]
    metrics = out["metrics"]
    funding = out["funding"]
    land = out["land"]

    base_grv = metrics["gross_realisation_value"]
    base_nrv = metrics["net_realisation_value"]
    base_cost = metrics["total_project_cost"]
    base_tdc_ex_land = metrics["total_development_cost_ex_land"]
    base_finance = funding["total_estimated_finance_cost"]
    base_equity = funding["required_developer_equity"]
    base_rate = base_data["senior_rate"]
    base_duration = base_data["duration"]
    base_irr = metrics["project_irr_pct"]

    # 1. Apply Price Shift
    price_mult = Decimal(str(1.0 + (payload.price_shift_pct / 100.0)))
    sim_grv = (base_grv * price_mult).quantize(Decimal("0.01"))
    sim_nrv = (base_nrv * price_mult).quantize(Decimal("0.01"))

    # 2. Apply Cost Shift
    cost_mult = Decimal(str(1.0 + (payload.cost_shift_pct / 100.0)))
    sim_base_cost = (base_cost * cost_mult).quantize(Decimal("0.01"))
    sim_tdc_ex_land = (base_tdc_ex_land * cost_mult).quantize(Decimal("0.01"))

    # 3. Apply Interest Rate Shift & Delay extra interest
    sim_rate = max(Decimal("1.00"), base_rate + Decimal(str(payload.interest_rate_delta_pct)))
    rate_ratio = (sim_rate / base_rate) if base_rate > 0 else Decimal("1.0")
    
    extra_delay_months = payload.delay_months
    delay_interest_mult = Decimal("1.0") + (Decimal(str(extra_delay_months)) * Decimal("0.045"))
    sim_finance = (base_finance * rate_ratio * delay_interest_mult).quantize(Decimal("0.01"))
    extra_holding = Decimal("25000") * Decimal(str(extra_delay_months))

    sim_total_cost = sim_base_cost + (sim_finance - base_finance) + extra_holding
    sim_net_profit = sim_nrv - sim_total_cost

    sim_margin = (
        (sim_net_profit / sim_total_cost * Decimal("100.0")).quantize(Decimal("0.01"))
        if sim_total_cost > 0
        else Decimal("0.00")
    )

    sim_roe = (
        (sim_net_profit / base_equity * Decimal("100.0")).quantize(Decimal("0.01"))
        if base_equity > 0
        else Decimal("0.00")
    )

    # Simulated IRR with time degradation & profit scale
    total_months = base_duration + extra_delay_months
    irr_factor = (base_duration / total_months) ** 1.35 if total_months > 0 else 1.0
    profit_scale = float(sim_net_profit / (base_nrv - base_cost)) if (base_nrv - base_cost) != 0 else 1.0
    sim_irr = round(max(-50.0, min(150.0, base_irr * irr_factor * (0.3 + 0.7 * max(-0.5, profit_scale)))), 1)

    # Residual Land Value
    rlv_res = calculate_residual_land_value(
        net_realisation_value=sim_nrv,
        total_development_cost_ex_land=sim_tdc_ex_land,
        target_margin_on_cost_pct=Decimal("20.00"),
        gross_realisation_value=sim_grv,
    )
    sim_rlv = rlv_res["residual_land_value_cost_target"]

    # Status
    if sim_margin >= Decimal("20.0"):
        status_flag = "optimal"
    elif sim_margin >= Decimal("15.0"):
        status_flag = "acceptable"
    elif sim_margin >= Decimal("0.0"):
        status_flag = "marginal"
    else:
        status_flag = "deficit"

    return SensitivitySimulateResponse(
        price_shift_pct=payload.price_shift_pct,
        cost_shift_pct=payload.cost_shift_pct,
        interest_rate_delta_pct=payload.interest_rate_delta_pct,
        delay_months=payload.delay_months,
        simulated_grv=sim_grv,
        simulated_nrv=sim_nrv,
        simulated_total_cost=sim_total_cost,
        simulated_finance_cost=sim_finance,
        simulated_net_profit=sim_net_profit,
        simulated_margin_on_cost_pct=sim_margin,
        simulated_project_irr_pct=sim_irr,
        simulated_return_on_equity_pct=sim_roe,
        simulated_residual_land_value=sim_rlv,
        status=status_flag,
    )
