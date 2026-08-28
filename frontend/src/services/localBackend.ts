import {
  User,
  AuthToken,
  Project,
  ProjectListItem,
  ProjectCreateInput,
  ProjectUpdateInput,
  Scenario,
  ScenarioCreateInput,
  LandInput,
  CostSummaryResponse,
  SalesSummaryResponse,
  CashFlowSummary,
  FundingTranche,
  WaterfallResponse,
  ScheduleSummaryResponse,
  FullFeasibilityResponse
} from '../types';

const STORAGE_KEY_USER = 'feaspro_local_user';
const STORAGE_KEY_PROJECTS = 'feaspro_local_projects';
const STORAGE_KEY_SCENARIOS = 'feaspro_local_scenarios';

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

const DEFAULT_SCENARIO: Scenario = {
  id: 'demo-scen-1',
  project_id: 'demo-proj-1',
  name: 'Baseline Feasibility Model',
  description: 'Original underwriting baseline scenario',
  is_baseline: true,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_PROJECT: Project = {
  id: 'demo-proj-1',
  organization_id: 'org-demo',
  name: 'Metro Residences - 240 Apartments',
  description: 'High-density mixed-use residential tower with ground floor retail & basement parking',
  location: '142-150 Elizabeth Street, Melbourne VIC 3000',
  development_type: 'multi_unit_residential',
  status: 'active',
  start_date: '2026-01-01',
  target_completion_date: '2028-06-30',
  is_archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  scenarios: [DEFAULT_SCENARIO],
};

export const localBackend = {
  register(data: { full_name: string; email: string; organization_name: string }): AuthToken {
    const user: User = {
      id: `u-${Date.now()}`,
      email: data.email,
      full_name: data.full_name,
      role: 'admin',
      organization_id: `org-${Date.now()}`,
      is_active: true,
    };
    setStored(STORAGE_KEY_USER, user);
    return {
      access_token: `mock-token-${Date.now()}`,
      token_type: 'bearer',
      user,
    };
  },

  login(email: string): AuthToken {
    let user = getStored<User | null>(STORAGE_KEY_USER, null);
    if (!user) {
      user = {
        id: `u-${Date.now()}`,
        email: email || 'demo@feaspro.com',
        full_name: email.split('@')[0] || 'Demo Developer',
        role: 'admin',
        organization_id: 'org-demo',
        is_active: true,
      };
      setStored(STORAGE_KEY_USER, user);
    }
    return {
      access_token: `mock-token-${Date.now()}`,
      token_type: 'bearer',
      user,
    };
  },

  getCurrentUser(): User {
    let user = getStored<User | null>(STORAGE_KEY_USER, null);
    if (!user) {
      user = {
        id: 'u-demo',
        email: 'developer@feaspro.com',
        full_name: 'Senior Feasibility Analyst',
        role: 'admin',
        organization_id: 'org-demo',
        is_active: true,
      };
      setStored(STORAGE_KEY_USER, user);
    }
    return user;
  },

  getProjects(): { items: ProjectListItem[]; total: number } {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEFAULT_PROJECT]);
    return {
      items: projects.map(p => ({
        id: p.id,
        organization_id: p.organization_id,
        name: p.name,
        description: p.description,
        location: p.location,
        development_type: p.development_type,
        status: p.status,
        start_date: p.start_date,
        target_completion_date: p.target_completion_date,
        is_archived: p.is_archived,
        archived_at: p.archived_at,
        scenario_count: p.scenarios ? p.scenarios.length : 1,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total: projects.length,
    };
  },

  getProject(id: string): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEFAULT_PROJECT]);
    return projects.find(p => p.id === id) || projects[0] || DEFAULT_PROJECT;
  },

  createProject(data: ProjectCreateInput): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEFAULT_PROJECT]);
    const newId = `proj-${Date.now()}`;
    const scen: Scenario = {
      id: `scen-${Date.now()}`,
      project_id: newId,
      name: data.initial_scenario_name || 'Baseline Feasibility Model',
      description: 'Initial development scenario',
      is_baseline: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newProj: Project = {
      id: newId,
      organization_id: 'org-demo',
      name: data.name,
      description: data.description || '',
      location: data.location || '',
      development_type: data.development_type || 'multi_unit_residential',
      status: data.status || 'active',
      start_date: data.start_date || '2026-01-01',
      target_completion_date: data.target_completion_date || '2028-06-30',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scenarios: [scen],
    };
    projects.push(newProj);
    setStored(STORAGE_KEY_PROJECTS, projects);
    return newProj;
  },

  updateProject(id: string, data: ProjectUpdateInput): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEFAULT_PROJECT]);
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...data, updated_at: new Date().toISOString() };
      setStored(STORAGE_KEY_PROJECTS, projects);
      return projects[idx];
    }
    return DEFAULT_PROJECT;
  },

  getScenarios(projectId: string): Scenario[] {
    const scenarios = getStored<Scenario[]>(STORAGE_KEY_SCENARIOS, [DEFAULT_SCENARIO]);
    const filtered = scenarios.filter(s => s.project_id === projectId || projectId === 'demo-proj-1');
    return filtered.length > 0 ? filtered : [DEFAULT_SCENARIO];
  },

  createScenario(projectId: string, data: ScenarioCreateInput): Scenario {
    const scenarios = getStored<Scenario[]>(STORAGE_KEY_SCENARIOS, [DEFAULT_SCENARIO]);
    const newScen: Scenario = {
      id: `scen-${Date.now()}`,
      project_id: projectId,
      name: data.name,
      description: data.description || '',
      is_baseline: data.is_baseline ?? false,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    scenarios.push(newScen);
    setStored(STORAGE_KEY_SCENARIOS, scenarios);
    return newScen;
  },

  getLand(_projectId: string, _scenarioId: string): LandInput {
    return {
      id: 'land-demo-1',
      scenario_id: _scenarioId || 'demo-scen-1',
      purchase_price: 14500000,
      deposit_amount: 1450000,
      deposit_due_date: '2026-02-15',
      contract_date: '2026-01-15',
      settlement_date: '2026-06-30',
      site_area: 3500,
      site_area_unit: 'sqm',
      current_zoning: 'Commercial 1 Zone (C1Z)',
      existing_improvements: 'Commercial warehouse building',
      planning_notes: 'Permit ready for multi-unit residential tower',
      development_potential_notes: '240 residential apartments across 18 levels',
      acquisition_costs: [
        { id: 'ac-1', land_id: 'land-demo-1', category: 'stamp_duty', name: 'Stamp Duty (State Revenue)', amount: 797500, notes: 'Calculated at 5.5% VIC rate', date: '2026-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'ac-2', land_id: 'land-demo-1', category: 'legal', name: 'Legal & Conveyancing', amount: 45000, notes: 'Contract review & settlement', date: '2026-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'ac-3', land_id: 'land-demo-1', category: 'due_diligence', name: 'Due Diligence & Site Survey', amount: 35000, notes: 'Phase 1 Environmental & Geotech', date: '2026-02-01', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      calculations: {
        purchase_price: 14500000,
        deposit_amount: 1450000,
        total_acquisition_costs: 877500,
        total_land_acquisition: 15377500,
        remaining_purchase_amount: 13050000,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  getCosts(_projectId: string, _scenarioId: string): CostSummaryResponse {
    return {
      summary: {
        construction_subtotal: 78400000,
        consultants_subtotal: 6272000,
        statutory_subtotal: 2880000,
        contingency_subtotal: 3920000,
        holding_subtotal: 1200000,
        other_subtotal: 3625000,
        total_input_tax_credits: 8750000,
        total_development_cost_ex_land: 96297000,
        land_acquisition_total: 15377500,
        total_project_cost: 111674500,
      },
      items: [
        { id: 'c-1', scenario_id: _scenarioId, category: 'construction', name: 'Base Building Construction', calculation_method: 'rate_per_sqm', quantity: 24500, rate: 3200, amount: 78400000, phasing_curve: 's_curve', start_month: 8, end_month: 22, gst_applicable: true, notes: 'Standard finishes' },
        { id: 'c-2', scenario_id: _scenarioId, category: 'consultants', name: 'Architectural & Engineering', calculation_method: 'percent_construction', quantity: 78400000, rate: 8.0, amount: 6272000, phasing_curve: 'linear', start_month: 2, end_month: 20, gst_applicable: true },
        { id: 'c-3', scenario_id: _scenarioId, category: 'statutory', name: 'Council Open Space & Development Contributions', calculation_method: 'fixed_amount', amount: 2880000, phasing_curve: 'upfront', start_month: 3, end_month: 3, gst_applicable: false },
        { id: 'c-4', scenario_id: _scenarioId, category: 'contingency', name: 'Construction Contingency (5%)', calculation_method: 'percent_construction', quantity: 78400000, rate: 5.0, amount: 3920000, phasing_curve: 's_curve', start_month: 8, end_month: 22, gst_applicable: true },
      ],
    };
  },

  getSales(_projectId: string, _scenarioId: string): SalesSummaryResponse {
    return {
      summary: {
        total_units: 240,
        total_internal_area: 17200,
        total_external_area: 2400,
        gross_realisation_value: 220172000,
        total_commissions: 4403440,
        total_marketing: 3302580,
        total_selling_costs: 7706020,
        net_realisation_value: 212465980,
        avg_price_per_unit: 917383.33,
        avg_rate_sqm: 12800.70,
      },
      items: [
        { id: 's-1', scenario_id: _scenarioId, name: '1 Bed, 1 Bath Apartment', unit_type: '1_bed', total_units: 80, avg_internal_area: 52, avg_external_area: 8, price_per_sqm: 11500, unit_sale_price: 598000, total_revenue: 47840000, sales_commission_pct: 2.0, marketing_cost_pct: 1.5, gst_applicable: true, sales_start_month: 4, sales_end_month: 16, settlement_month: 24 },
        { id: 's-2', scenario_id: _scenarioId, name: '2 Bed, 2 Bath Apartment', unit_type: '2_bed', total_units: 120, avg_internal_area: 78, avg_external_area: 12, price_per_sqm: 11200, unit_sale_price: 873600, total_revenue: 104832000, sales_commission_pct: 2.0, marketing_cost_pct: 1.5, gst_applicable: true, sales_start_month: 4, sales_end_month: 18, settlement_month: 24 },
        { id: 's-3', scenario_id: _scenarioId, name: '3 Bed Penthouse Suite', unit_type: '3_bed_penthouse', total_units: 40, avg_internal_area: 125, avg_external_area: 25, price_per_sqm: 13500, unit_sale_price: 1687500, total_revenue: 67500000, sales_commission_pct: 2.0, marketing_cost_pct: 1.5, gst_applicable: true, sales_start_month: 6, sales_end_month: 20, settlement_month: 26 },
      ],
    };
  },

  getCashFlow(_projectId: string, _scenarioId: string): CashFlowSummary {
    const monthly_data = Array.from({ length: 28 }, (_, i) => {
      const month = i + 1;
      const construction = month >= 8 && month <= 22 ? 5226666 : 0;
      const revenue = month === 24 ? 152672000 : month === 26 ? 67500000 : 0;
      return {
        month,
        period_label: `M${month}`,
        construction_cost: construction,
        revenue,
        net_cashflow: revenue - construction,
        cumulative_cashflow: (revenue - construction),
        peak_debt: 68500000,
      };
    });
    return {
      project_duration_months: 28,
      total_revenue: 220172000,
      total_costs: 111674500,
      net_profit: 108497500,
      project_irr: 24.8,
      peak_debt: 68500000,
      monthly_data,
    };
  },

  getTranches(_projectId: string, scenarioId: string): FundingTranche[] {
    return [
      { id: 'tr-1', scenario_id: scenarioId, tranche_type: 'senior_debt', name: 'Senior Construction Debt', priority_order: 1, amount: 72000000, hurdle_rate_pct: 6.5, investor_split_pct: 100, developer_promote_pct: 0 },
      { id: 'tr-2', scenario_id: scenarioId, tranche_type: 'mezzanine', name: 'Mezzanine Loan Facility', priority_order: 2, amount: 16500000, hurdle_rate_pct: 12.5, investor_split_pct: 100, developer_promote_pct: 0 },
      { id: 'tr-3', scenario_id: scenarioId, tranche_type: 'preferred_equity', name: 'LP Investor Equity', priority_order: 3, amount: 18000000, hurdle_rate_pct: 8.0, investor_split_pct: 80, developer_promote_pct: 20 },
      { id: 'tr-4', scenario_id: scenarioId, tranche_type: 'ordinary_equity', name: 'Sponsor / GP Equity', priority_order: 4, amount: 2000000, hurdle_rate_pct: 8.0, investor_split_pct: 20, developer_promote_pct: 80 },
    ];
  },

  getWaterfall(_projectId: string, scenarioId: string): WaterfallResponse {
    const tranches = this.getTranches(_projectId, scenarioId);
    return {
      tranches,
      net_profit_after_finance: 98095000,
      waterfall: {
        available_proceeds: 108497500,
        total_distributed: 108497500,
        remaining_proceeds: 0,
        reconciliation_difference: 0,
        tier1_return_of_capital: [
          { tranche_id: 'tr-1', tranche_name: 'Senior Construction Debt', tranche_type: 'senior_debt', priority_order: 1, capital_returned: 72000000 },
          { tranche_id: 'tr-2', tranche_name: 'Mezzanine Loan Facility', tranche_type: 'mezzanine', priority_order: 2, capital_returned: 16500000 },
          { tranche_id: 'tr-3', tranche_name: 'LP Investor Equity', tranche_type: 'preferred_equity', priority_order: 3, capital_returned: 18000000 },
          { tranche_id: 'tr-4', tranche_name: 'Sponsor / GP Equity', tranche_type: 'ordinary_equity', priority_order: 4, capital_returned: 2000000 },
        ],
        tier2_preferred_return: [
          { tranche_id: 'tr-3', tranche_name: 'LP Investor Equity', tranche_type: 'preferred_equity', priority_order: 3, preferred_return_target: 2880000, preferred_return_paid: 2880000, shortfall: 0 },
          { tranche_id: 'tr-4', tranche_name: 'Sponsor / GP Equity', tranche_type: 'ordinary_equity', priority_order: 4, preferred_return_target: 320000, preferred_return_paid: 320000, shortfall: 0 },
        ],
        tier3_residual_split: [
          { tranche_id: 'tr-3', tranche_name: 'LP Investor Equity', tranche_type: 'preferred_equity', priority_order: 3, investor_split_pct: 80, developer_promote_pct: 20, investor_distribution: 42330400, developer_promote_distribution: 10582600, total_distribution: 52913000 },
          { tranche_id: 'tr-4', tranche_name: 'Sponsor / GP Equity', tranche_type: 'ordinary_equity', priority_order: 4, investor_split_pct: 20, developer_promote_pct: 80, investor_distribution: 1511800, developer_promote_distribution: 6047200, total_distribution: 7559000 },
        ],
      }
    };
  },

  getSchedule(_projectId: string, _scenarioId: string): ScheduleSummaryResponse {
    return {
      project_total_months: 28,
      construction_duration_months: 15,
      milestones: [
        { id: 'm-1', scenario_id: _scenarioId, stage: 'acquisition', name: 'Site Acquisition & Settlement', start_month: 1, duration_months: 6, end_month: 6, status: 'completed' },
        { id: 'm-2', scenario_id: _scenarioId, stage: 'planning_da', name: 'Town Planning & Permits', start_month: 2, duration_months: 6, end_month: 7, status: 'completed' },
        { id: 'm-3', scenario_id: _scenarioId, stage: 'presales', name: 'Pre-Sales Campaign', start_month: 4, duration_months: 14, end_month: 18, status: 'in_progress' },
        { id: 'm-4', scenario_id: _scenarioId, stage: 'construction', name: 'Main Tower Construction', start_month: 8, duration_months: 15, end_month: 22, status: 'planned' },
        { id: 'm-5', scenario_id: _scenarioId, stage: 'settlement', name: 'Purchaser Settlements', start_month: 24, duration_months: 4, end_month: 28, status: 'planned' },
      ],
    };
  },

  getFullFeasibility(_projectId: string, _scenarioId: string): FullFeasibilityResponse {
    return {
      project_id: _projectId,
      scenario_id: _scenarioId,
      scenario_name: 'Baseline Feasibility Model',
      stamp_duty: {
        base_stamp_duty: 797500,
        foreign_surcharge: 0,
        total_stamp_duty: 797500,
        effective_rate_pct: 5.5,
      },
      gst: {
        gst_payable: 14850000,
        net_revenue_ex_gst: 205322000,
        margin_scheme_applied: true,
      },
      valuation_rlv: {
        residual_land_value_cost_target: 24850000,
        max_land_acquisition_cost_target: 26200000,
        target_margin_on_cost_pct: 20.0,
        residual_land_value_grv_target: 28400000,
        max_land_acquisition_grv_target: 29800000,
        target_margin_on_grv_pct: 18.5,
        margin_sensitivity: [
          { target_margin_pct: 15.0, max_land_purchase_price: 32000000, max_total_land_acquisition: 33760000 },
          { target_margin_pct: 18.5, max_land_purchase_price: 28400000, max_total_land_acquisition: 29962000 },
          { target_margin_pct: 20.0, max_land_purchase_price: 24850000, max_total_land_acquisition: 26216750 },
          { target_margin_pct: 25.0, max_land_purchase_price: 18500000, max_total_land_acquisition: 19517500 },
        ],
      },
      wacc_pct: 8.2,
      metrics: {
        gross_realisation_value: 220172000,
        net_realisation_value: 212465980,
        total_project_cost: 111674500,
        total_development_cost_ex_land: 96297000,
        land_acquisition_total: 15377500,
        net_profit: 100791480,
        margin_on_cost_pct: 90.25,
        margin_on_grv_pct: 45.78,
        net_profit_after_finance: 92341480,
        return_on_equity_pct: 461.7,
        project_irr_pct: 24.8,
        net_present_value: 48500000,
        discount_rate_pct: 8.5,
      }
    };
  }
};
