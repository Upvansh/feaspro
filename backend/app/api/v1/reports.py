import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.models.funding import FundingAssumption, FundingTranche
from backend.app.models.schedule import ScheduleMilestone
from backend.app.calculations.engine import FeasibilityCoreEngine
from backend.app.calculations.costs import calculate_land_acquisition_totals, calculate_development_costs
from backend.app.calculations.revenue import calculate_gross_revenue
from backend.app.schemas.report import (
    ExecutiveReportResponse,
    ProjectMetaSummary,
    FinancialSummaryScorecard,
    CapitalStackSummary,
    CostCategoryBreakdownItem,
    SalesProductMixItem,
    CashFlowSummaryRow,
    MilestoneSummaryItem,
)
from backend.app.api.v1.costs import DEFAULT_COST_TEMPLATES
from backend.app.api.v1.sales import DEFAULT_SALES_TEMPLATES

router = APIRouter(tags=["Reporting & Export Engine"])

CATEGORY_DISPLAY_NAMES = {
    "land": "Land Acquisition & Settlement",
    "professional_fees": "Professional & Consultant Fees",
    "statutory": "Statutory Fees & Authority Charges",
    "construction": "Direct Construction & Headworks",
    "contingency": "Contingency Reserves",
    "marketing": "Marketing & Selling Expenses",
    "finance": "Financing & Holding Charges",
    "other": "Other Development Expenses",
}

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

