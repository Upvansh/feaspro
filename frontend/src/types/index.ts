export type DevelopmentType =
  | 'residential_subdivision'
  | 'multi_unit_residential'
  | 'townhouses'
  | 'commercial_mixed_use'
  | 'industrial'
  | 'retail'
  | 'other';

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived';

export interface AcquisitionCostItem {
  id: string;
  land_id: string;
  category: string;
  name: string;
  amount: number | string;
  notes?: string | null;
  date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandCalculations {
  purchase_price: number | string;
  deposit_amount: number | string;
  total_acquisition_costs: number | string;
  total_land_acquisition: number | string;
  remaining_purchase_amount: number | string;
}

export interface LandInput {
  id: string;
  scenario_id: string;
  purchase_price: number | string;
  deposit_amount?: number | string | null;
  deposit_due_date?: string | null;
  contract_date?: string | null;
  settlement_date?: string | null;
  site_area?: number | string | null;
  site_area_unit: string;
  current_zoning?: string | null;
  existing_improvements?: string | null;
  planning_notes?: string | null;
  development_potential_notes?: string | null;
  acquisition_costs: AcquisitionCostItem[];
  calculations: LandCalculations;
  created_at: string;
  updated_at: string;
}

export interface LandInputUpdate {
  purchase_price?: number | string;
  deposit_amount?: number | string | null;
  deposit_due_date?: string | null;
  contract_date?: string | null;
  settlement_date?: string | null;
  site_area?: number | string | null;
  site_area_unit?: string;
  current_zoning?: string | null;
  existing_improvements?: string | null;
  planning_notes?: string | null;
  development_potential_notes?: string | null;
  acquisition_costs?: {
    category: string;
    name: string;
    amount: number | string;
    notes?: string | null;
    date?: string | null;
  }[];
}

// Costs Types
export interface CostItem {
  id?: string;
  scenario_id?: string;
  category: 'construction' | 'consultants' | 'statutory' | 'contingency' | 'holding' | 'other' | string;
  name: string;
  calculation_method: 'fixed_amount' | 'rate_per_sqm' | 'percent_construction' | string;
  quantity?: number | string | null;
  rate?: number | string | null;
  amount: number | string;
  phasing_curve: 's_curve' | 'linear' | 'upfront' | 'end' | string;
  start_month: number;
  end_month: number;
  gst_applicable?: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CostCalculationSummary {
  construction_subtotal: number | string;
  consultants_subtotal: number | string;
  statutory_subtotal: number | string;
  contingency_subtotal: number | string;
  holding_subtotal: number | string;
  other_subtotal: number | string;
  total_input_tax_credits: number | string;
  total_development_cost_ex_land: number | string;
  land_acquisition_total: number | string;
  total_project_cost: number | string;
}

export interface CostSummaryResponse {
  summary: CostCalculationSummary;
  items: CostItem[];
}

// Sales Types
export interface SalesProductItem {
  id?: string;
  scenario_id?: string;
  name: string;
  unit_type: string;
  total_units: number;
  avg_internal_area: number | string;
  avg_external_area: number | string;
  price_per_sqm?: number | string | null;
  unit_sale_price: number | string;
  total_revenue: number | string;
  sales_commission_pct: number | string;
  marketing_cost_pct: number | string;
  gst_applicable?: boolean;
  sales_start_month: number;
  sales_end_month: number;
  settlement_month: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalesCalculationSummary {
  total_units: number;
  total_internal_area: number | string;
  total_external_area: number | string;
  gross_realisation_value: number | string;
  total_commissions: number | string;
  total_marketing: number | string;
  total_selling_costs: number | string;
  net_realisation_value: number | string;
  avg_price_per_unit: number | string;
  avg_rate_sqm: number | string;
}

export interface SalesSummaryResponse {
  summary: SalesCalculationSummary;
  items: SalesProductItem[];
}

// Cash Flow Types
export interface MonthlyCashFlow {
  month: number;
  period_label: string;
  land_cost?: number;
  construction_cost: number;
  consultant_cost?: number;
  statutory_holding_cost?: number;
  acquisition_cost?: number;
  total_outflow?: number;
  revenue: number;
  net_cashflow: number;
  cumulative_cashflow: number;
  debt_drawdown?: number;
  cumulative_debt?: number;
}

export interface CashFlowSummary {
  project_duration_months: number;
  total_revenue: number;
  total_costs: number;
  net_profit: number;
  project_irr: number;
  peak_debt: number;
  monthly_data: MonthlyCashFlow[];
}

// Funding & Capital Stack Types
export interface FundingAssumption {
  id?: string;
  scenario_id?: string;
  senior_debt_enabled: boolean;
  senior_max_ltc_pct: number | string;
  senior_max_lvr_pct: number | string;
  senior_interest_rate_pct: number | string;
  senior_line_fee_pct: number | string;
  senior_establishment_fee_pct: number | string;
  mezzanine_enabled: boolean;
  mezzanine_amount: number | string;
  mezzanine_interest_rate_pct: number | string;
  target_equity_contribution?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FundingCalculationSummary {
  senior_debt_facility_limit: number | string;
  senior_ltc_cap: number | string;
  senior_lvr_cap: number | string;
  constraining_factor: string;
  mezzanine_facility_limit: number | string;
  total_debt_facility: number | string;
  required_developer_equity: number | string;
  debt_percentage: number | string;
  equity_percentage: number | string;
  senior_establishment_fee: number | string;
  senior_interest_cost: number | string;
  senior_line_fee: number | string;
  mezzanine_interest_cost: number | string;
  total_estimated_finance_cost: number | string;
  net_profit_after_finance: number | string;
  return_on_equity_pct: number | string;
}

export interface FundingSummaryResponse {
  assumption: FundingAssumption;
  summary: FundingCalculationSummary;
}

// Schedule & Gantt Types
export interface ScheduleMilestone {
  id?: string;
  scenario_id?: string;
  stage: 'acquisition' | 'planning_da' | 'presales' | 'civil_demo' | 'construction' | 'titling' | 'settlement' | string;
  name: string;
  start_month: number;
  duration_months: number;
  end_month: number;
  status: 'planned' | 'in_progress' | 'completed' | string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleSummaryResponse {
  project_total_months: number;
  construction_duration_months: number;
  milestones: ScheduleMilestone[];
}

export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  is_baseline: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ScenarioMetrics {
  scenario_id: string;
  name: string;
  is_baseline: boolean;
  status: string;
  total_units: number;
  total_internal_area: number | string;
  gross_realisation_value: number | string;
  net_realisation_value: number | string;
  land_acquisition_total: number | string;
  construction_subtotal: number | string;
  total_development_cost_ex_land: number | string;
  total_project_cost: number | string;
  net_profit: number | string;
  margin_on_cost_pct: number | string;
  margin_on_grv_pct: number | string;
  project_irr: number;
  peak_debt: number;
  required_developer_equity: number | string;
  return_on_equity_pct: number | string;
  duration_months: number;
}

export interface ScenarioComparisonResponse {
  project_id: string;
  project_name: string;
  baseline_scenario_id: string | null;
  scenarios: ScenarioMetrics[];
}

export interface StampDutyResponse {
  base_stamp_duty: number | string;
  foreign_surcharge: number | string;
  total_stamp_duty: number | string;
  effective_rate_pct: number | string;
}

export interface GstMarginSchemeResponse {
  gst_payable: number | string;
  net_revenue_ex_gst: number | string;
  margin_scheme_applied: boolean;
}

export interface MarginSensitivityItem {
  target_margin_pct: number;
  max_land_purchase_price: number | string;
  max_total_land_acquisition: number | string;
}

export interface ResidualLandValueResponse {
  residual_land_value_cost_target: number | string;
  max_land_acquisition_cost_target: number | string;
  target_margin_on_cost_pct: number | string;
  residual_land_value_grv_target: number | string;
  max_land_acquisition_grv_target: number | string;
  target_margin_on_grv_pct: number | string;
  margin_sensitivity: MarginSensitivityItem[];
}

export interface FullFeasibilityResponse {
  project_id: string;
  scenario_id: string;
  scenario_name: string;
  stamp_duty: StampDutyResponse;
  gst: GstMarginSchemeResponse;
  valuation_rlv: ResidualLandValueResponse;
  wacc_pct: number | string;
  metrics: {
    gross_realisation_value: number | string;
    net_realisation_value: number | string;
    total_project_cost: number | string;
    total_development_cost_ex_land: number | string;
    land_acquisition_total: number | string;
    net_profit: number | string;
    margin_on_cost_pct: number | string;
    margin_on_grv_pct: number | string;
    net_profit_after_finance: number | string;
    return_on_equity_pct: number | string;
    project_irr_pct: number;
    net_present_value: number;
    discount_rate_pct: number;
  };
}

export interface Project {
  id: string;
  organization_id: string;
  created_by_id?: string | null;
  name: string;
  description?: string | null;
  location?: string | null;
  development_type: DevelopmentType;
  status: ProjectStatus;
  start_date?: string | null;
  target_completion_date?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  scenarios: Scenario[];
}

export interface ProjectListItem {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  development_type: DevelopmentType;
  status: ProjectStatus;
  start_date?: string | null;
  target_completion_date?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  scenario_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  location?: string;
  development_type: DevelopmentType;
  status?: ProjectStatus;
  start_date?: string;
  target_completion_date?: string;
  initial_scenario_name?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  location?: string;
  development_type?: DevelopmentType;
  status?: ProjectStatus;
  start_date?: string;
  target_completion_date?: string;
}

export interface ScenarioCreateInput {
  name: string;
  description?: string;
  is_baseline?: boolean;
  status?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  organization_id: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterInput {
  full_name: string;
  email: string;
  organization_name: string;
  password: string;
  confirm_password?: string;
}

// ─── Phase 2: Funding Tranche & Waterfall Types ──────────────────────────────

export type TrancheType = 'senior_debt' | 'mezzanine' | 'preferred_equity' | 'ordinary_equity';

export interface FundingTranche {
  id?: string;
  scenario_id?: string;
  tranche_type: TrancheType;
  name: string;
  priority_order: number;
  amount: number | string;
  hurdle_rate_pct: number | string;
  investor_split_pct: number | string;
  developer_promote_pct: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface WaterfallTier1Item {
  tranche_id: string;
  tranche_name: string;
  tranche_type: string;
  priority_order: number;
  capital_returned: number | string;
}

export interface WaterfallTier2Item {
  tranche_id: string;
  tranche_name: string;
  tranche_type: string;
  priority_order: number;
  preferred_return_target: number | string;
  preferred_return_paid: number | string;
  shortfall: number | string;
}

export interface WaterfallTier3Item {
  tranche_id: string;
  tranche_name: string;
  tranche_type: string;
  priority_order: number;
  investor_split_pct: number;
  developer_promote_pct: number;
  investor_distribution: number | string;
  developer_promote_distribution: number | string;
  total_distribution: number | string;
}

export interface WaterfallResult {
  available_proceeds: number | string;
  total_distributed: number | string;
  remaining_proceeds: number | string;
  reconciliation_difference: number | string;
  tier1_return_of_capital: WaterfallTier1Item[];
  tier2_preferred_return: WaterfallTier2Item[];
  tier3_residual_split: WaterfallTier3Item[];
}

export interface WaterfallResponse {
  tranches: FundingTranche[];
  waterfall: WaterfallResult;
  net_profit_after_finance: number | string;
}

// ─── Phase 3: Executive Feasibility Report Types ──────────────────────────────

export interface ProjectMetaSummary {
  project_id: string;
  project_name: string;
  organization_name: string;
  organization_slug?: string;
  location: string;
  development_type: string;
  status: string;
  start_date?: string;
  target_completion_date?: string;
  scenario_id: string;
  scenario_name: string;
  is_baseline: boolean;
  report_generated_at: string;
  generated_by_user?: string;
}

export interface FinancialSummaryScorecard {
  gross_realisation_value: number | string;
  net_realisation_value: number | string;
  land_acquisition_cost: number | string;
  development_cost_ex_land: number | string;
  total_project_cost: number | string;
  total_finance_cost: number | string;
  net_profit: number | string;
  dev_margin_on_cost_pct: number | string;
  margin_on_grv_pct: number | string;
  return_on_equity_pct: number | string;
  equity_multiple: number | string;
  project_irr_pct: number;
  net_present_value: number;
  discount_rate_pct: number;
  residual_land_value: number | string;
  wacc_pct: number | string;
}

export interface CapitalStackSummary {
  senior_debt_facility: number | string;
  senior_max_ltc_pct: number | string;
  senior_max_lvr_pct: number | string;
  senior_interest_rate_pct: number | string;
  senior_capitalized_interest: number | string;
  senior_fees: number | string;
  mezzanine_enabled: boolean;
  mezzanine_facility: number | string;
  mezzanine_interest_rate_pct: number | string;
  mezzanine_capitalized_interest: number | string;
  required_equity: number | string;
  total_debt_facility: number | string;
  peak_debt_exposure: number | string;
  loan_to_cost_pct: number | string;
  loan_to_value_pct: number | string;
  equity_ratio_pct: number | string;
}

export interface CostCategoryBreakdownItem {
  category: string;
  display_name: string;
  total_amount: number | string;
  percentage_of_tdc: number | string;
  item_count: number;
  items: Array<{
    name: string;
    amount: number | string;
    calculation_method?: string;
    quantity?: number;
    rate?: number;
  }>;
}

export interface SalesProductMixItem {
  id?: string;
  name: string;
  total_units: number;
  avg_internal_area: number;
  avg_external_area: number;
  total_area_sqm: number;
  price_per_sqm: number | string;
  unit_sale_price: number | string;
  total_revenue: number | string;
  percentage_of_revenue: number | string;
  sales_commission_pct: number | string;
  marketing_cost_pct: number | string;
  settlement_month: number;
}

export interface CashFlowSummaryRow {
  month: number;
  label: string;
  land_costs: number | string;
  construction_costs: number | string;
  professional_fees: number | string;
  statutory_costs: number | string;
  finance_costs: number | string;
  other_costs: number | string;
  total_outflow: number | string;
  sales_inflow: number | string;
  net_cashflow: number | string;
  cumulative_net_cashflow: number | string;
  debt_drawdown: number | string;
  debt_repayment: number | string;
  closing_debt_balance: number | string;
}

export interface MilestoneSummaryItem {
  id?: string;
  name: string;
  phase: string;
  start_month: number;
  end_month: number;
  duration_months: number;
  status: string;
}

export interface ExecutiveReportResponse {
  project_meta: ProjectMetaSummary;
  financial_kpis: FinancialSummaryScorecard;
  capital_stack: CapitalStackSummary;
  cost_breakdown: CostCategoryBreakdownItem[];
  sales_mix: SalesProductMixItem[];
  total_units: number;
  total_gfa_sqm: number;
  avg_price_per_sqm: number | string;
  cashflow_summary: CashFlowSummaryRow[];
  milestones: MilestoneSummaryItem[];
  executive_summary_notes: string[];
  stamp_duty_details: Record<string, unknown>;
  gst_details: Record<string, unknown>;
  valuation_rlv: Record<string, unknown>;
}

