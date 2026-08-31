from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.cost import CostItem
from backend.app.models.land import LandInput
from backend.app.schemas.cost import (
    CostItemCreate,
    CostItemUpdate,
    CostItemRead,
    CostCalculationSummary,
    CostSummaryResponse,
    BatchCostUpdateInput,
)
from backend.app.calculations.costs import calculate_development_costs, calculate_land_acquisition_totals

router = APIRouter(tags=["Development Costs"])

DEFAULT_COST_TEMPLATES = [
    {"category": "construction", "name": "Main Building Construction Works", "calculation_method": "fixed_amount", "amount": Decimal("6500000.00"), "phasing_curve": "s_curve", "start_month": 4, "end_month": 16, "notes": "Head contract turnkey build"},
    {"category": "construction", "name": "Civil Works, Infrastructure & Demolition", "calculation_method": "fixed_amount", "amount": Decimal("450000.00"), "phasing_curve": "linear", "start_month": 2, "end_month": 4, "notes": "Site prep, earthworks and services"},
    {"category": "consultants", "name": "Architectural & Detailed Design Fees", "calculation_method": "fixed_amount", "amount": Decimal("320000.00"), "phasing_curve": "linear", "start_month": 1, "end_month": 12, "notes": "Concept, DA & CC documentation"},
    {"category": "consultants", "name": "Engineering (Structural/Civil/Services)", "calculation_method": "fixed_amount", "amount": Decimal("180000.00"), "phasing_curve": "linear", "start_month": 2, "end_month": 14, "notes": "Engineering design and certification"},
    {"category": "statutory", "name": "Council Section 7.11 / Development Levies", "calculation_method": "fixed_amount", "amount": Decimal("240000.00"), "phasing_curve": "upfront", "start_month": 2, "end_month": 2, "notes": "Local government development contribution"},
    {"category": "contingency", "name": "Construction & Design Contingency (5%)", "calculation_method": "fixed_amount", "amount": Decimal("350000.00"), "phasing_curve": "s_curve", "start_month": 4, "end_month": 16, "notes": "5% buffer on contract works"},
    {"category": "holding", "name": "Rates, Land Taxes & Insurances", "calculation_method": "fixed_amount", "amount": Decimal("85000.00"), "phasing_curve": "linear", "start_month": 1, "end_month": 18, "notes": "Project duration holding costs"},
]

def verify_scenario_access(project_id: str, scenario_id: str, db: Session, user: User) -> Scenario:
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

    return scenario

def get_land_total(scenario_id: str, db: Session) -> Decimal:
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    if not land:
        return Decimal("0.00")
    cost_amounts = [item.amount for item in land.acquisition_costs]
    totals = calculate_land_acquisition_totals(land.purchase_price, land.deposit_amount, cost_amounts)
    return totals["total_land_acquisition"]

@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/costs",
    response_model=CostSummaryResponse,
    summary="Get scenario development costs and calculations"
)
def get_costs(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = verify_scenario_access(project_id, scenario_id, db, current_user)
    
    items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).order_by(CostItem.created_at).all()
    
    # Auto seed initial template if empty
    if not items:
        for t in DEFAULT_COST_TEMPLATES:
            item = CostItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).order_by(CostItem.created_at).all()

    land_total = get_land_total(scenario_id, db)
    items_dicts = [
        {
            "category": i.category,
            "calculation_method": i.calculation_method,
            "quantity": i.quantity,
            "rate": i.rate,
            "amount": i.amount,
            "gst_applicable": i.gst_applicable,
        }
        for i in items
    ]
    calc = calculate_development_costs(items_dicts, land_acquisition_total=land_total)

    summary = CostCalculationSummary(
        construction_subtotal=calc["construction_subtotal"],
        consultants_subtotal=calc["consultants_subtotal"],
        statutory_subtotal=calc["statutory_subtotal"],
        contingency_subtotal=calc["contingency_subtotal"],
        holding_subtotal=calc["holding_subtotal"],
        other_subtotal=calc["other_subtotal"],
        total_input_tax_credits=calc["total_input_tax_credits"],
        total_development_cost_ex_land=calc["total_development_cost_ex_land"],
        land_acquisition_total=calc["land_acquisition_total"],
        total_project_cost=calc["total_project_cost"],
    )

    return CostSummaryResponse(summary=summary, items=items)

@router.put(
    "/projects/{project_id}/scenarios/{scenario_id}/costs",
    response_model=CostSummaryResponse,
    summary="Batch update/replace scenario development costs"
)
def update_costs_batch(
    project_id: str,
    scenario_id: str,
    payload: BatchCostUpdateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    # Delete existing items and insert new
    db.query(CostItem).filter(CostItem.scenario_id == scenario_id).delete()

    for item_in in payload.items:
        new_item = CostItem(
            scenario_id=scenario_id,
            category=item_in.category,
            name=item_in.name,
            calculation_method=item_in.calculation_method,
            quantity=item_in.quantity,
            rate=item_in.rate,
            amount=item_in.amount,
            gst_applicable=item_in.gst_applicable,
            phasing_curve=item_in.phasing_curve,
            start_month=item_in.start_month,
            end_month=item_in.end_month,
            notes=item_in.notes,
        )
        db.add(new_item)

    db.commit()

    return get_costs(project_id, scenario_id, db, current_user)
