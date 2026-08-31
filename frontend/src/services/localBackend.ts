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
  FullFeasibilityResponse,
  ExecutiveReportResponse,
  SensitivityDashboardResponse,
  SensitivitySimulateInput,
  SensitivitySimulateResponse,
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
    const rawEmail = (email || 'demo@feaspro.com').trim().toLowerCase();
    const rawName = rawEmail.split('@')[0];
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const user: User = {
      id: `u-${Date.now()}`,
      email: rawEmail,
      full_name: formattedName || 'Developer',
      role: 'admin',
      organization_id: 'org-demo',
      organization: {
        id: 'org-demo',
        name: 'Apex Property Group',
        slug: 'apex-developments',
      },
      is_active: true,
    };
    setStored(STORAGE_KEY_USER, user);
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
  },

  getExecutiveReport(projectId: string, scenarioId: string): ExecutiveReportResponse {
    const projectList = this.getProjects();
    const proj = projectList.items.find((p: ProjectListItem) => p.id === projectId) || {
      id: projectId,
      name: 'Pacific Horizon Residences',
      location: 'Burleigh Heads, QLD',
      development_type: 'multi_residential',
      status: 'active',
      start_date: '2026-03-01',
      target_completion_date: '2028-06-30',
    };

    return {
      project_meta: {
        project_id: projectId,
        project_name: proj.name,
        organization_name: 'Apex Property Group',
        organization_slug: 'apex-property-group',
        location: proj.location || 'Burleigh Heads, QLD',
        development_type: proj.development_type || 'multi_residential',
        status: proj.status || 'active',
        start_date: proj.start_date ?? undefined,
        target_completion_date: proj.target_completion_date ?? undefined,
        scenario_id: scenarioId,
        scenario_name: 'Baseline Feasibility (48 Units)',
        is_baseline: true,
        report_generated_at: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
        generated_by_user: 'Senior Development Director',
      },
      financial_kpis: {
        gross_realisation_value: 58400000,
        net_realisation_value: 55480000,
        land_acquisition_cost: 14500000,
        development_cost_ex_land: 31200000,
        total_project_cost: 45700000,
        total_finance_cost: 2850000,
        net_profit: 9780000,
        dev_margin_on_cost_pct: 21.4,
        margin_on_grv_pct: 16.7,
        return_on_equity_pct: 71.4,
        equity_multiple: 1.71,
        project_irr_pct: 23.6,
        net_present_value: 6240000,
        discount_rate_pct: 10.0,
        residual_land_value: 15200000,
        wacc_pct: 8.4,
      },
      capital_stack: {
        senior_debt_facility: 31990000,
        senior_max_ltc_pct: 70.0,
        senior_max_lvr_pct: 65.0,
        senior_interest_rate_pct: 8.5,
        senior_capitalized_interest: 2450000,
        senior_fees: 400000,
        mezzanine_enabled: false,
        mezzanine_facility: 0,
        mezzanine_interest_rate_pct: 15.0,
        mezzanine_capitalized_interest: 0,
        required_equity: 13710000,
        total_debt_facility: 31990000,
        peak_debt_exposure: 29850000,
        loan_to_cost_pct: 70.0,
        loan_to_value_pct: 54.8,
        equity_ratio_pct: 30.0,
      },
      cost_breakdown: [
        {
          category: 'land',
          display_name: 'Land Acquisition & Settlement',
          total_amount: 14500000,
          percentage_of_tdc: 31.7,
          item_count: 2,
          items: [
            { name: 'Contract Purchase Price', amount: 13800000 },
            { name: 'Stamp Duty & Legal Transfer', amount: 700000 },
          ],
        },
        {
          category: 'construction',
          display_name: 'Direct Construction & Headworks',
          total_amount: 22400000,
          percentage_of_tdc: 49.0,
          item_count: 3,
          items: [
            { name: 'Main Structure & Fitout (48 Units)', amount: 19800000 },
            { name: 'Civil Infrastructure & Headworks', amount: 1600000 },
            { name: 'Landscaping & External Amenities', amount: 1000000 },
          ],
        },
        {
          category: 'professional_fees',
          display_name: 'Professional & Consultant Fees',
          total_amount: 3200000,
          percentage_of_tdc: 7.0,
          item_count: 4,
          items: [
            { name: 'Architectural & Design Lead', amount: 1500000 },
            { name: 'Structural & Civil Engineering', amount: 750000 },
            { name: 'Town Planning & Environmental', amount: 450000 },
            { name: 'Quantity Surveying & Certification', amount: 500000 },
          ],
        },
        {
          category: 'statutory',
          display_name: 'Statutory Fees & Authority Charges',
          total_amount: 1800000,
          percentage_of_tdc: 3.9,
          item_count: 2,
          items: [
            { name: 'Council Infrastructure Contributions', amount: 1500000 },
            { name: 'Development Application & Building Levies', amount: 300000 },
          ],
        },
        {
          category: 'contingency',
          display_name: 'Contingency Reserves',
          total_amount: 1120000,
          percentage_of_tdc: 2.5,
          item_count: 1,
          items: [{ name: '5.0% Construction Cost Contingency', amount: 1120000 }],
        },
        {
          category: 'marketing',
          display_name: 'Marketing & Selling Expenses',
          total_amount: 2680000,
          percentage_of_tdc: 5.9,
          item_count: 2,
          items: [
            { name: 'Project Branding & Display Suite', amount: 800000 },
            { name: 'Sales Agent Commissions (3.2%)', amount: 1880000 },
          ],
        },
      ],
      sales_mix: [
        {
          id: 'sp-1',
          name: '2-Bedroom Luxury Beachfront Residences',
          total_units: 24,
          avg_internal_area: 95.0,
          avg_external_area: 18.0,
          total_area_sqm: 2280.0,
          price_per_sqm: 11500,
          unit_sale_price: 1092500,
          total_revenue: 26220000,
          percentage_of_revenue: 44.9,
          sales_commission_pct: 3.0,
          marketing_cost_pct: 1.5,
          settlement_month: 24,
        },
        {
          id: 'sp-2',
          name: '3-Bedroom Ocean View Sky Homes',
          total_units: 20,
          avg_internal_area: 135.0,
          avg_external_area: 25.0,
          total_area_sqm: 2700.0,
          price_per_sqm: 10500,
          unit_sale_price: 1417500,
          total_revenue: 28350000,
          percentage_of_revenue: 48.5,
          sales_commission_pct: 3.0,
          marketing_cost_pct: 1.5,
          settlement_month: 24,
        },
        {
          id: 'sp-3',
          name: '4-Bedroom Penthouse Collection',
          total_units: 4,
          avg_internal_area: 210.0,
          avg_external_area: 60.0,
          total_area_sqm: 840.0,
          price_per_sqm: 11464,
          unit_sale_price: 2407500,
          total_revenue: 9630000,
          percentage_of_revenue: 16.5,
          sales_commission_pct: 3.0,
          marketing_cost_pct: 1.5,
          settlement_month: 24,
        },
      ],
      total_units: 48,
      total_gfa_sqm: 5820.0,
      avg_price_per_sqm: 10034.36,
      cashflow_summary: [
        { month: 1, label: 'Month 1', land_costs: 14500000, construction_costs: 0, professional_fees: 450000, statutory_costs: 300000, finance_costs: 35000, other_costs: 0, total_outflow: 15285000, sales_inflow: 0, net_cashflow: -15285000, cumulative_net_cashflow: -15285000, debt_drawdown: 10700000, debt_repayment: 0, closing_debt_balance: 10700000 },
        { month: 6, label: 'Month 6', land_costs: 0, construction_costs: 1800000, professional_fees: 250000, statutory_costs: 0, finance_costs: 95000, other_costs: 0, total_outflow: 2145000, sales_inflow: 0, net_cashflow: -2145000, cumulative_net_cashflow: -22400000, debt_drawdown: 2145000, debt_repayment: 0, closing_debt_balance: 18500000 },
        { month: 12, label: 'Month 12', land_costs: 0, construction_costs: 3200000, professional_fees: 180000, statutory_costs: 0, finance_costs: 145000, other_costs: 0, total_outflow: 3525000, sales_inflow: 0, net_cashflow: -3525000, cumulative_net_cashflow: -34100000, debt_drawdown: 3525000, debt_repayment: 0, closing_debt_balance: 26800000 },
        { month: 18, label: 'Month 18', land_costs: 0, construction_costs: 2800000, professional_fees: 120000, statutory_costs: 0, finance_costs: 175000, other_costs: 0, total_outflow: 3095000, sales_inflow: 0, net_cashflow: -3095000, cumulative_net_cashflow: -43200000, debt_drawdown: 3095000, debt_repayment: 0, closing_debt_balance: 29850000 },
        { month: 24, label: 'Month 24', land_costs: 0, construction_costs: 800000, professional_fees: 50000, statutory_costs: 0, finance_costs: 120000, other_costs: 1880000, total_outflow: 2850000, sales_inflow: 58400000, net_cashflow: 55550000, cumulative_net_cashflow: 9780000, debt_drawdown: 0, debt_repayment: 29850000, closing_debt_balance: 0 },
      ],
      milestones: [
        { id: 'm-1', name: 'Land Settlement & DA Lodgement', phase: 'Acquisition', start_month: 1, end_month: 3, duration_months: 3, status: 'completed' },
        { id: 'm-2', name: 'Council Development Approval & Presales', phase: 'Planning', start_month: 3, end_month: 8, duration_months: 5, status: 'completed' },
        { id: 'm-3', name: 'Main Construction & Civil Works', phase: 'Construction', start_month: 8, end_month: 22, duration_months: 14, status: 'in_progress' },
        { id: 'm-4', name: 'Practical Completion & Titling', phase: 'Completion', start_month: 22, end_month: 24, duration_months: 2, status: 'planned' },
        { id: 'm-5', name: 'Purchaser Settlements & Debt Retiral', phase: 'Settlements', start_month: 24, end_month: 26, duration_months: 2, status: 'planned' },
      ],
      executive_summary_notes: [
        'Development Margin on Cost achieves 21.4% exceeding the institutional investment committee threshold of 20.0%.',
        'Senior construction debt sized at 70.0% Loan-to-Cost with maximum peak debt facility of $29.85M.',
        'Projected Internal Rate of Return (IRR) is 23.6% p.a. generating an Equity Multiple of 1.71x on $13.71M developer equity.',
        'GST Margin Scheme elected to reduce total statutory GST remittance across 48 residential units.',
        'Contract land price of $13.80M provides a $1.40M safety margin against the maximum Residual Land Value (RLV) of $15.20M.',
      ],
      stamp_duty_details: { total_stamp_duty: 700000, effective_rate_pct: 5.07 },
      gst_details: { gst_payable: 3820000, margin_scheme_applied: true },
      valuation_rlv: { residual_land_value_cost_target: 15200000, target_margin_on_cost_pct: 20.0 },
    };
  },

  getSensitivityAnalysis(_projectId: string, scenarioId: string): SensitivityDashboardResponse {
    const pSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    const cSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    const baseGRV = 58400000;
    const baseNRV = 55480000;
    const baseCost = 45700000;

    const rows = cSteps.map(cShift => {
      const shiftedCost = baseCost * (1 + cShift / 100);
      const cells = pSteps.map(pShift => {
        const shiftedNRV = baseNRV * (1 + pShift / 100);
        const shiftedGRV = baseGRV * (1 + pShift / 100);
        const profit = shiftedNRV - shiftedCost;
        const margin = (profit / shiftedCost) * 100;
        const irr = Math.max(-10, Math.min(60, 23.6 + (pShift * 0.8) - (cShift * 0.6)));
        const rlv = (shiftedNRV / 1.2) - (shiftedCost * 0.68);

        let status: 'optimal' | 'acceptable' | 'marginal' | 'deficit' = 'marginal';
        if (margin >= 20) status = 'optimal';
        else if (margin >= 15) status = 'acceptable';
        else if (margin >= 0) status = 'marginal';
        else status = 'deficit';

        return {
          price_shift_pct: pShift,
          cost_shift_pct: cShift,
          gross_realisation_value: shiftedGRV,
          net_realisation_value: shiftedNRV,
          total_project_cost: shiftedCost,
          net_profit: profit,
          dev_margin_on_cost_pct: margin.toFixed(2),
          margin_on_grv_pct: ((profit / shiftedGRV) * 100).toFixed(2),
          project_irr_pct: parseFloat(irr.toFixed(1)),
          residual_land_value: Math.max(0, rlv),
          status,
          is_baseline: pShift === 0 && cShift === 0,
        };
      });
      return { cost_shift_pct: cShift, cells };
    });

    return {
      scenario_id: scenarioId,
      scenario_name: 'Baseline Feasibility (48 Units)',
      is_baseline: true,
      baseline_kpis: {
        gross_realisation_value: baseGRV,
        net_realisation_value: baseNRV,
        total_project_cost: baseCost,
        land_cost: 14500000,
        construction_cost: 22400000,
        finance_cost: 2850000,
        net_profit: 9780000,
        dev_margin_on_cost_pct: 21.4,
        project_irr_pct: 23.6,
        equity_amount: 13710000,
        interest_rate_pct: 8.5,
        duration_months: 24,
      },
      matrix_2d: {
        price_steps: pSteps,
        cost_steps: cSteps,
        rows,
      },
      interest_rate_matrix: [
        { rate_delta_pct: -3.0, interest_rate_pct: 5.5, total_finance_cost: 1840000, finance_cost_increase: -1010000, net_profit_after_finance: 10790000, dev_margin_on_cost_pct: 24.1, return_on_equity_pct: 78.7, is_baseline: false },
        { rate_delta_pct: -2.0, interest_rate_pct: 6.5, total_finance_cost: 2170000, finance_cost_increase: -680000, net_profit_after_finance: 10460000, dev_margin_on_cost_pct: 23.2, return_on_equity_pct: 76.3, is_baseline: false },
        { rate_delta_pct: -1.0, interest_rate_pct: 7.5, total_finance_cost: 2510000, finance_cost_increase: -340000, net_profit_after_finance: 10120000, dev_margin_on_cost_pct: 22.3, return_on_equity_pct: 73.8, is_baseline: false },
        { rate_delta_pct: 0.0, interest_rate_pct: 8.5, total_finance_cost: 2850000, finance_cost_increase: 0, net_profit_after_finance: 9780000, dev_margin_on_cost_pct: 21.4, return_on_equity_pct: 71.4, is_baseline: true },
        { rate_delta_pct: 1.0, interest_rate_pct: 9.5, total_finance_cost: 3190000, finance_cost_increase: 340000, net_profit_after_finance: 9440000, dev_margin_on_cost_pct: 20.5, return_on_equity_pct: 68.9, is_baseline: false },
        { rate_delta_pct: 2.0, interest_rate_pct: 10.5, total_finance_cost: 3520000, finance_cost_increase: 670000, net_profit_after_finance: 9110000, dev_margin_on_cost_pct: 19.6, return_on_equity_pct: 66.4, is_baseline: false },
        { rate_delta_pct: 3.0, interest_rate_pct: 11.5, total_finance_cost: 3860000, finance_cost_increase: 1010000, net_profit_after_finance: 8770000, dev_margin_on_cost_pct: 18.8, return_on_equity_pct: 64.0, is_baseline: false },
        { rate_delta_pct: 4.0, interest_rate_pct: 12.5, total_finance_cost: 4190000, finance_cost_increase: 1340000, net_profit_after_finance: 8440000, dev_margin_on_cost_pct: 17.9, return_on_equity_pct: 61.6, is_baseline: false },
      ],
      delay_stress_test: [
        { delay_months: 0, total_duration_months: 24, additional_holding_cost: 0, additional_interest_cost: 0, total_delay_cost: 0, adjusted_project_cost: baseCost, adjusted_net_profit: 9780000, dev_margin_on_cost_pct: 21.4, project_irr_pct: 23.6, is_baseline: true },
        { delay_months: 1, total_duration_months: 25, additional_holding_cost: 25000, additional_interest_cost: 130000, total_delay_cost: 155000, adjusted_project_cost: 45855000, adjusted_net_profit: 9625000, dev_margin_on_cost_pct: 21.0, project_irr_pct: 22.3, is_baseline: false },
        { delay_months: 3, total_duration_months: 27, additional_holding_cost: 75000, additional_interest_cost: 390000, total_delay_cost: 465000, adjusted_project_cost: 46165000, adjusted_net_profit: 9315000, dev_margin_on_cost_pct: 20.2, project_irr_pct: 19.8, is_baseline: false },
        { delay_months: 6, total_duration_months: 30, additional_holding_cost: 150000, additional_interest_cost: 780000, total_delay_cost: 930000, adjusted_project_cost: 46630000, adjusted_net_profit: 8850000, dev_margin_on_cost_pct: 19.0, project_irr_pct: 16.4, is_baseline: false },
        { delay_months: 9, total_duration_months: 33, additional_holding_cost: 225000, additional_interest_cost: 1170000, total_delay_cost: 1395000, adjusted_project_cost: 47095000, adjusted_net_profit: 8385000, dev_margin_on_cost_pct: 17.8, project_irr_pct: 13.5, is_baseline: false },
        { delay_months: 12, total_duration_months: 36, additional_holding_cost: 300000, additional_interest_cost: 1560000, total_delay_cost: 1860000, adjusted_project_cost: 47560000, adjusted_net_profit: 7920000, dev_margin_on_cost_pct: 16.6, project_irr_pct: 11.0, is_baseline: false },
      ],
      breakeven: {
        current_grv: baseGRV,
        breakeven_grv: 48120000,
        revenue_safety_buffer_dollar: 9780000,
        revenue_safety_buffer_pct: 16.7,
        current_rate_per_sqm: 10034.36,
        breakeven_rate_per_sqm: 8268.04,
        current_total_cost: baseCost,
        max_tolerable_cost: baseNRV,
        max_cost_overrun_dollar: 9780000,
        max_cost_overrun_pct: 21.4,
        current_land_cost: 14500000,
        max_tolerable_land_price: 24280000,
      },
      tornado_ranking: [
        { rank: 1, driver: 'Sales Realisation (GRV)', category: 'revenue', low_shock_profit: 4232000, high_shock_profit: 15328000, profit_swing: 11096000, elasticity_pct: 113.5 },
        { rank: 2, driver: 'Direct Construction Costs', category: 'costs', low_shock_profit: 7540000, high_shock_profit: 12020000, profit_swing: 4480000, elasticity_pct: 45.8 },
        { rank: 3, driver: 'Land Acquisition Purchase Price', category: 'land', low_shock_profit: 8330000, high_shock_profit: 11230000, profit_swing: 2900000, elasticity_pct: 29.7 },
        { rank: 4, driver: 'Financing & Interest Rate', category: 'finance', low_shock_profit: 9352500, high_shock_profit: 10207500, profit_swing: 855000, elasticity_pct: 8.7 },
        { rank: 5, driver: 'Project Timeline (Holding Costs)', category: 'schedule', low_shock_profit: 9710000, high_shock_profit: 9850000, profit_swing: 140000, elasticity_pct: 1.4 },
      ],
    };
  },

  simulateSensitivity(
    _projectId: string,
    _scenarioId: string,
    payload: SensitivitySimulateInput
  ): SensitivitySimulateResponse {
    const baseGRV = 58400000;
    const baseNRV = 55480000;
    const baseCost = 45700000;
    const baseFinance = 2850000;
    const baseEquity = 13710000;

    const pMult = 1 + payload.price_shift_pct / 100;
    const cMult = 1 + payload.cost_shift_pct / 100;
    const simGRV = baseGRV * pMult;
    const simNRV = baseNRV * pMult;
    const simBaseCost = baseCost * cMult;

    const rateDelta = payload.interest_rate_delta_pct;
    const rateRatio = (8.5 + rateDelta) / 8.5;
    const extraDelay = payload.delay_months;
    const delayFinanceMult = 1 + extraDelay * 0.045;
    const simFinance = baseFinance * rateRatio * delayFinanceMult;
    const extraHolding = 25000 * extraDelay;

    const simTotalCost = simBaseCost + (simFinance - baseFinance) + extraHolding;
    const simProfit = simNRV - simTotalCost;
    const simMargin = (simProfit / simTotalCost) * 100;
    const simROE = (simProfit / baseEquity) * 100;

    const irrFactor = Math.pow(24 / (24 + extraDelay), 1.35);
    const profitScale = simProfit / (baseNRV - baseCost);
    const simIRR = Math.max(-50, Math.min(150, 23.6 * irrFactor * (0.3 + 0.7 * Math.max(-0.5, profitScale))));

    let status: 'optimal' | 'acceptable' | 'marginal' | 'deficit' = 'marginal';
    if (simMargin >= 20) status = 'optimal';
    else if (simMargin >= 15) status = 'acceptable';
    else if (simMargin >= 0) status = 'marginal';
    else status = 'deficit';

    return {
      price_shift_pct: payload.price_shift_pct,
      cost_shift_pct: payload.cost_shift_pct,
      interest_rate_delta_pct: payload.interest_rate_delta_pct,
      delay_months: payload.delay_months,
      simulated_grv: simGRV,
      simulated_nrv: simNRV,
      simulated_total_cost: simTotalCost,
      simulated_finance_cost: simFinance,
      simulated_net_profit: simProfit,
      simulated_margin_on_cost_pct: simMargin.toFixed(2),
      simulated_project_irr_pct: parseFloat(simIRR.toFixed(1)),
      simulated_return_on_equity_pct: simROE.toFixed(2),
      simulated_residual_land_value: Math.max(0, (simNRV / 1.2) - (simTotalCost * 0.68)),
      status,
    };
  }
};