def compile_executive_report_data(
    project: Project,
    scenario: Scenario,
    db: Session,
    user: User,
) -> ExecutiveReportResponse:
    org = db.query(Organization).filter(Organization.id == project.organization_id).first()
    org_name = org.name if org else "FeasPro Real Estate Group"
    org_slug = org.slug if org else "feaspro"

    # 1. Land & Acquisition
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario.id).first()
    purchase_price = land.purchase_price if land else Decimal("0.00")
    deposit = land.deposit_amount if land else Decimal("0.00")
    acq_cost_items = land.acquisition_costs if (land and land.acquisition_costs) else []
    acq_amounts = [c.amount for c in acq_cost_items]

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

    # 3. Sales Products
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

    # 5. Schedule Milestones
    milestones = db.query(ScheduleMilestone).filter(ScheduleMilestone.scenario_id == scenario.id).order_by(ScheduleMilestone.start_month).all()
    duration = max([m.end_month for m in milestones], default=18) if milestones else 18

    # 6. Execute Master Calculation Engine
    engine_output = FeasibilityCoreEngine.run_full_feasibility(
        land_purchase_price=purchase_price,
        land_deposit_amount=deposit,
        land_acquisition_costs=acq_amounts if acq_amounts else None,
        state=getattr(land, 'state', 'QLD') if land else "QLD",
        is_foreign_purchaser=getattr(land, 'is_foreign_purchaser', False) if land else False,
        cost_items=cost_dicts,
        sales_items=sales_dicts,
        use_gst_margin_scheme=True,
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

    metrics = engine_output["metrics"]
    funding_res = engine_output["funding"]
    cashflow_res = engine_output["cashflow"]
    valuation_rlv = engine_output["valuation_rlv"]

    # Equity multiple calculation: Total Returns / Required Equity
    req_equity = funding_res["required_developer_equity"]
    net_profit = metrics["net_profit"]
    if req_equity > 0:
        equity_multiple = ((req_equity + net_profit) / req_equity).quantize(Decimal("0.01"))
    else:
        equity_multiple = Decimal("1.00")

    # Group Costs by Category
    tdc = metrics["total_project_cost"]
    cost_by_category: Dict[str, List[Dict[str, Any]]] = {}
    
    # Add Land as a category item
    land_total = engine_output["land"]["total_land_acquisition"]
    cost_by_category["land"] = [
        {"name": "Contract Purchase Price", "amount": purchase_price},
    ]
    for acq in acq_cost_items:
        cost_by_category["land"].append({"name": f"Acq: {acq.name}", "amount": acq.amount})

    for c in cost_items:
        cat = c.category or "other"
        if cat not in cost_by_category:
            cost_by_category[cat] = []
        cost_by_category[cat].append({
            "name": c.name,
            "amount": c.amount,
            "calculation_method": c.calculation_method,
            "quantity": float(c.quantity) if c.quantity is not None else None,
            "rate": float(c.rate) if c.rate is not None else None,
        })

    cost_breakdown: List[CostCategoryBreakdownItem] = []
    for cat_key, items in cost_by_category.items():
        cat_sum = sum((Decimal(str(item["amount"])) for item in items), Decimal("0.00"))
        pct_of_tdc = ((cat_sum / tdc) * Decimal("100.00")).quantize(Decimal("0.1")) if tdc > 0 else Decimal("0.0")
        cost_breakdown.append(
            CostCategoryBreakdownItem(
                category=cat_key,
                display_name=CATEGORY_DISPLAY_NAMES.get(cat_key, cat_key.replace("_", " ").title()),
                total_amount=cat_sum,
                percentage_of_tdc=pct_of_tdc,
                item_count=len(items),
                items=items,
            )
        )

    # Format Sales Mix Items
    grv = metrics["gross_realisation_value"]
    sales_mix_items: List[SalesProductMixItem] = []
    total_units_sum = 0
    total_gfa_sum = 0.0

    for s in sales_items:
        units = s.total_units or 0
        total_units_sum += units
        area = units * (s.avg_internal_area or 0.0)
        total_gfa_sum += area
        rev_pct = ((s.total_revenue / grv) * Decimal("100.00")).quantize(Decimal("0.1")) if grv > 0 else Decimal("0.0")
        sales_mix_items.append(
            SalesProductMixItem(
                id=s.id,
                name=s.name,
                total_units=units,
                avg_internal_area=s.avg_internal_area or 0.0,
                avg_external_area=s.avg_external_area or 0.0,
                total_area_sqm=round(area, 1),
                price_per_sqm=s.price_per_sqm or Decimal("0.00"),
                unit_sale_price=s.unit_sale_price or Decimal("0.00"),
                total_revenue=s.total_revenue or Decimal("0.00"),
                percentage_of_revenue=rev_pct,
                sales_commission_pct=s.sales_commission_pct or Decimal("0.00"),
                marketing_cost_pct=s.marketing_cost_pct or Decimal("0.00"),
                settlement_month=s.settlement_month or duration,
            )
        )

    avg_price_per_sqm = (grv / Decimal(str(total_gfa_sum))).quantize(Decimal("0.01")) if total_gfa_sum > 0 else Decimal("0.00")

    # Format Cash Flow Rows
    cashflow_rows: List[CashFlowSummaryRow] = []
    monthly_data = cashflow_res.get("monthly_data", [])
    for m in monthly_data:
        cashflow_rows.append(
            CashFlowSummaryRow(
                month=m.get("month", 0),
                label=f"Month {m.get('month', 0)}",
                land_costs=Decimal(str(round(m.get("land_costs", 0.0), 2))),
                construction_costs=Decimal(str(round(m.get("construction_costs", 0.0), 2))),
                professional_fees=Decimal(str(round(m.get("professional_fees", 0.0), 2))),
                statutory_costs=Decimal(str(round(m.get("statutory_costs", 0.0), 2))),
                finance_costs=Decimal(str(round(m.get("finance_costs", 0.0), 2))),
                other_costs=Decimal(str(round(m.get("other_costs", 0.0), 2))),
                total_outflow=Decimal(str(round(m.get("total_outflow", 0.0), 2))),
                sales_inflow=Decimal(str(round(m.get("sales_inflow", 0.0), 2))),
                net_cashflow=Decimal(str(round(m.get("net_cashflow", 0.0), 2))),
                cumulative_net_cashflow=Decimal(str(round(m.get("cumulative_net_cashflow", 0.0), 2))),
                debt_drawdown=Decimal(str(round(m.get("debt_drawdown", 0.0), 2))),
                debt_repayment=Decimal(str(round(m.get("debt_repayment", 0.0), 2))),
                closing_debt_balance=Decimal(str(round(m.get("closing_debt_balance", 0.0), 2))),
            )
        )

    # Format Milestones
    milestone_items: List[MilestoneSummaryItem] = []
    for m in milestones:
        milestone_items.append(
            MilestoneSummaryItem(
                id=m.id,
                name=m.name,
                phase=m.phase,
                start_month=m.start_month,
                end_month=m.end_month,
                duration_months=m.duration_months,
                status=m.status,
            )
        )

    # Executive Notes
    notes: List[str] = [
        f"Target Development Margin on Cost achieves {metrics['margin_on_cost_pct']}% against standard commercial hurdle thresholds (15.0% - 20.0%).",
        f"Capital Stack incorporates {funding_res['actual_loan_to_cost_pct']}% Loan-to-Cost (LTC) and {funding_res['actual_loan_to_value_pct']}% Loan-to-Value (LVR) gearing.",
        f"Projected Internal Rate of Return (IRR) is {metrics['project_irr_pct']}% p.a. with an Equity Multiple of {equity_multiple}x over a {duration}-month development cycle.",
        f"GST Margin Scheme applied: Total estimated GST liability of ${engine_output['gst']['gst_payable']:,.2f}.",
        f"Residual Land Value (RLV) calculated at ${valuation_rlv['residual_land_value_cost_target']:,.2f} at a 20.0% developer target margin hurdle.",
    ]

    return ExecutiveReportResponse(
        project_meta=ProjectMetaSummary(
            project_id=project.id,
            project_name=project.name,
            organization_name=org_name,
            organization_slug=org_slug,
            location=project.location,
            development_type=project.development_type,
            status=project.status,
            start_date=str(project.start_date) if project.start_date else None,
            target_completion_date=str(project.target_completion_date) if project.target_completion_date else None,
            scenario_id=scenario.id,
            scenario_name=scenario.name,
            is_baseline=scenario.is_baseline,
            report_generated_at=datetime.datetime.now(datetime.timezone.utc).strftime("%d %B %Y, %H:%M UTC"),
            generated_by_user=user.full_name or user.email,
        ),
        financial_kpis=FinancialSummaryScorecard(
            gross_realisation_value=metrics["gross_realisation_value"],
            net_realisation_value=metrics["net_realisation_value"],
            land_acquisition_cost=metrics["land_acquisition_total"],
            development_cost_ex_land=metrics["total_development_cost_ex_land"],
            total_project_cost=metrics["total_project_cost"],
            total_finance_cost=funding_res["total_estimated_finance_cost"],
            net_profit=metrics["net_profit"],
            dev_margin_on_cost_pct=metrics["margin_on_cost_pct"],
            margin_on_grv_pct=metrics["margin_on_grv_pct"],
            return_on_equity_pct=metrics["return_on_equity_pct"],
            equity_multiple=equity_multiple,
            project_irr_pct=metrics["project_irr_pct"],
            net_present_value=metrics["net_present_value"],
            discount_rate_pct=metrics["discount_rate_pct"],
            residual_land_value=valuation_rlv["residual_land_value_cost_target"],
            wacc_pct=engine_output["wacc_pct"],
        ),
        capital_stack=CapitalStackSummary(
            senior_debt_facility=funding_res["senior_debt_facility"],
            senior_max_ltc_pct=funding_res["senior_max_ltc_pct"],
            senior_max_lvr_pct=funding_res["senior_max_lvr_pct"],
            senior_interest_rate_pct=funding_res["senior_interest_rate_pct"],
            senior_capitalized_interest=funding_res["senior_capitalized_interest"],
            senior_fees=funding_res["senior_line_fee_amount"] + funding_res["senior_establishment_fee_amount"],
            mezzanine_enabled=funding_res["mezzanine_enabled"],
            mezzanine_facility=funding_res["mezzanine_facility"],
            mezzanine_interest_rate_pct=funding_res["mezzanine_interest_rate_pct"],
            mezzanine_capitalized_interest=funding_res["mezzanine_capitalized_interest"],
            required_equity=funding_res["required_developer_equity"],
            total_debt_facility=funding_res["total_debt_facility"],
            peak_debt_exposure=funding_res["peak_debt_exposure"],
            loan_to_cost_pct=funding_res["actual_loan_to_cost_pct"],
            loan_to_value_pct=funding_res["actual_loan_to_value_pct"],
            equity_ratio_pct=funding_res["actual_equity_ratio_pct"],
        ),
        cost_breakdown=cost_breakdown,
        sales_mix=sales_mix_items,
        total_units=total_units_sum,
        total_gfa_sqm=round(total_gfa_sum, 1),
        avg_price_per_sqm=avg_price_per_sqm,
        cashflow_summary=cashflow_rows,
        milestones=milestone_items,
        executive_summary_notes=notes,
        stamp_duty_details=engine_output["stamp_duty"],
        gst_details=engine_output["gst"],
        valuation_rlv=valuation_rlv,
    )


@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/report",
    response_model=ExecutiveReportResponse,
    summary="Get comprehensive bank-ready Executive Feasibility Summary Report"
)
def get_executive_report(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, scenario = verify_scenario_access(project_id, scenario_id, db, current_user)
    return compile_executive_report_data(project, scenario, db, current_user)


@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/report/html",
    response_class=HTMLResponse,
    summary="Get standalone print-ready HTML executive report document"
)
def get_executive_report_html(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, scenario = verify_scenario_access(project_id, scenario_id, db, current_user)
    report = compile_executive_report_data(project, scenario, db, current_user)

    cost_rows_html = "".join([
        f"""
        <tr>
            <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{item.display_name} ({item.item_count} items)</td>
            <td style="padding: 10px 14px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${item.total_amount:,.2f}</td>
            <td style="padding: 10px 14px; text-align: right; color: #64748b; border-bottom: 1px solid #e2e8f0;">{item.percentage_of_tdc}%</td>
        </tr>
        """ for item in report.cost_breakdown
    ])

    sales_rows_html = "".join([
        f"""
        <tr>
            <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{item.name}</td>
            <td style="padding: 10px 14px; text-align: center; border-bottom: 1px solid #e2e8f0;">{item.total_units}</td>
            <td style="padding: 10px 14px; text-align: right; border-bottom: 1px solid #e2e8f0;">{item.avg_internal_area} m²</td>
            <td style="padding: 10px 14px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${item.price_per_sqm:,.0f}</td>
            <td style="padding: 10px 14px; text-align: right; font-family: monospace; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${item.total_revenue:,.2f}</td>
        </tr>
        """ for item in report.sales_mix
    ])

    cf_rows_html = "".join([
        f"""
        <tr>
            <td style="padding: 8px 10px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{row.label}</td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #dc2626;">-${row.total_outflow:,.0f}</td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #16a34a;">${row.sales_inflow:,.0f}</td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${row.net_cashflow:,.0f}</td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${row.closing_debt_balance:,.0f}</td>
        </tr>
        """ for row in report.cashflow_summary[:18]
    ])

    notes_html = "".join([f"<li style='margin-bottom: 8px; color: #334155;'>{n}</li>" for n in report.executive_summary_notes])

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Executive Feasibility Summary - {report.project_meta.project_name}</title>
    <style>
        @page {{
            size: A4 portrait;
            margin: 15mm;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
        }}
        .badge {{
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            border-radius: 4px;
            text-transform: uppercase;
        }}
        .grid-2 {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }}
        .grid-4 {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }}
        .card {{
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            background: #f8fafc;
        }}
        .kpi-title {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 4px;
        }}
        .kpi-value {{
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            font-family: monospace;
        }}
        .kpi-sub {{
            font-size: 11px;
            color: #10b981;
            font-weight: 600;
            margin-top: 2px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
        }}
        th {{
            background: #f1f5f9;
            text-align: left;
            padding: 10px 14px;
            font-weight: 700;
            color: #334155;
            border-bottom: 2px solid #cbd5e1;
        }}
        .section-title {{
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
            margin: 24px 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        @media print {{
            body {{ padding: 0; }}
            .no-print {{ display: none; }}
            .page-break {{ page-break-before: always; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">
            🖨️ Print / Save PDF
        </button>
    </div>

    <div class="header">
        <div>
            <div class="badge">CONFIDENTIAL • BANK-READY FEASIBILITY SUMMARY</div>
            <h1 style="margin: 8px 0 4px 0; font-size: 24px; font-weight: 800;">{report.project_meta.project_name}</h1>
            <div style="color: #64748b; font-size: 13px;">{report.project_meta.location} • {report.project_meta.development_type.title()} • {report.project_meta.scenario_name}</div>
        </div>
        <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 15px; color: #0f172a;">{report.project_meta.organization_name}</div>
            <div style="color: #64748b; font-size: 11px;">Generated: {report.project_meta.report_generated_at}</div>
            <div style="color: #64748b; font-size: 11px;">Author: {report.project_meta.generated_by_user}</div>
        </div>
    </div>

    <!-- Executive Financial KPIs -->
    <div class="grid-4">
        <div class="card">
            <div class="kpi-title">Gross Realisation (GRV)</div>
            <div class="kpi-value">${report.financial_kpis.gross_realisation_value:,.2f}</div>
            <div class="kpi-sub">Net: ${report.financial_kpis.net_realisation_value:,.2f}</div>
        </div>
        <div class="card">
            <div class="kpi-title">Total Project Cost</div>
            <div class="kpi-value">${report.financial_kpis.total_project_cost:,.2f}</div>
            <div class="kpi-sub" style="color: #64748b;">Land: ${report.financial_kpis.land_acquisition_cost:,.2f}</div>
        </div>
        <div class="card">
            <div class="kpi-title">Development Profit</div>
            <div class="kpi-value" style="color: #16a34a;">${report.financial_kpis.net_profit:,.2f}</div>
            <div class="kpi-sub">Margin: {report.financial_kpis.dev_margin_on_cost_pct}% on Cost</div>
        </div>
        <div class="card">
            <div class="kpi-title">Project IRR / Equity Mult.</div>
            <div class="kpi-value" style="color: #2563eb;">{report.financial_kpis.project_irr_pct}%</div>
            <div class="kpi-sub">{report.financial_kpis.equity_multiple}x Multiple / {report.financial_kpis.return_on_equity_pct}% ROE</div>
        </div>
    </div>

    <!-- Key Executive Findings -->
    <div class="card" style="background: #eff6ff; border-color: #bfdbfe; margin-bottom: 20px;">
        <div style="font-weight: 700; color: #1e40af; margin-bottom: 8px;">EXECUTIVE SUMMARY & FINANCING HIGHLIGHTS</div>
        <ul style="margin: 0; padding-left: 20px;">
            {notes_html}
        </ul>
    </div>

    <!-- Capital Stack Summary -->
    <div class="section-title">1. Capital Stack & Financing Architecture</div>
    <div class="grid-4">
        <div class="card">
            <div class="kpi-title">Senior Debt Facility</div>
            <div class="kpi-value">${report.capital_stack.senior_debt_facility:,.2f}</div>
            <div class="kpi-sub" style="color: #64748b;">{report.capital_stack.senior_interest_rate_pct}% p.a. • Max {report.capital_stack.senior_max_ltc_pct}% LTC</div>
        </div>
        <div class="card">
            <div class="kpi-title">Required Developer Equity</div>
            <div class="kpi-value">${report.capital_stack.required_equity:,.2f}</div>
            <div class="kpi-sub" style="color: #64748b;">{report.capital_stack.equity_ratio_pct}% Equity Stake</div>
        </div>
        <div class="card">
            <div class="kpi-title">Peak Debt Exposure</div>
            <div class="kpi-value">${report.capital_stack.peak_debt_exposure:,.2f}</div>
            <div class="kpi-sub" style="color: #64748b;">Actual LTC: {report.capital_stack.loan_to_cost_pct}%</div>
        </div>
        <div class="card">
            <div class="kpi-title">Residual Land Value</div>
            <div class="kpi-value">${report.financial_kpis.residual_land_value:,.2f}</div>
            <div class="kpi-sub" style="color: #64748b;">Target 20% Hurdle Margin</div>
        </div>
    </div>

    <!-- Development Cost Budget -->
    <div class="section-title">2. Itemized Development Cost Schedule</div>
    <table>
        <thead>
            <tr>
                <th>Cost Category</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">% of TDC</th>
            </tr>
        </thead>
        <tbody>
            {cost_rows_html}
            <tr style="background: #f8fafc; font-weight: 700;">
                <td style="padding: 12px 14px;">TOTAL PROJECT COST (TDC)</td>
                <td style="padding: 12px 14px; text-align: right; font-family: monospace;">${report.financial_kpis.total_project_cost:,.2f}</td>
                <td style="padding: 12px 14px; text-align: right;">100.0%</td>
            </tr>
        </tbody>
    </table>

    <div class="page-break"></div>

    <!-- Product Mix & Sales Revenue Schedule -->
    <div class="section-title">3. Revenue & Sales Product Mix</div>
    <table>
        <thead>
            <tr>
                <th>Product Typology</th>
                <th style="text-align: center;">Units</th>
                <th style="text-align: right;">Avg Internal Area</th>
                <th style="text-align: right;">Rate / m²</th>
                <th style="text-align: right;">Total Realisation</th>
            </tr>
        </thead>
        <tbody>
            {sales_rows_html}
            <tr style="background: #f8fafc; font-weight: 700;">
                <td style="padding: 12px 14px;">PORTFOLIO TOTALS</td>
                <td style="padding: 12px 14px; text-align: center;">{report.total_units} Units</td>
                <td style="padding: 12px 14px; text-align: right;">{report.total_gfa_sqm:,.1f} m² GFA</td>
                <td style="padding: 12px 14px; text-align: right; font-family: monospace;">${report.avg_price_per_sqm:,.0f}/m²</td>
                <td style="padding: 12px 14px; text-align: right; font-family: monospace;">${report.financial_kpis.gross_realisation_value:,.2f}</td>
            </tr>
        </tbody>
    </table>

    <!-- Cash Flow Phasing Summary -->
    <div class="section-title">4. Multi-Period Cash Flow Trajectory</div>
    <table>
        <thead>
            <tr>
                <th>Period</th>
                <th style="text-align: right;">Project Outflows</th>
                <th style="text-align: right;">Sales Inflows</th>
                <th style="text-align: right;">Net Cash Flow</th>
                <th style="text-align: right;">Debt Balance</th>
            </tr>
        </thead>
        <tbody>
            {cf_rows_html}
        </tbody>
    </table>

    <!-- Certification & Sign-off -->
    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between;">
        <div>
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Prepared By:</div>
            <div style="color: #64748b;">{report.project_meta.generated_by_user}</div>
            <div style="color: #64748b; font-size: 11px;">{report.project_meta.organization_name}</div>
        </div>
        <div style="text-align: right;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Executive Certification:</div>
            <div style="width: 200px; border-bottom: 1px solid #0f172a; margin-bottom: 4px; height: 28px;"></div>
            <div style="color: #64748b; font-size: 11px;">Authorised Development Director</div>
        </div>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=html_content)
