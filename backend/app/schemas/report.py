from decimal import Decimal
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class ProjectMetaSummary(BaseModel):
    project_id: str
    project_name: str
    organization_name: str
    organization_slug: Optional[str] = None
    location: str
    development_type: str
    status: str
    start_date: Optional[str] = None
    target_completion_date: Optional[str] = None
    scenario_id: str
    scenario_name: str
    is_baseline: bool
    report_generated_at: str
    generated_by_user: Optional[str] = None

class FinancialSummaryScorecard(BaseModel):
    gross_realisation_value: Decimal
    net_realisation_value: Decimal
    land_acquisition_cost: Decimal
    development_cost_ex_land: Decimal
    total_project_cost: Decimal
    total_finance_cost: Decimal
    net_profit: Decimal
    dev_margin_on_cost_pct: Decimal
    margin_on_grv_pct: Decimal
    return_on_equity_pct: Decimal
    equity_multiple: Decimal
    project_irr_pct: float
    net_present_value: float
    discount_rate_pct: float
    residual_land_value: Decimal
    wacc_pct: Decimal

class CapitalStackSummary(BaseModel):
    senior_debt_facility: Decimal
    senior_max_ltc_pct: Decimal
    senior_max_lvr_pct: Decimal
    senior_interest_rate_pct: Decimal
    senior_capitalized_interest: Decimal
    senior_fees: Decimal
    mezzanine_enabled: bool
    mezzanine_facility: Decimal
    mezzanine_interest_rate_pct: Decimal
    mezzanine_capitalized_interest: Decimal
    required_equity: Decimal
    total_debt_facility: Decimal
    peak_debt_exposure: Decimal
    loan_to_cost_pct: Decimal
    loan_to_value_pct: Decimal
    equity_ratio_pct: Decimal

class CostCategoryBreakdownItem(BaseModel):
    category: str
    display_name: str
    total_amount: Decimal
    percentage_of_tdc: Decimal
    item_count: int
    items: List[Dict[str, Any]] = Field(default_factory=list)

class SalesProductMixItem(BaseModel):
    id: Optional[str] = None
    name: str
    total_units: int
    avg_internal_area: float
    avg_external_area: float
    total_area_sqm: float
    price_per_sqm: Decimal
    unit_sale_price: Decimal
    total_revenue: Decimal
    percentage_of_revenue: Decimal
    sales_commission_pct: Decimal
    marketing_cost_pct: Decimal
    settlement_month: int

class CashFlowSummaryRow(BaseModel):
    month: int
    label: str
    land_costs: Decimal
    construction_costs: Decimal
    professional_fees: Decimal
    statutory_costs: Decimal
    finance_costs: Decimal
    other_costs: Decimal
    total_outflow: Decimal
    sales_inflow: Decimal
    net_cashflow: Decimal
    cumulative_net_cashflow: Decimal
    debt_drawdown: Decimal
    debt_repayment: Decimal
    closing_debt_balance: Decimal

class MilestoneSummaryItem(BaseModel):
    id: Optional[str] = None
    name: str
    phase: str
    start_month: int
    end_month: int
    duration_months: int
    status: str

class ExecutiveReportResponse(BaseModel):
    project_meta: ProjectMetaSummary
    financial_kpis: FinancialSummaryScorecard
    capital_stack: CapitalStackSummary
    cost_breakdown: List[CostCategoryBreakdownItem]
    sales_mix: List[SalesProductMixItem]
    total_units: int
    total_gfa_sqm: float
    avg_price_per_sqm: Decimal
    cashflow_summary: List[CashFlowSummaryRow]
    milestones: List[MilestoneSummaryItem]
    executive_summary_notes: List[str]
    stamp_duty_details: Dict[str, Any]
    gst_details: Dict[str, Any]
    valuation_rlv: Dict[str, Any]
