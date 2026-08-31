import {
  Project,
  ProjectListItem,
  ProjectCreateInput,
  ProjectUpdateInput,
  Scenario,
  ScenarioCreateInput,
  User,
  AuthToken,
  RegisterInput,
  LandInput,
  LandInputUpdate,
  AcquisitionCostItem,
  CostItem,
  CostSummaryResponse,
  SalesProductItem,
  SalesSummaryResponse,
  CashFlowSummary,
  FundingAssumption,
  FundingSummaryResponse,
  FundingTranche,
  WaterfallResponse,
  ScheduleMilestone,
  ScheduleSummaryResponse,
  ScenarioComparisonResponse,
  FullFeasibilityResponse,
  ExecutiveReportResponse,
  SensitivityDashboardResponse,
  SensitivitySimulateInput,
  SensitivitySimulateResponse,
} from '../types';
import { localBackend } from './localBackend';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';
const TOKEN_KEY = 'feaspro_auth_token';

let unauthorizedHandler: (() => void) | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to store auth token:', err);
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Failed to remove auth token:', err);
  }
}

export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    let errorDetail = 'API request failed';
    try {
      const err = await response.json();
      if (err.detail) {
        if (typeof err.detail === 'string') {
          errorDetail = err.detail;
        } else if (Array.isArray(err.detail)) {
          errorDetail = err.detail.map((d: { msg: string }) => d.msg).join(', ');
        }
      }
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export const api = {
  // Projects
  async getProjects(params?: {
    search?: string;
    development_type?: string;
    status?: string;
    include_archived?: boolean;
  }): Promise<{ items: ProjectListItem[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.development_type) query.set('development_type', params.development_type);
      if (params?.status) query.set('status', params.status);
      if (params?.include_archived) query.set('include_archived', 'true');

      const qs = query.toString();
      return await fetchJson<{ items: ProjectListItem[]; total: number }>(
        `${API_BASE}/projects${qs ? `?${qs}` : ''}`
      );
    } catch {
      return localBackend.getProjects();
    }
  },

  async getProject(id: string): Promise<Project> {
    try {
      return await fetchJson<Project>(`${API_BASE}/projects/${id}`);
    } catch {
      return localBackend.getProject(id);
    }
  },

  async createProject(data: ProjectCreateInput): Promise<Project> {
    try {
      return await fetchJson<Project>(`${API_BASE}/projects`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      return localBackend.createProject(data);
    }
  },

  async updateProject(id: string, data: ProjectUpdateInput): Promise<Project> {
    try {
      return await fetchJson<Project>(`${API_BASE}/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch {
      return localBackend.updateProject(id, data);
    }
  },

  async archiveProject(id: string): Promise<Project> {
    try {
      return await fetchJson<Project>(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
      });
    } catch {
      return localBackend.archiveProject(id);
    }
  },

  async restoreProject(id: string): Promise<Project> {
    try {
      return await fetchJson<Project>(`${API_BASE}/projects/${id}/restore`, {
        method: 'POST',
      });
    } catch {
      return localBackend.restoreProject(id);
    }
  },

  // Scenarios
  async getScenarios(projectId: string): Promise<Scenario[]> {
    try {
      return await fetchJson<Scenario[]>(`${API_BASE}/projects/${projectId}/scenarios`);
    } catch {
      return localBackend.getScenarios(projectId);
    }
  },

  async createScenario(projectId: string, data: ScenarioCreateInput): Promise<Scenario> {
    try {
      return await fetchJson<Scenario>(`${API_BASE}/projects/${projectId}/scenarios`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      return localBackend.createScenario(projectId, data);
    }
  },

  async updateScenario(scenarioId: string, data: Partial<ScenarioCreateInput>): Promise<Scenario> {
    try {
      return await fetchJson<Scenario>(`${API_BASE}/scenarios/${scenarioId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch {
      return localBackend.getScenarios('')[0];
    }
  },

  async cloneScenario(
    projectId: string,
    scenarioId: string,
    data?: { name?: string; description?: string }
  ): Promise<Scenario> {
    try {
      return await fetchJson<Scenario>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/clone`,
        {
          method: 'POST',
          body: JSON.stringify(data || {}),
        }
      );
    } catch {
      return localBackend.createScenario(projectId, { name: data?.name || 'Cloned Scenario', description: data?.description });
    }
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    try {
      await fetchJson<void>(`${API_BASE}/scenarios/${scenarioId}`, {
        method: 'DELETE',
      });
    } catch {
      localBackend.deleteScenario(scenarioId);
    }
  },

  async compareScenarios(scenarioIdsOrProjectId: string[] | string): Promise<ScenarioComparisonResponse> {
    try {
      const idsParam = Array.isArray(scenarioIdsOrProjectId)
        ? scenarioIdsOrProjectId.join(',')
        : scenarioIdsOrProjectId;
      return await fetchJson<ScenarioComparisonResponse>(
        `${API_BASE}/scenarios/compare?ids=${idsParam}`
      );
    } catch {
      const projId = typeof scenarioIdsOrProjectId === 'string' ? scenarioIdsOrProjectId : 'demo-proj-1';
      return {
        project_id: projId,
        project_name: 'Metro Residences Development',
        baseline_scenario_id: 'demo-scen-1',
        scenarios: [
          {
            scenario_id: 'demo-scen-1',
            name: 'Base Case (34 Apts + Retail)',
            is_baseline: true,
            status: 'baseline',
            total_units: 34,
            total_internal_area: 2840,
            gross_realisation_value: 36850000,
            net_realisation_value: 35560250,
            land_acquisition_total: 6850000,
            construction_subtotal: 18450000,
            total_development_cost_ex_land: 22840000,
            total_project_cost: 29690000,
            net_profit: 5870250,
            margin_on_cost_pct: 19.77,
            margin_on_grv_pct: 15.93,
            project_irr: 22.4,
            peak_debt: 19400000,
            required_developer_equity: 8900000,
            return_on_equity_pct: 65.95,
            duration_months: 24,
          },
          {
            scenario_id: 'demo-scen-2',
            name: 'Scheme B (Higher Density 42 Apts)',
            is_baseline: false,
            status: 'draft',
            total_units: 42,
            total_internal_area: 3250,
            gross_realisation_value: 43200000,
            net_realisation_value: 41688000,
            land_acquisition_total: 6850000,
            construction_subtotal: 21600000,
            total_development_cost_ex_land: 26450000,
            total_project_cost: 33300000,
            net_profit: 8388000,
            margin_on_cost_pct: 25.19,
            margin_on_grv_pct: 19.42,
            project_irr: 26.8,
            peak_debt: 21800000,
            required_developer_equity: 9990000,
            return_on_equity_pct: 83.96,
            duration_months: 26,
          },
          {
            scenario_id: 'demo-scen-3',
            name: 'Scheme C (Luxury Low Density 24 Suites)',
            is_baseline: false,
            status: 'draft',
            total_units: 24,
            total_internal_area: 2680,
            gross_realisation_value: 39500000,
            net_realisation_value: 38117500,
            land_acquisition_total: 6850000,
            construction_subtotal: 19800000,
            total_development_cost_ex_land: 24200000,
            total_project_cost: 31050000,
            net_profit: 7067500,
            margin_on_cost_pct: 22.76,
            margin_on_grv_pct: 17.89,
            project_irr: 24.1,
            peak_debt: 20180000,
            required_developer_equity: 9315000,
            return_on_equity_pct: 75.87,
            duration_months: 22,
          },
        ],
      };
    }
  },

  async getScenarioComparison(scenarioIdsOrProjectId: string[] | string): Promise<ScenarioComparisonResponse> {
    return this.compareScenarios(scenarioIdsOrProjectId);
  },

  // Land
  async getLand(projectId: string, scenarioId: string): Promise<LandInput> {
    try {
      return await fetchJson<LandInput>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land`
      );
    } catch {
      return localBackend.getLand(projectId, scenarioId);
    }
  },

  async updateLand(
    projectId: string,
    scenarioId: string,
    data: LandInputUpdate
  ): Promise<LandInput> {
    try {
      return await fetchJson<LandInput>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    } catch {
      return localBackend.getLand(projectId, scenarioId);
    }
  },

  async addAcquisitionCostItem(
    projectId: string,
    scenarioId: string,
    item: Omit<AcquisitionCostItem, 'id' | 'created_at' | 'updated_at' | 'land_id'>
  ): Promise<LandInput> {
    try {
      return await fetchJson<LandInput>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land/costs`,
        {
          method: 'POST',
          body: JSON.stringify(item),
        }
      );
    } catch {
      return localBackend.getLand(projectId, scenarioId);
    }
  },

  async updateAcquisitionCostItem(
    projectId: string,
    scenarioId: string,
    itemId: string,
    item: Partial<AcquisitionCostItem>
  ): Promise<LandInput> {
    try {
      return await fetchJson<LandInput>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land/costs/${itemId}`,
        {
          method: 'PUT',
          body: JSON.stringify(item),
        }
      );
    } catch {
      return localBackend.getLand(projectId, scenarioId);
    }
  },

  async deleteAcquisitionCostItem(
    projectId: string,
    scenarioId: string,
    itemId: string
  ): Promise<void> {
    try {
      await fetchJson<void>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land/costs/${itemId}`,
        {
          method: 'DELETE',
        }
      );
    } catch {
      // Local ignore
    }
  },

  // Costs
  async getCosts(projectId: string, scenarioId: string): Promise<CostSummaryResponse> {
    try {
      return await fetchJson<CostSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/costs`
      );
    } catch {
      return localBackend.getCosts(projectId, scenarioId);
    }
  },

  async updateCosts(
    projectId: string,
    scenarioId: string,
    items: CostItem[]
  ): Promise<CostSummaryResponse> {
    try {
      return await fetchJson<CostSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/costs`,
        {
          method: 'PUT',
          body: JSON.stringify({ items }),
        }
      );
    } catch {
      return localBackend.getCosts(projectId, scenarioId);
    }
  },

  async updateCostsBatch(
    projectId: string,
    scenarioId: string,
    items: CostItem[]
  ): Promise<CostSummaryResponse> {
    return this.updateCosts(projectId, scenarioId, items);
  },

  // Sales
  async getSales(projectId: string, scenarioId: string): Promise<SalesSummaryResponse> {
    try {
      return await fetchJson<SalesSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/sales`
      );
    } catch {
      return localBackend.getSales(projectId, scenarioId);
    }
  },

  async updateSales(
    projectId: string,
    scenarioId: string,
    items: SalesProductItem[]
  ): Promise<SalesSummaryResponse> {
    try {
      return await fetchJson<SalesSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/sales`,
        {
          method: 'PUT',
          body: JSON.stringify({ items }),
        }
      );
    } catch {
      return localBackend.getSales(projectId, scenarioId);
    }
  },

  async updateSalesBatch(
    projectId: string,
    scenarioId: string,
    items: SalesProductItem[]
  ): Promise<SalesSummaryResponse> {
    return this.updateSales(projectId, scenarioId, items);
  },

  // Cash Flow
  async getCashFlow(
    projectId: string,
    scenarioId: string,
    durationMonths?: number
  ): Promise<CashFlowSummary> {
    try {
      const url = durationMonths
        ? `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/cashflow?duration_months=${durationMonths}`
        : `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/cashflow`;
      return await fetchJson<CashFlowSummary>(url);
    } catch {
      return localBackend.getCashFlow(projectId, scenarioId);
    }
  },

  // Funding
  async getFunding(projectId: string, scenarioId: string): Promise<FundingSummaryResponse> {
    try {
      return await fetchJson<FundingSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding`
      );
    } catch {
      return {
        assumption: {
          senior_debt_enabled: true,
          senior_max_ltc_pct: 70,
          senior_max_lvr_pct: 65,
          senior_interest_rate_pct: 6.5,
          senior_line_fee_pct: 1.5,
          senior_establishment_fee_pct: 1.0,
          mezzanine_enabled: true,
          mezzanine_amount: 16500000,
          mezzanine_interest_rate_pct: 12.5,
        },
        summary: {
          senior_debt_facility_limit: 72000000,
          senior_ltc_cap: 78172150,
          senior_lvr_cap: 72000000,
          constraining_factor: 'LVR (65% of Net Realisation)',
          mezzanine_facility_limit: 16500000,
          total_debt_facility: 88500000,
          required_developer_equity: 23174500,
          debt_percentage: 79.25,
          equity_percentage: 20.75,
          senior_establishment_fee: 720000,
          senior_interest_cost: 6540000,
          senior_line_fee: 1080000,
          mezzanine_interest_cost: 2062500,
          total_estimated_finance_cost: 10402500,
          net_profit_after_finance: 98095000,
          return_on_equity_pct: 423.28,
        }
      };
    }
  },

  async updateFunding(
    projectId: string,
    scenarioId: string,
    data: Partial<FundingAssumption>
  ): Promise<FundingSummaryResponse> {
    try {
      return await fetchJson<FundingSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    } catch {
      return this.getFunding(projectId, scenarioId);
    }
  },

  // Funding Tranches (Phase 2)
  async listTranches(projectId: string, scenarioId: string): Promise<FundingTranche[]> {
    try {
      return await fetchJson<FundingTranche[]>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches`
      );
    } catch {
      return localBackend.getTranches(projectId, scenarioId);
    }
  },

  async createTranche(projectId: string, scenarioId: string, data: Omit<FundingTranche, 'id' | 'scenario_id' | 'created_at' | 'updated_at'>): Promise<FundingTranche> {
    try {
      return await fetchJson<FundingTranche>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches`,
        { method: 'POST', body: JSON.stringify(data) }
      );
    } catch {
      return {
        ...data,
        id: `tr-${Date.now()}`,
        scenario_id: scenarioId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  async updateTranche(projectId: string, scenarioId: string, trancheId: string, data: Omit<FundingTranche, 'id' | 'scenario_id' | 'created_at' | 'updated_at'>): Promise<FundingTranche> {
    try {
      return await fetchJson<FundingTranche>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches/${trancheId}`,
        { method: 'PUT', body: JSON.stringify(data) }
      );
    } catch {
      return {
        ...data,
        id: trancheId,
        scenario_id: scenarioId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  async deleteTranche(projectId: string, scenarioId: string, trancheId: string): Promise<void> {
    try {
      await fetchJson<void>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches/${trancheId}`,
        { method: 'DELETE' }
      );
    } catch {
      // Local ignore
    }
  },

  async getWaterfall(projectId: string, scenarioId: string): Promise<WaterfallResponse> {
    try {
      return await fetchJson<WaterfallResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/waterfall`
      );
    } catch {
      return localBackend.getWaterfall(projectId, scenarioId);
    }
  },

  // Schedule
  async getSchedule(projectId: string, scenarioId: string): Promise<ScheduleSummaryResponse> {
    try {
      return await fetchJson<ScheduleSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/schedule`
      );
    } catch {
      return localBackend.getSchedule(projectId, scenarioId);
    }
  },

  async updateScheduleBatch(
    projectId: string,
    scenarioId: string,
    milestones: ScheduleMilestone[]
  ): Promise<ScheduleSummaryResponse> {
    try {
      return await fetchJson<ScheduleSummaryResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/schedule`,
        {
          method: 'PUT',
          body: JSON.stringify({ milestones }),
        }
      );
    } catch {
      return localBackend.getSchedule(projectId, scenarioId);
    }
  },

  // Feasibility & Valuation
  async getFullFeasibility(projectId: string, scenarioId: string): Promise<FullFeasibilityResponse> {
    try {
      return await fetchJson<FullFeasibilityResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/feasibility`
      );
    } catch {
      return localBackend.getFullFeasibility(projectId, scenarioId);
    }
  },

  async evaluateStandaloneFeasibility(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      return await fetchJson<Record<string, unknown>>(`${API_BASE}/feasibility/evaluate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return payload;
    }
  },

  // Executive Feasibility Reporting (Phase 3)
  async getExecutiveReport(projectId: string, scenarioId: string): Promise<ExecutiveReportResponse> {
    try {
      return await fetchJson<ExecutiveReportResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/report`
      );
    } catch {
      return localBackend.getExecutiveReport(projectId, scenarioId);
    }
  },

  getReportHtmlUrl(projectId: string, scenarioId: string): string {
    const token = getToken();
    const base = `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/report/html`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },

  // Sensitivity Analysis & Stress Testing (Phase 4)
  async getSensitivityAnalysis(projectId: string, scenarioId: string): Promise<SensitivityDashboardResponse> {
    try {
      return await fetchJson<SensitivityDashboardResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/sensitivity`
      );
    } catch {
      return localBackend.getSensitivityAnalysis(projectId, scenarioId);
    }
  },

  async simulateSensitivity(
    projectId: string,
    scenarioId: string,
    payload: SensitivitySimulateInput
  ): Promise<SensitivitySimulateResponse> {
    try {
      return await fetchJson<SensitivitySimulateResponse>(
        `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/sensitivity/simulate`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    } catch {
      return localBackend.simulateSensitivity(projectId, scenarioId, payload);
    }
  },

  // Auth / User
  async login(credentials: { email?: string; username?: string; password?: string }): Promise<AuthToken> {
    const email = credentials.email || credentials.username || '';
    try {
      const data = await fetchJson<AuthToken>(`${API_BASE}/auth/login/json`, {
        method: 'POST',
        body: JSON.stringify({ email, password: credentials.password }),
      });
      if (data.access_token) {
        setToken(data.access_token);
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('Incorrect') || err.message.includes('401'))) {
        throw err;
      }
      const localAuth = localBackend.login(email || 'demo@feaspro.com');
      setToken(localAuth.access_token);
      return localAuth;
    }
  },

  async register(data: RegisterInput): Promise<AuthToken> {
    try {
      const res = await fetchJson<AuthToken>(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.access_token) {
        setToken(res.access_token);
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('already exists') || err.message.includes('400'))) {
        throw err;
      }
      const localAuth = localBackend.register({
        full_name: data.full_name,
        email: data.email,
        organization_name: data.organization_name,
      });
      setToken(localAuth.access_token);
      return localAuth;
    }
  },

  logout(): void {
    removeToken();
  },

  async getCurrentUser(): Promise<User> {
    try {
      return await fetchJson<User>(`${API_BASE}/auth/me`);
    } catch {
      return localBackend.getCurrentUser();
    }
  },
};
