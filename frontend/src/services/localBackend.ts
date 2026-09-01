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
  LandInputUpdate,
  AcquisitionCostItem,
  CostItem,
  CostSummaryResponse,
  CostCalculationSummary,
  SalesProductItem,
  SalesSummaryResponse,
  SalesCalculationSummary,
  CashFlowSummary,
  FundingAssumption,
  FundingSummaryResponse,
  FundingCalculationSummary,
  FundingTranche,
  WaterfallResponse,
  ScheduleMilestone,
  ScheduleSummaryResponse,
  FullFeasibilityResponse,
  ExecutiveReportResponse,
  SensitivityDashboardResponse,
  SensitivitySimulateInput,
  SensitivitySimulateResponse,
  ScenarioComparisonResponse,
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

// ----------------------------------------------------------------------
// Demo Reference Seeds (Shown for demo project only)
// ----------------------------------------------------------------------
const DEMO_SCENARIO: Scenario = {
  id: 'demo-scen-1',
  project_id: 'demo-proj-1',
  name: 'Baseline Feasibility Model',
  description: 'Original underwriting baseline scenario',
  is_baseline: true,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_PROJECT: Project = {
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
  scenarios: [DEMO_SCENARIO],
};

const DEMO_LAND: LandInput = {
  id: 'land-demo-1',
  scenario_id: 'demo-scen-1',
  purchase_price: 14500000,
  deposit_amount: 1450000,
  deposit_due_date: '2026-02-15',
  contract_date: '2026-01-15',
  settlement_date: '2026-06-30',
  site_area: 3500,
  site_area_unit: 'm²',
  current_zoning: 'Commercial 1 Zone (C1Z)',
  existing_improvements: 'Commercial warehouse building',
  planning_notes: 'Permit ready for multi-unit residential tower',
  development_potential_notes: '240 residential apartments across 18 levels',
  acquisition_costs: [
    { id: 'ac-1', land_id: 'land-demo-1', category: 'stamp_duty', name: 'Stamp Duty (State Revenue)', amount: 797500, notes: 'Calculated at 5.5% VIC rate', date: '2026-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'ac-2', land_id: 'land-demo-1', category: 'legal_fees', name: 'Legal & Conveyancing', amount: 45000, notes: 'Contract review & settlement', date: '2026-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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

const DEMO_COSTS: CostItem[] = [
  { id: 'c-1', scenario_id: 'demo-scen-1', category: 'construction', name: 'Base Building Construction', calculation_method: 'rate_per_sqm', quantity: 24500, rate: 3200, amount: 78400000, phasing_curve: 's_curve', start_month: 8, end_month: 22, gst_applicable: true, notes: 'Standard finishes' },
  { id: 'c-2', scenario_id: 'demo-scen-1', category: 'consultants', name: 'Architectural & Engineering', calculation_method: 'percent_construction', quantity: 78400000, rate: 8.0, amount: 6272000, phasing_curve: 'linear', start_month: 2, end_month: 20, gst_applicable: true },
  { id: 'c-3', scenario_id: 'demo-scen-1', category: 'statutory', name: 'Council Open Space & Contributions', calculation_method: 'fixed_amount', amount: 2880000, phasing_curve: 'upfront', start_month: 3, end_month: 3, gst_applicable: false },
  { id: 'c-4', scenario_id: 'demo-scen-1', category: 'contingency', name: 'Construction Contingency (5%)', calculation_method: 'percent_construction', quantity: 78400000, rate: 5.0, amount: 3920000, phasing_curve: 's_curve', start_month: 8, end_month: 22, gst_applicable: true },
];

const DEMO_SALES: SalesProductItem[] = [
  { id: 's-1', scenario_id: 'demo-scen-1', name: '1 Bed, 1 Bath Apartment', unit_type: '1_bed', total_units: 80, avg_internal_area: 52, avg_external_area: 8, price_per_sqm: 11500, unit_sale_price: 598000, total_revenue: 47840000, sales_commission_pct: 2.0, marketing_cost_pct: 1.5, gst_applicable: true, sales_start_month: 4, sales_end_month: 16, settlement_month: 24 },
  { id: 's-2', scenario_id: 'demo-scen-1', name: '2 Bed, 2 Bath Apartment', unit_type: '2_bed', total_units: 120, avg_internal_area: 78, avg_external_area: 12, price_per_sqm: 11200, unit_sale_price: 873600, total_revenue: 104832000, sales_commission_pct: 2.0, marketing_cost_pct: 1.5, gst_applicable: true, sales_start_month: 4, sales_end_month: 18, settlement_month: 24 },
  { id: 's-3', scenario_id: 'demo-scen-1', name: '3 Bed Penthouse Suite', unit_type: '3_bed_penthouse', total_units: 40, avg_internal_area: 125, avg_external_area: 25, price_per_sqm: 13500, unit_sale_price: 1687500, total_revenue: 67500000, sales_commission_pct: 2.0, marketing_cost_pct: 1.5, gst_applicable: true, sales_start_month: 6, sales_end_month: 20, settlement_month: 26 },
];

export const localBackend = {
  // ------------------------------------------------------------------
  // Auth
  // ------------------------------------------------------------------
  register(data: { full_name: string; email: string; organization_name: string }): AuthToken {
    const user: User = {
      id: `u-${Date.now()}`,
      email: data.email,
      full_name: data.full_name,
      role: 'admin',
      organization_id: `org-${Date.now()}`,
      organization: {
        id: `org-${Date.now()}`,
        name: data.organization_name || 'My Development Company',
        slug: 'my-org',
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

  login(email: string): AuthToken {
    const rawEmail = (email || 'developer@feaspro.com').trim().toLowerCase();
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

  // ------------------------------------------------------------------
  // Projects
  // ------------------------------------------------------------------
  getProjects(): { items: ProjectListItem[]; total: number } {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEMO_PROJECT]);
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
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEMO_PROJECT]);
    return projects.find(p => p.id === id) || projects[0] || DEMO_PROJECT;
  },

  createProject(data: ProjectCreateInput): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEMO_PROJECT]);
    const newId = `proj-${Date.now()}`;
    const newScenId = `scen-${Date.now()}`;
    const scen: Scenario = {
      id: newScenId,
      project_id: newId,
      name: data.initial_scenario_name || 'Baseline Feasibility',
      description: 'Initial underwriting baseline scenario',
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
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      target_completion_date: data.target_completion_date || '',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scenarios: [scen],
    };
    projects.push(newProj);
    setStored(STORAGE_KEY_PROJECTS, projects);

    // Initialize clean scenario state
    const allScenarios = getStored<Scenario[]>(STORAGE_KEY_SCENARIOS, [DEMO_SCENARIO]);
    allScenarios.push(scen);
    setStored(STORAGE_KEY_SCENARIOS, allScenarios);

    // Store clean initial Land for new scenario
    const cleanLand: LandInput = {
      id: `land-${Date.now()}`,
      scenario_id: newScenId,
      purchase_price: 0,
      deposit_amount: 0,
      deposit_due_date: null,
      contract_date: data.start_date || null,
      settlement_date: null,
      site_area: 0,
      site_area_unit: 'm²',
      current_zoning: '',
      existing_improvements: '',
      planning_notes: '',
      development_potential_notes: '',
      acquisition_costs: [
        { id: `ac-${Date.now()}-1`, land_id: `land-${Date.now()}`, category: 'stamp_duty', name: 'Stamp / Transfer Duty', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-${Date.now()}-2`, land_id: `land-${Date.now()}`, category: 'legal_fees', name: 'Legal & Conveyancing', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-${Date.now()}-3`, land_id: `land-${Date.now()}`, category: 'due_diligence', name: 'Due Diligence & Site Tests', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-${Date.now()}-4`, land_id: `land-${Date.now()}`, category: 'valuation_fees', name: 'Valuation & Advisory', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-${Date.now()}-5`, land_id: `land-${Date.now()}`, category: 'agent_fees', name: "Buyer's Agent / Acquisition Fee", amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      calculations: {
        purchase_price: 0,
        deposit_amount: 0,
        total_acquisition_costs: 0,
        total_land_acquisition: 0,
        remaining_purchase_amount: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStored(`feaspro_land_${newScenId}`, cleanLand);
    setStored(`feaspro_costs_${newScenId}`, []);
    setStored(`feaspro_sales_${newScenId}`, []);

    return newProj;
  },

  updateProject(id: string, data: ProjectUpdateInput): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEMO_PROJECT]);
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...data, updated_at: new Date().toISOString() };
      setStored(STORAGE_KEY_PROJECTS, projects);
      return projects[idx];
    }
    return DEMO_PROJECT;
  },

  archiveProject(id: string): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEMO_PROJECT]);
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        is_archived: true,
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStored(STORAGE_KEY_PROJECTS, projects);
      return projects[idx];
    }
    return DEMO_PROJECT;
  },

  restoreProject(id: string): Project {
    const projects = getStored<Project[]>(STORAGE_KEY_PROJECTS, [DEMO_PROJECT]);
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        is_archived: false,
        status: 'active',
        archived_at: undefined,
        updated_at: new Date().toISOString(),
      };
      setStored(STORAGE_KEY_PROJECTS, projects);
      return projects[idx];
    }
    return DEMO_PROJECT;
  },

  // ------------------------------------------------------------------
  // Scenarios
  // ------------------------------------------------------------------
  getScenarios(projectId: string): Scenario[] {
    const scenarios = getStored<Scenario[]>(STORAGE_KEY_SCENARIOS, [DEMO_SCENARIO]);
    const filtered = scenarios.filter(s => s.project_id === projectId || (projectId === 'demo-proj-1' && s.id === 'demo-scen-1'));
    return filtered.length > 0 ? filtered : [DEMO_SCENARIO];
  },

  createScenario(projectId: string, data: ScenarioCreateInput): Scenario {
    const scenarios = getStored<Scenario[]>(STORAGE_KEY_SCENARIOS, [DEMO_SCENARIO]);
    const newScenId = `scen-${Date.now()}`;
    const newScen: Scenario = {
      id: newScenId,
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

    // Initialize clean scenario state
    const cleanLand: LandInput = {
      id: `land-${Date.now()}`,
      scenario_id: newScenId,
      purchase_price: 0,
      deposit_amount: 0,
      deposit_due_date: null,
      contract_date: null,
      settlement_date: null,
      site_area: 0,
      site_area_unit: 'm²',
      current_zoning: '',
      existing_improvements: '',
      planning_notes: '',
      development_potential_notes: '',
      acquisition_costs: [
        { id: `ac-${Date.now()}-1`, land_id: `land-${Date.now()}`, category: 'stamp_duty', name: 'Stamp / Transfer Duty', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-${Date.now()}-2`, land_id: `land-${Date.now()}`, category: 'legal_fees', name: 'Legal & Conveyancing', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-${Date.now()}-3`, land_id: `land-${Date.now()}`, category: 'due_diligence', name: 'Due Diligence & Site Tests', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      calculations: { purchase_price: 0, deposit_amount: 0, total_acquisition_costs: 0, total_land_acquisition: 0, remaining_purchase_amount: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStored(`feaspro_land_${newScenId}`, cleanLand);
    setStored(`feaspro_costs_${newScenId}`, []);
    setStored(`feaspro_sales_${newScenId}`, []);

    return newScen;
  },

  deleteScenario(scenarioId: string): void {
    const scenarios = getStored<Scenario[]>(STORAGE_KEY_SCENARIOS, [DEMO_SCENARIO]);
    const remaining = scenarios.filter(s => s.id !== scenarioId);
    setStored(STORAGE_KEY_SCENARIOS, remaining);
  },

  // ------------------------------------------------------------------
  // Land & Acquisition
  // ------------------------------------------------------------------
  getLand(_projectId: string, scenarioId: string): LandInput {
    const stored = getStored<LandInput | null>(`feaspro_land_${scenarioId}`, null);
    if (stored) return stored;

    if (scenarioId === 'demo-scen-1') {
      return DEMO_LAND;
    }

    // Return clean starting state for any user scenario
    const clean: LandInput = {
      id: `land-${Date.now()}`,
      scenario_id: scenarioId,
      purchase_price: 0,
      deposit_amount: 0,
      deposit_due_date: null,
      contract_date: null,
      settlement_date: null,
      site_area: 0,
      site_area_unit: 'm²',
      current_zoning: '',
      existing_improvements: '',
      planning_notes: '',
      development_potential_notes: '',
      acquisition_costs: [
        { id: `ac-1`, land_id: `land-${scenarioId}`, category: 'stamp_duty', name: 'Stamp / Transfer Duty', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-2`, land_id: `land-${scenarioId}`, category: 'legal_fees', name: 'Legal & Conveyancing', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: `ac-3`, land_id: `land-${scenarioId}`, category: 'due_diligence', name: 'Due Diligence & Site Tests', amount: 0, notes: '', date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      calculations: {
        purchase_price: 0,
        deposit_amount: 0,
        total_acquisition_costs: 0,
        total_land_acquisition: 0,
        remaining_purchase_amount: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStored(`feaspro_land_${scenarioId}`, clean);
    return clean;
  },

  updateLand(_projectId: string, scenarioId: string, data: LandInputUpdate): LandInput {
    const current = this.getLand(_projectId, scenarioId);
    const purchase = data.purchase_price !== undefined ? Number(data.purchase_price) : Number(current.purchase_price || 0);
    const deposit = data.deposit_amount !== undefined ? Number(data.deposit_amount) : Number(current.deposit_amount || 0);

    let costs: AcquisitionCostItem[] = current.acquisition_costs || [];
    if (data.acquisition_costs) {
      costs = data.acquisition_costs.map((c, idx) => ({
        id: `ac-${idx + 1}`,
        land_id: current.id,
        category: c.category,
        name: c.name,
        amount: Number(c.amount || 0),
        notes: c.notes || null,
        date: c.date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    const totalAcqCosts = costs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalLandAcq = purchase + totalAcqCosts;
    const remaining = Math.max(0, purchase - deposit);

    const updated: LandInput = {
      ...current,
      ...data,
      purchase_price: purchase,
      deposit_amount: deposit,
      acquisition_costs: costs,
      calculations: {
        purchase_price: purchase,
        deposit_amount: deposit,
        total_acquisition_costs: totalAcqCosts,
        total_land_acquisition: totalLandAcq,
        remaining_purchase_amount: remaining,
      },
      updated_at: new Date().toISOString(),
    };

    setStored(`feaspro_land_${scenarioId}`, updated);
    return updated;
  },

  addAcquisitionCostItem(projectId: string, scenarioId: string, item: Omit<AcquisitionCostItem, 'id' | 'created_at' | 'updated_at' | 'land_id'>): LandInput {
    const current = this.getLand(projectId, scenarioId);
    const newItem: AcquisitionCostItem = {
      ...item,
      id: `ac-${Date.now()}`,
      land_id: current.id,
      amount: Number(item.amount || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedCosts = [...(current.acquisition_costs || []), newItem];
    return this.updateLand(projectId, scenarioId, { acquisition_costs: updatedCosts });
  },

  updateAcquisitionCostItem(projectId: string, scenarioId: string, itemId: string, item: Partial<AcquisitionCostItem>): LandInput {
    const current = this.getLand(projectId, scenarioId);
    const updatedCosts = (current.acquisition_costs || []).map(c => c.id === itemId ? { ...c, ...item, amount: item.amount !== undefined ? Number(item.amount) : c.amount } : c);
    return this.updateLand(projectId, scenarioId, { acquisition_costs: updatedCosts });
  },

  deleteAcquisitionCostItem(projectId: string, scenarioId: string, itemId: string): void {
    const current = this.getLand(projectId, scenarioId);
    const updatedCosts = (current.acquisition_costs || []).filter(c => c.id !== itemId);
    this.updateLand(projectId, scenarioId, { acquisition_costs: updatedCosts });
  },

  // ------------------------------------------------------------------
  // Development Costs
  // ------------------------------------------------------------------
  getCosts(projectId: string, scenarioId: string): CostSummaryResponse {
    const stored = getStored<CostItem[] | null>(`feaspro_costs_${scenarioId}`, null);
    const items = stored !== null ? stored : (scenarioId === 'demo-scen-1' ? DEMO_COSTS : []);
    const land = this.getLand(projectId, scenarioId);
    const landTotal = Number(land.calculations?.total_land_acquisition || 0);

    let construction = 0;
    let consultants = 0;
    let statutory = 0;
    let contingency = 0;
    let holding = 0;
    let other = 0;
    let itc = 0;

    for (const item of items) {
      const amt = Number(item.amount || 0);
      if (item.category === 'construction') construction += amt;
      else if (item.category === 'consultants') consultants += amt;
      else if (item.category === 'statutory') statutory += amt;
      else if (item.category === 'contingency') contingency += amt;
      else if (item.category === 'holding') holding += amt;
      else other += amt;

      if (item.gst_applicable) {
        itc += amt / 11;
      }
    }

    const devCostExLand = construction + consultants + statutory + contingency + holding + other;
    const totalProjectCost = devCostExLand + landTotal;

    const summary: CostCalculationSummary = {
      construction_subtotal: construction,
      consultants_subtotal: consultants,
      statutory_subtotal: statutory,
      contingency_subtotal: contingency,
      holding_subtotal: holding,
      other_subtotal: other,
      total_input_tax_credits: itc,
      total_development_cost_ex_land: devCostExLand,
      land_acquisition_total: landTotal,
      total_project_cost: totalProjectCost,
    };

    return { summary, items };
  },

  updateCosts(projectId: string, scenarioId: string, items: CostItem[]): CostSummaryResponse {
    const formatted = items.map((item, idx) => ({
      ...item,
      id: item.id || `c-${idx + 1}-${Date.now()}`,
      scenario_id: scenarioId,
      amount: Number(item.amount || 0),
      quantity: item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : null,
      rate: item.rate !== undefined && item.rate !== null ? Number(item.rate) : null,
    }));
    setStored(`feaspro_costs_${scenarioId}`, formatted);
    return this.getCosts(projectId, scenarioId);
  },

  // ------------------------------------------------------------------
  // Sales & Revenue
  // ------------------------------------------------------------------
  getSales(_projectId: string, scenarioId: string): SalesSummaryResponse {
    const stored = getStored<SalesProductItem[] | null>(`feaspro_sales_${scenarioId}`, null);
    const items = stored !== null ? stored : (scenarioId === 'demo-scen-1' ? DEMO_SALES : []);

    let totalUnits = 0;
    let totalInternalArea = 0;
    let totalExternalArea = 0;
    let grv = 0;
    let commissions = 0;
    let marketing = 0;

    for (const item of items) {
      const units = Number(item.total_units || 0);
      const revenue = Number(item.total_revenue || 0);
      const commPct = Number(item.sales_commission_pct || 0);
      const mktPct = Number(item.marketing_cost_pct || 0);

      totalUnits += units;
      totalInternalArea += Number(item.avg_internal_area || 0) * units;
      totalExternalArea += Number(item.avg_external_area || 0) * units;
      grv += revenue;
      commissions += (revenue * commPct) / 100;
      marketing += (revenue * mktPct) / 100;
    }

    const sellingCosts = commissions + marketing;
    const nrv = Math.max(0, grv - sellingCosts);
    const avgPrice = totalUnits > 0 ? grv / totalUnits : 0;
    const avgRateSqm = totalInternalArea > 0 ? grv / totalInternalArea : 0;

    const summary: SalesCalculationSummary = {
      total_units: totalUnits,
      total_internal_area: totalInternalArea,
      total_external_area: totalExternalArea,
      gross_realisation_value: grv,
      total_commissions: commissions,
      total_marketing: marketing,
      total_selling_costs: sellingCosts,
      net_realisation_value: nrv,
      avg_price_per_unit: avgPrice,
      avg_rate_sqm: avgRateSqm,
    };

    return { summary, items };
  },

  updateSales(_projectId: string, scenarioId: string, items: SalesProductItem[]): SalesSummaryResponse {
    const formatted = items.map((item, idx) => ({
      ...item,
      id: item.id || `s-${idx + 1}-${Date.now()}`,
      scenario_id: scenarioId,
      total_units: Number(item.total_units || 0),
      avg_internal_area: Number(item.avg_internal_area || 0),
      avg_external_area: Number(item.avg_external_area || 0),
      unit_sale_price: Number(item.unit_sale_price || 0),
      total_revenue: Number(item.total_revenue || 0),
      sales_commission_pct: Number(item.sales_commission_pct || 0),
      marketing_cost_pct: Number(item.marketing_cost_pct || 0),
    }));
    setStored(`feaspro_sales_${scenarioId}`, formatted);
    return this.getSales(_projectId, scenarioId);
  },

  // ------------------------------------------------------------------
  // Funding & Capital Stack
  // ------------------------------------------------------------------
  getFunding(projectId: string, scenarioId: string): FundingSummaryResponse {
    const stored = getStored<FundingAssumption | null>(`feaspro_funding_${scenarioId}`, null);
    const assumption: FundingAssumption = stored || {
      senior_debt_enabled: true,
      senior_max_ltc_pct: 70,
      senior_max_lvr_pct: 65,
      senior_interest_rate_pct: 8.5,
      senior_line_fee_pct: 1.5,
      senior_establishment_fee_pct: 1.0,
      mezzanine_enabled: false,
      mezzanine_amount: 0,
      mezzanine_interest_rate_pct: 12.5,
    };

    const costs = this.getCosts(projectId, scenarioId);
    const sales = this.getSales(projectId, scenarioId);
    const tdc = Number(costs.summary.total_project_cost || 0);
    const nrv = Number(sales.summary.net_realisation_value || 0);

    const ltcCap = (tdc * Number(assumption.senior_max_ltc_pct || 70)) / 100;
    const lvrCap = (nrv * Number(assumption.senior_max_lvr_pct || 65)) / 100;
    const facilityLimit = Math.min(ltcCap, lvrCap > 0 ? lvrCap : ltcCap);
    const mezzAmount = assumption.mezzanine_enabled ? Number(assumption.mezzanine_amount || 0) : 0;
    const totalDebt = facilityLimit + mezzAmount;
    const requiredEquity = Math.max(0, tdc - totalDebt);

    const seniorEst = (facilityLimit * Number(assumption.senior_establishment_fee_pct || 1.0)) / 100;
    const seniorInterest = (facilityLimit * Number(assumption.senior_interest_rate_pct || 8.5) * 1.5) / 100;
    const totalFinance = seniorEst + seniorInterest;
    const netProfit = Math.max(0, nrv - tdc);
    const netProfitAfterFinance = netProfit - totalFinance;
    const roe = requiredEquity > 0 ? (netProfitAfterFinance / requiredEquity) * 100 : 0;

    const summary: FundingCalculationSummary = {
      senior_debt_facility_limit: facilityLimit,
      senior_ltc_cap: ltcCap,
      senior_lvr_cap: lvrCap,
      constraining_factor: ltcCap < lvrCap ? 'LTC Limit' : 'LVR Cap',
      mezzanine_facility_limit: mezzAmount,
      total_debt_facility: totalDebt,
      required_developer_equity: requiredEquity,
      debt_percentage: tdc > 0 ? (totalDebt / tdc) * 100 : 0,
      equity_percentage: tdc > 0 ? (requiredEquity / tdc) * 100 : 0,
      senior_establishment_fee: seniorEst,
      senior_interest_cost: seniorInterest,
      senior_line_fee: 0,
      mezzanine_interest_cost: 0,
      total_estimated_finance_cost: totalFinance,
      net_profit_after_finance: netProfitAfterFinance,
      return_on_equity_pct: roe,
    };

    return { assumption, summary };
  },

  updateFunding(projectId: string, scenarioId: string, data: Partial<FundingAssumption>): FundingSummaryResponse {
    const current = this.getFunding(projectId, scenarioId);
    const updated: FundingAssumption = { ...current.assumption, ...data };
    setStored(`feaspro_funding_${scenarioId}`, updated);
    return this.getFunding(projectId, scenarioId);
  },

  getTranches(projectId: string, scenarioId: string): FundingTranche[] {
    const stored = getStored<FundingTranche[] | null>(`feaspro_tranches_${scenarioId}`, null);
    if (stored) return stored;
    const funding = this.getFunding(projectId, scenarioId);
    const seniorLimit = Number(funding.summary.senior_debt_facility_limit || 0);
    const equity = Number(funding.summary.required_developer_equity || 0);
    return [
      { id: 'tr-1', scenario_id: scenarioId, tranche_type: 'senior_debt', name: 'Senior Construction Facility', priority_order: 1, amount: seniorLimit, hurdle_rate_pct: 8.5, investor_split_pct: 100, developer_promote_pct: 0 },
      { id: 'tr-2', scenario_id: scenarioId, tranche_type: 'ordinary_equity', name: 'Developer / Sponsor Equity', priority_order: 2, amount: equity, hurdle_rate_pct: 8.0, investor_split_pct: 20, developer_promote_pct: 80 },
    ];
  },

  getWaterfall(projectId: string, scenarioId: string): WaterfallResponse {
    const tranches = this.getTranches(projectId, scenarioId);
    const funding = this.getFunding(projectId, scenarioId);
    const sales = this.getSales(projectId, scenarioId);
    const grv = Number(sales.summary.gross_realisation_value || 0);
    const profit = Number(funding.summary.net_profit_after_finance || 0);

    return {
      tranches,
      net_profit_after_finance: profit,
      waterfall: {
        available_proceeds: grv,
        total_distributed: grv,
        remaining_proceeds: 0,
        reconciliation_difference: 0,
        tier1_return_of_capital: tranches.map(t => ({
          tranche_id: t.id || 'tr-1',
          tranche_name: t.name,
          tranche_type: t.tranche_type,
          priority_order: t.priority_order,
          capital_returned: Number(t.amount || 0),
        })),
        tier2_preferred_return: tranches.filter(t => t.tranche_type.includes('equity')).map(t => ({
          tranche_id: t.id || 'tr-eq',
          tranche_name: t.name,
          tranche_type: t.tranche_type,
          priority_order: t.priority_order,
          preferred_return_target: (Number(t.amount || 0) * Number(t.hurdle_rate_pct || 8)) / 100,
          preferred_return_paid: (Number(t.amount || 0) * Number(t.hurdle_rate_pct || 8)) / 100,
          shortfall: 0,
        })),
        tier3_residual_split: tranches.filter(t => t.tranche_type.includes('equity')).map(t => ({
          tranche_id: t.id || 'tr-eq',
          tranche_name: t.name,
          tranche_type: t.tranche_type,
          priority_order: t.priority_order,
          investor_split_pct: Number(t.investor_split_pct || 50),
          developer_promote_pct: Number(t.developer_promote_pct || 50),
          investor_distribution: (profit * Number(t.investor_split_pct || 50)) / 100,
          developer_promote_distribution: (profit * Number(t.developer_promote_pct || 50)) / 100,
          total_distribution: profit,
        })),
      }
    };
  },

  // ------------------------------------------------------------------
  // Project Schedule
  // ------------------------------------------------------------------
  getSchedule(_projectId: string, scenarioId: string): ScheduleSummaryResponse {
    const stored = getStored<ScheduleMilestone[] | null>(`feaspro_schedule_${scenarioId}`, null);
    if (stored) {
      return { project_total_months: 24, construction_duration_months: 14, milestones: stored };
    }
    const defaultMilestones: ScheduleMilestone[] = [
      { id: 'm-1', scenario_id: scenarioId, stage: 'acquisition', name: 'Site Acquisition & Settlement', start_month: 1, duration_months: 3, end_month: 3, status: 'completed' },
      { id: 'm-2', scenario_id: scenarioId, stage: 'planning_da', name: 'Town Planning & Permits', start_month: 2, duration_months: 5, end_month: 6, status: 'in_progress' },
      { id: 'm-3', scenario_id: scenarioId, stage: 'presales', name: 'Pre-Sales Campaign', start_month: 4, duration_months: 10, end_month: 14, status: 'planned' },
      { id: 'm-4', scenario_id: scenarioId, stage: 'construction', name: 'Main Construction & Civil Works', start_month: 7, duration_months: 14, end_month: 20, status: 'planned' },
      { id: 'm-5', scenario_id: scenarioId, stage: 'settlement', name: 'Purchaser Settlements', start_month: 21, duration_months: 4, end_month: 24, status: 'planned' },
    ];
    return {
      project_total_months: 24,
      construction_duration_months: 14,
      milestones: defaultMilestones,
    };
  },

  updateSchedule(_projectId: string, scenarioId: string, milestones: ScheduleMilestone[]): ScheduleSummaryResponse {
    setStored(`feaspro_schedule_${scenarioId}`, milestones);
    return this.getSchedule(_projectId, scenarioId);
  },

  // ------------------------------------------------------------------
  // Cash Flow
  // ------------------------------------------------------------------
  getCashFlow(projectId: string, scenarioId: string, durationMonths = 24): CashFlowSummary {
    const costs = this.getCosts(projectId, scenarioId);
    const sales = this.getSales(projectId, scenarioId);
    const land = this.getLand(projectId, scenarioId);

    const landCost = Number(land.calculations?.total_land_acquisition || 0);
    const buildCost = Number(costs.summary.construction_subtotal || 0);
    const devCostExBuild = Number(costs.summary.total_development_cost_ex_land || 0) - buildCost;
    const grv = Number(sales.summary.gross_realisation_value || 0);

    const totalCosts = Number(costs.summary.total_project_cost || 0);
    const netProfit = grv - totalCosts;

    let runningCum = 0;
    const monthly_data = Array.from({ length: durationMonths }, (_, idx) => {
      const m = idx + 1;
      const l = m === 1 ? landCost : 0;
      const c = (m >= 6 && m <= durationMonths - 4 && buildCost > 0) ? buildCost / (durationMonths - 9) : 0;
      const other = devCostExBuild > 0 ? devCostExBuild / durationMonths : 0;
      const rev = (m >= durationMonths - 2 && grv > 0) ? grv / 3 : 0;
      const outflow = l + c + other;
      const net = rev - outflow;
      runningCum += net;
      return {
        month: m,
        period_label: `M${m}`,
        land_cost: l,
        construction_cost: c,
        total_outflow: outflow,
        revenue: rev,
        net_cashflow: net,
        cumulative_cashflow: runningCum,
      };
    });

    return {
      project_duration_months: durationMonths,
      total_revenue: grv,
      total_costs: totalCosts,
      net_profit: netProfit,
      project_irr: totalCosts > 0 && grv > 0 ? 22.4 : 0,
      peak_debt: totalCosts * 0.65,
      monthly_data,
    };
  },

  // ------------------------------------------------------------------
  // Full Feasibility & Executive Reports
  // ------------------------------------------------------------------
  getFullFeasibility(projectId: string, scenarioId: string): FullFeasibilityResponse {
    const land = this.getLand(projectId, scenarioId);
    const costs = this.getCosts(projectId, scenarioId);
    const sales = this.getSales(projectId, scenarioId);
    const funding = this.getFunding(projectId, scenarioId);

    const grv = Number(sales.summary.gross_realisation_value || 0);
    const nrv = Number(sales.summary.net_realisation_value || 0);
    const tdc = Number(costs.summary.total_project_cost || 0);
    const devExLand = Number(costs.summary.total_development_cost_ex_land || 0);
    const landTotal = Number(land.calculations?.total_land_acquisition || 0);
    const profit = Math.max(0, nrv - tdc);
    const marginOnCost = tdc > 0 ? (profit / tdc) * 100 : 0;
    const marginOnGrv = grv > 0 ? (profit / grv) * 100 : 0;
    const equity = Number(funding.summary.required_developer_equity || 0);
    const profitAfterFinance = Number(funding.summary.net_profit_after_finance || profit);
    const roe = equity > 0 ? (profitAfterFinance / equity) * 100 : 0;

    return {
      project_id: projectId,
      scenario_id: scenarioId,
      scenario_name: 'Baseline Feasibility',
      stamp_duty: {
        base_stamp_duty: Number(land.calculations?.total_acquisition_costs || 0),
        foreign_surcharge: 0,
        total_stamp_duty: Number(land.calculations?.total_acquisition_costs || 0),
        effective_rate_pct: 5.5,
      },
      gst: {
        gst_payable: grv > 0 ? grv / 11 : 0,
        net_revenue_ex_gst: grv > 0 ? grv * (10 / 11) : 0,
        margin_scheme_applied: true,
      },
      valuation_rlv: {
        residual_land_value_cost_target: Math.max(0, (nrv / 1.2) - devExLand),
        max_land_acquisition_cost_target: Math.max(0, (nrv / 1.2) - devExLand),
        target_margin_on_cost_pct: 20.0,
        residual_land_value_grv_target: Math.max(0, grv * 0.8 - devExLand),
        max_land_acquisition_grv_target: Math.max(0, grv * 0.8 - devExLand),
        target_margin_on_grv_pct: 18.5,
        margin_sensitivity: [
          { target_margin_pct: 15.0, max_land_purchase_price: Math.max(0, (nrv / 1.15) - devExLand), max_total_land_acquisition: Math.max(0, (nrv / 1.15) - devExLand) },
          { target_margin_pct: 20.0, max_land_purchase_price: Math.max(0, (nrv / 1.20) - devExLand), max_total_land_acquisition: Math.max(0, (nrv / 1.20) - devExLand) },
          { target_margin_pct: 25.0, max_land_purchase_price: Math.max(0, (nrv / 1.25) - devExLand), max_total_land_acquisition: Math.max(0, (nrv / 1.25) - devExLand) },
        ],
      },
      wacc_pct: 8.5,
      metrics: {
        gross_realisation_value: grv,
        net_realisation_value: nrv,
        total_project_cost: tdc,
        total_development_cost_ex_land: devExLand,
        land_acquisition_total: landTotal,
        net_profit: profit,
        margin_on_cost_pct: marginOnCost,
        margin_on_grv_pct: marginOnGrv,
        net_profit_after_finance: profitAfterFinance,
        return_on_equity_pct: roe,
        project_irr_pct: tdc > 0 && grv > 0 ? 22.4 : 0,
        net_present_value: Math.max(0, profit * 0.7),
        discount_rate_pct: 10.0,
      }
    };
  },

  getExecutiveReport(projectId: string, scenarioId: string): ExecutiveReportResponse {
    const proj = this.getProject(projectId);
    const land = this.getLand(projectId, scenarioId);
    const costs = this.getCosts(projectId, scenarioId);
    const sales = this.getSales(projectId, scenarioId);
    const funding = this.getFunding(projectId, scenarioId);

    const grv = Number(sales.summary.gross_realisation_value || 0);
    const nrv = Number(sales.summary.net_realisation_value || 0);
    const tdc = Number(costs.summary.total_project_cost || 0);
    const devExLand = Number(costs.summary.total_development_cost_ex_land || 0);
    const landTotal = Number(land.calculations?.total_land_acquisition || 0);
    const financeCost = Number(funding.summary.total_estimated_finance_cost || 0);
    const profit = Math.max(0, nrv - tdc);
    const marginOnCost = tdc > 0 ? (profit / tdc) * 100 : 0;
    const marginOnGrv = grv > 0 ? (profit / grv) * 100 : 0;
    const equity = Number(funding.summary.required_developer_equity || 0);
    const roe = equity > 0 ? ((profit - financeCost) / equity) * 100 : 0;

    return {
      project_meta: {
        project_id: projectId,
        project_name: proj.name,
        organization_name: 'Apex Property Group',
        organization_slug: 'apex-property-group',
        location: proj.location || 'Melbourne, VIC',
        development_type: proj.development_type || 'multi_unit_residential',
        status: proj.status || 'active',
        start_date: proj.start_date ?? undefined,
        target_completion_date: proj.target_completion_date ?? undefined,
        scenario_id: scenarioId,
        scenario_name: 'Baseline Feasibility',
        is_baseline: true,
        report_generated_at: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
        generated_by_user: 'Development Manager',
      },
      financial_kpis: {
        gross_realisation_value: grv,
        net_realisation_value: nrv,
        land_acquisition_cost: landTotal,
        development_cost_ex_land: devExLand,
        total_project_cost: tdc,
        total_finance_cost: financeCost,
        net_profit: profit,
        dev_margin_on_cost_pct: marginOnCost,
        margin_on_grv_pct: marginOnGrv,
        return_on_equity_pct: roe,
        equity_multiple: equity > 0 ? ((profit + equity) / equity) : 1.0,
        project_irr_pct: tdc > 0 && grv > 0 ? 22.4 : 0,
        net_present_value: Math.max(0, profit * 0.7),
        discount_rate_pct: 10.0,
        residual_land_value: Math.max(0, (nrv / 1.2) - devExLand),
        wacc_pct: 8.5,
      },
      capital_stack: {
        senior_debt_facility: Number(funding.summary.senior_debt_facility_limit || 0),
        senior_max_ltc_pct: 70.0,
        senior_max_lvr_pct: 65.0,
        senior_interest_rate_pct: 8.5,
        senior_capitalized_interest: financeCost,
        senior_fees: 0,
        mezzanine_enabled: false,
        mezzanine_facility: 0,
        mezzanine_interest_rate_pct: 12.5,
        mezzanine_capitalized_interest: 0,
        required_equity: equity,
        total_debt_facility: Number(funding.summary.total_debt_facility || 0),
        peak_debt_exposure: Number(funding.summary.total_debt_facility || 0),
        loan_to_cost_pct: Number(funding.summary.debt_percentage || 0),
        loan_to_value_pct: grv > 0 ? (Number(funding.summary.total_debt_facility || 0) / grv) * 100 : 0,
        equity_ratio_pct: Number(funding.summary.equity_percentage || 0),
      },
      cost_breakdown: [
        {
          category: 'land',
          display_name: 'Land Acquisition & Stamp Duty',
          total_amount: landTotal,
          percentage_of_tdc: tdc > 0 ? (landTotal / tdc) * 100 : 0,
          item_count: (land.acquisition_costs || []).length + 1,
          items: [
            { name: 'Contract Purchase Price', amount: Number(land.purchase_price || 0) },
            ...(land.acquisition_costs || []).map(c => ({ name: c.name, amount: Number(c.amount || 0) }))
          ]
        },
        {
          category: 'construction',
          display_name: 'Direct Construction Works',
          total_amount: Number(costs.summary.construction_subtotal || 0),
          percentage_of_tdc: tdc > 0 ? (Number(costs.summary.construction_subtotal || 0) / tdc) * 100 : 0,
          item_count: costs.items.filter(i => i.category === 'construction').length,
          items: costs.items.filter(i => i.category === 'construction').map(i => ({ name: i.name, amount: Number(i.amount || 0) }))
        },
        {
          category: 'professional_fees',
          display_name: 'Design & Professional Fees',
          total_amount: Number(costs.summary.consultants_subtotal || 0),
          percentage_of_tdc: tdc > 0 ? (Number(costs.summary.consultants_subtotal || 0) / tdc) * 100 : 0,
          item_count: costs.items.filter(i => i.category === 'consultants').length,
          items: costs.items.filter(i => i.category === 'consultants').map(i => ({ name: i.name, amount: Number(i.amount || 0) }))
        },
      ],
      sales_mix: sales.items.map(s => ({
        id: s.id || 'sp-1',
        name: s.name,
        total_units: Number(s.total_units || 0),
        avg_internal_area: Number(s.avg_internal_area || 0),
        avg_external_area: Number(s.avg_external_area || 0),
        total_area_sqm: Number(s.avg_internal_area || 0) * Number(s.total_units || 0),
        price_per_sqm: Number(s.price_per_sqm || 0),
        unit_sale_price: Number(s.unit_sale_price || 0),
        total_revenue: Number(s.total_revenue || 0),
        percentage_of_revenue: grv > 0 ? (Number(s.total_revenue || 0) / grv) * 100 : 0,
        sales_commission_pct: Number(s.sales_commission_pct || 0),
        marketing_cost_pct: Number(s.marketing_cost_pct || 0),
        settlement_month: s.settlement_month || 24,
      })),
      total_units: Number(sales.summary.total_units || 0),
      total_gfa_sqm: Number(sales.summary.total_internal_area || 0),
      avg_price_per_sqm: Number(sales.summary.avg_rate_sqm || 0),
      cashflow_summary: [],
      milestones: [],
      executive_summary_notes: [
        `Development Margin on Cost: ${marginOnCost.toFixed(1)}%`,
        `Gross Realisation Value: $${grv.toLocaleString()}`,
        `Total Development Cost: $${tdc.toLocaleString()}`,
        `Net Feasibility Profit: $${profit.toLocaleString()}`,
      ],
      stamp_duty_details: { total_stamp_duty: Number(land.calculations?.total_acquisition_costs || 0), effective_rate_pct: 5.5 },
      gst_details: { gst_payable: grv / 11, margin_scheme_applied: true },
      valuation_rlv: { residual_land_value_cost_target: Math.max(0, (nrv / 1.2) - devExLand), target_margin_on_cost_pct: 20.0 },
    };
  },

  // ------------------------------------------------------------------
  // Sensitivity Analysis
  // ------------------------------------------------------------------
  getSensitivityAnalysis(projectId: string, scenarioId: string): SensitivityDashboardResponse {
    const sales = this.getSales(projectId, scenarioId);
    const costs = this.getCosts(projectId, scenarioId);
    const land = this.getLand(projectId, scenarioId);

    const baseGRV = Number(sales.summary.gross_realisation_value || 0);
    const baseNRV = Number(sales.summary.net_realisation_value || 0);
    const baseCost = Number(costs.summary.total_project_cost || 0);

    const pSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    const cSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

    const rows = cSteps.map(cShift => {
      const shiftedCost = baseCost * (1 + cShift / 100);
      const cells = pSteps.map(pShift => {
        const shiftedNRV = baseNRV * (1 + pShift / 100);
        const shiftedGRV = baseGRV * (1 + pShift / 100);
        const profit = shiftedNRV - shiftedCost;
        const margin = shiftedCost > 0 ? (profit / shiftedCost) * 100 : 0;
        const irr = Math.max(-10, Math.min(60, 20 + (pShift * 0.8) - (cShift * 0.6)));
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
          margin_on_grv_pct: shiftedGRV > 0 ? ((profit / shiftedGRV) * 100).toFixed(2) : '0',
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
      scenario_name: 'Baseline Feasibility',
      is_baseline: true,
      baseline_kpis: {
        gross_realisation_value: baseGRV,
        net_realisation_value: baseNRV,
        total_project_cost: baseCost,
        land_cost: Number(land.calculations?.total_land_acquisition || 0),
        construction_cost: Number(costs.summary.construction_subtotal || 0),
        finance_cost: baseCost * 0.06,
        net_profit: baseNRV - baseCost,
        dev_margin_on_cost_pct: baseCost > 0 ? ((baseNRV - baseCost) / baseCost) * 100 : 0,
        project_irr_pct: baseCost > 0 && baseGRV > 0 ? 22.4 : 0,
        equity_amount: baseCost * 0.3,
        interest_rate_pct: 8.5,
        duration_months: 24,
      },
      matrix_2d: { price_steps: pSteps, cost_steps: cSteps, rows },
      interest_rate_matrix: [-3, -2, -1, 0, 1, 2, 3].map(delta => ({
        rate_delta_pct: delta,
        interest_rate_pct: 8.5 + delta,
        total_finance_cost: baseCost * (0.06 + delta * 0.008),
        finance_cost_increase: baseCost * delta * 0.008,
        net_profit_after_finance: (baseNRV - baseCost) - (baseCost * delta * 0.008),
        dev_margin_on_cost_pct: baseCost > 0 ? (((baseNRV - baseCost) / baseCost) * 100) : 0,
        return_on_equity_pct: 65.0,
        is_baseline: delta === 0,
      })),
      delay_stress_test: [0, 1, 3, 6, 9, 12].map(delay => ({
        delay_months: delay,
        total_duration_months: 24 + delay,
        additional_holding_cost: delay * 15000,
        additional_interest_cost: delay * 45000,
        total_delay_cost: delay * 60000,
        adjusted_project_cost: baseCost + delay * 60000,
        adjusted_net_profit: (baseNRV - baseCost) - delay * 60000,
        dev_margin_on_cost_pct: baseCost > 0 ? (((baseNRV - baseCost - delay * 60000) / (baseCost + delay * 60000)) * 100) : 0,
        project_irr_pct: 22.4 - delay * 0.8,
        is_baseline: delay === 0,
      })),
      breakeven: {
        current_grv: baseGRV,
        breakeven_grv: baseCost,
        revenue_safety_buffer_dollar: Math.max(0, baseNRV - baseCost),
        revenue_safety_buffer_pct: baseGRV > 0 ? (Math.max(0, baseNRV - baseCost) / baseGRV) * 100 : 0,
        current_rate_per_sqm: Number(sales.summary.avg_rate_sqm || 0),
        breakeven_rate_per_sqm: Number(sales.summary.avg_rate_sqm || 0) * 0.8,
        current_total_cost: baseCost,
        max_tolerable_cost: baseNRV,
        max_cost_overrun_dollar: Math.max(0, baseNRV - baseCost),
        max_cost_overrun_pct: baseCost > 0 ? (Math.max(0, baseNRV - baseCost) / baseCost) * 100 : 0,
        current_land_cost: Number(land.calculations?.total_land_acquisition || 0),
        max_tolerable_land_price: Math.max(0, (baseNRV / 1.2) - Number(costs.summary.total_development_cost_ex_land || 0)),
      },
      tornado_ranking: [
        { rank: 1, driver: 'Sales Realisation (GRV)', category: 'revenue', low_shock_profit: baseGRV * 0.8 - baseCost, high_shock_profit: baseGRV * 1.2 - baseCost, profit_swing: baseGRV * 0.4, elasticity_pct: 110 },
        { rank: 2, driver: 'Direct Construction Costs', category: 'costs', low_shock_profit: baseNRV - baseCost * 1.15, high_shock_profit: baseNRV - baseCost * 0.85, profit_swing: baseCost * 0.3, elasticity_pct: 45 },
      ],
    };
  },

  simulateSensitivity(projectId: string, scenarioId: string, payload: SensitivitySimulateInput): SensitivitySimulateResponse {
    const sales = this.getSales(projectId, scenarioId);
    const costs = this.getCosts(projectId, scenarioId);
    const baseGRV = Number(sales.summary.gross_realisation_value || 0);
    const baseNRV = Number(sales.summary.net_realisation_value || 0);
    const baseCost = Number(costs.summary.total_project_cost || 0);

    const pMult = 1 + payload.price_shift_pct / 100;
    const cMult = 1 + payload.cost_shift_pct / 100;
    const simGRV = baseGRV * pMult;
    const simNRV = baseNRV * pMult;
    const simBaseCost = baseCost * cMult;

    const extraDelay = payload.delay_months;
    const extraHolding = 25000 * extraDelay;
    const simTotalCost = simBaseCost + extraHolding;
    const simProfit = simNRV - simTotalCost;
    const simMargin = simTotalCost > 0 ? (simProfit / simTotalCost) * 100 : 0;

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
      simulated_finance_cost: simTotalCost * 0.06,
      simulated_net_profit: simProfit,
      simulated_margin_on_cost_pct: simMargin.toFixed(2),
      simulated_project_irr_pct: 22.4,
      simulated_return_on_equity_pct: (simMargin * 2.5).toFixed(2),
      simulated_residual_land_value: Math.max(0, (simNRV / 1.2) - (simTotalCost * 0.7)),
      status,
    };
  },

  compareScenarios(scenarioIdsOrProjectId: string[] | string): ScenarioComparisonResponse {
    const projId = typeof scenarioIdsOrProjectId === 'string' ? scenarioIdsOrProjectId : 'demo-proj-1';
    const scenarios = this.getScenarios(projId);

    const compared = scenarios.map(s => {
      const land = this.getLand(projId, s.id);
      const costs = this.getCosts(projId, s.id);
      const sales = this.getSales(projId, s.id);
      const grv = Number(sales.summary.gross_realisation_value || 0);
      const nrv = Number(sales.summary.net_realisation_value || 0);
      const tdc = Number(costs.summary.total_project_cost || 0);
      const profit = Math.max(0, nrv - tdc);
      const marginOnCost = tdc > 0 ? (profit / tdc) * 100 : 0;
      const marginOnGrv = grv > 0 ? (profit / grv) * 100 : 0;

      return {
        scenario_id: s.id,
        name: s.name,
        is_baseline: s.is_baseline,
        status: s.status,
        total_units: Number(sales.summary.total_units || 0),
        total_internal_area: Number(sales.summary.total_internal_area || 0),
        gross_realisation_value: grv,
        net_realisation_value: nrv,
        land_acquisition_total: Number(land.calculations?.total_land_acquisition || 0),
        construction_subtotal: Number(costs.summary.construction_subtotal || 0),
        total_development_cost_ex_land: Number(costs.summary.total_development_cost_ex_land || 0),
        total_project_cost: tdc,
        net_profit: profit,
        margin_on_cost_pct: marginOnCost,
        margin_on_grv_pct: marginOnGrv,
        project_irr: tdc > 0 && grv > 0 ? 22.4 : 0,
        peak_debt: tdc * 0.65,
        required_developer_equity: tdc * 0.35,
        return_on_equity_pct: 65.0,
        duration_months: 24,
      };
    });

    return {
      project_id: projId,
      project_name: 'Development Scenarios',
      baseline_scenario_id: scenarios[0]?.id || 'demo-scen-1',
      scenarios: compared,
    };
  }
};
