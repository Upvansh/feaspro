import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Layers,
  Archive,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Coins,
  Map,
} from 'lucide-react';
import { Project, Scenario, DevelopmentType, LandInput, ScenarioMetrics } from '../types';
import { CreateScenarioModal } from '../components/CreateScenarioModal';
import { LandWorkspace } from './LandWorkspace';
import { CostsWorkspace } from './CostsWorkspace';
import { SalesWorkspace } from './SalesWorkspace';
import { CashFlowWorkspace } from './CashFlowWorkspace';
import { FundingWorkspace } from './FundingWorkspace';
import { ScheduleWorkspace } from './ScheduleWorkspace';
import { ReportsWorkspace } from './ReportsWorkspace';
import { SensitivityWorkspace } from './SensitivityWorkspace';
import { ScenarioComparisonMatrix } from '../components/ScenarioComparisonMatrix';
import { ResidualLandValueCard } from '../components/ResidualLandValueCard';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onProjectUpdated: (updated: Project) => void;
  initialTab?: TabType;
}

export type TabType =
  | 'overview'
  | 'land'
  | 'costs'
  | 'sales'
  | 'funding'
  | 'schedule'
  | 'cashflow'
  | 'scenarios'
  | 'reports'
  | 'sensitivity';

const formatDevType = (type: DevelopmentType): string => {
  const map: Record<DevelopmentType, string> = {
    residential_subdivision: 'Land Subdivision',
    multi_unit_residential: 'Multi-Unit Residential',
    townhouses: 'Townhouses',
    commercial_mixed_use: 'Commercial / Mixed-Use',
    industrial: 'Industrial',
    retail: 'Retail',
    other: 'Other',
  };
  return map[type] || type;
};

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBack,
  onProjectUpdated,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'overview');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(() => {
    const baseline = project.scenarios.find((s) => s.is_baseline);
    return baseline ? baseline.id : project.scenarios[0]?.id || '';
  });
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [activeScenarioLand, setActiveScenarioLand] = useState<LandInput | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<ScenarioMetrics | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => setRefreshTrigger(t => t + 1), []);

  const activeScenario =
    project.scenarios.find((s) => s.id === selectedScenarioId) || project.scenarios[0];

  // Fetch land data & metrics for the active scenario to power overview preview
  const fetchActiveScenarioData = useCallback(async () => {
    if (!activeScenario) return;
    try {
      const [land, comparison] = await Promise.all([
        api.getLand(project.id, activeScenario.id).catch(() => null),
        api.getScenarioComparison(project.id).catch(() => null),
      ]);
      setActiveScenarioLand(land);
      if (comparison) {
        const match = comparison.scenarios.find((s) => s.scenario_id === activeScenario.id);
        setActiveMetrics(match || null);
      }
    } catch {
      setActiveScenarioLand(null);
      setActiveMetrics(null);
    }
  }, [project.id, activeScenario, refreshTrigger]);

  useEffect(() => {
    fetchActiveScenarioData();
  }, [fetchActiveScenarioData]);

  const handleScenarioCreated = async (newScenario: Scenario) => {
    const updated = await api.getProject(project.id);
    onProjectUpdated(updated);
    setSelectedScenarioId(newScenario.id);
  };

  const handleArchiveProject = async () => {
    if (
      window.confirm(
        `Are you sure you want to archive "${project.name}"? You can restore it later.`
      )
    ) {
      setArchiveLoading(true);
      try {
        await api.archiveProject(project.id);
        onBack();
      } catch (err) {
        console.error('Failed to archive project:', err);
      } finally {
        setArchiveLoading(false);
      }
    }
  };

  const isLandConfigured =
    activeScenarioLand &&
    parseFloat(String(activeScenarioLand.purchase_price || 0)) > 0;

  return (
    <div>
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-header-top">
          <div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onBack}
              style={{ marginBottom: '12px' }}
            >
              <ArrowLeft size={15} />
              <span>Back to Projects</span>
            </button>
            <div className="workspace-title-row">
              <h1 className="workspace-title">{project.name}</h1>
              <span className={`badge badge-${project.status}`}>{project.status}</span>
              <span className="badge badge-type">{formatDevType(project.development_type)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#64748b" />
              <select
                className="select-control"
                style={{ fontWeight: 600 }}
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
              >
                {project.scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_baseline ? '⭐ (Baseline)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-danger btn-sm"
              onClick={handleArchiveProject}
              disabled={archiveLoading}
              title="Archive Project (Soft Delete)"
            >
              <Archive size={15} />
              <span>Archive</span>
            </button>
          </div>
        </div>

        <div className="workspace-meta-bar">
          {project.location && (
            <div className="meta-segment">
              <MapPin size={15} color="#64748b" />
              <span>{project.location}</span>
            </div>
          )}
          <div className="meta-segment">
            <Calendar size={15} color="#64748b" />
            <span>
              Commencement: <strong>{project.start_date || 'TBD'}</strong> → Completion:{' '}
              <strong>{project.target_completion_date || 'TBD'}</strong>
            </span>
          </div>
          <div className="meta-segment">
            <Clock size={15} color="#64748b" />
            <span>
              Active Scenario: <strong>{activeScenario?.name || 'Baseline'}</strong>
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="workspace-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>Overview</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'land' ? 'active' : ''}`}
            onClick={() => setActiveTab('land')}
          >
            <span>Land & Acquisition</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'costs' ? 'active' : ''}`}
            onClick={() => setActiveTab('costs')}
          >
            <span>Costs</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <span>Sales</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'funding' ? 'active' : ''}`}
            onClick={() => setActiveTab('funding')}
          >
            <span>Funding</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <span>Schedule</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'cashflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('cashflow')}
          >
            <span>Cash Flow</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            <span>Scenarios ({project.scenarios.length})</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <span>Reports</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'sensitivity' ? 'active' : ''}`}
            onClick={() => setActiveTab('sensitivity')}
          >
            <span>Sensitivity</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="view-container">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div>
              {/* Project Scope & Metadata Card */}
              <div className="content-card">
                <div className="card-header-flex">
                  <h3 className="card-title">Project Definition & Scope</h3>
                  <span className="badge badge-active">Active Workspace</span>
                </div>

                <p
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '20px',
                    lineHeight: '1.6',
                  }}
                >
                  {project.description || 'No detailed scope description provided for this project.'}
                </p>

                <div className="info-field-grid">
                  <div className="info-field">
                    <span className="info-label">Development Typology</span>
                    <span className="info-val">{formatDevType(project.development_type)}</span>
                  </div>

                  <div className="info-field">
                    <span className="info-label">Current Status</span>
                    <span className="info-val" style={{ textTransform: 'capitalize' }}>
                      {project.status}
                    </span>
                  </div>

                  <div className="info-field">
                    <span className="info-label">Commencement Date</span>
                    <span className="info-val">{project.start_date || 'Not set'}</span>
                  </div>

                  <div className="info-field">
                    <span className="info-label">Target Completion</span>
                    <span className="info-val">{project.target_completion_date || 'Not set'}</span>
                  </div>

                  <div className="info-field">
                    <span className="info-label">Primary Site Location</span>
                    <span className="info-val">{project.location || 'Not specified'}</span>
                  </div>

                </div>
              </div>

              {/* Land Acquisition Summary Card */}
              <div className="content-card">
                <div className="card-header-flex">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Map size={18} color="#2563eb" />
                    <h3 className="card-title">Land Acquisition Summary</h3>
                  </div>
                  <span
                    className={`badge ${isLandConfigured ? 'badge-active' : 'badge-draft'}`}
                  >
                    {isLandConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                {isLandConfigured && activeScenarioLand ? (
                  <div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div className="info-field">
                        <span className="info-label">Purchase Price</span>
                        <span className="info-val" style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(activeScenarioLand.purchase_price)}
                        </span>
                      </div>

                      <div className="info-field">
                        <span className="info-label">Acquisition Duties & Fees</span>
                        <span className="info-val" style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(activeScenarioLand.calculations.total_acquisition_costs)}
                        </span>
                      </div>

                      <div className="info-field">
                        <span className="info-label">Total Land Acquisition</span>
                        <span
                          className="info-val"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: '#047857',
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(activeScenarioLand.calculations.total_land_acquisition)}
                        </span>
                      </div>

                      <div className="info-field">
                        <span className="info-label">Site Area</span>
                        <span className="info-val">
                          {activeScenarioLand.site_area
                            ? `${formatNumber(activeScenarioLand.site_area)} ${activeScenarioLand.site_area_unit}`
                            : 'Unspecified'}
                        </span>
                      </div>
                    </div>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setActiveTab('land')}
                    >
                      <span>Manage Land Assumptions</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b' }}>
                    <p style={{ fontSize: '0.88rem', marginBottom: '12px' }}>
                      Land purchase terms and acquisition cost items have not yet been configured for{' '}
                      <strong>{activeScenario.name}</strong>.
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('land')}
                    >
                      <Coins size={14} />
                      <span>Setup Land & Acquisition</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Feasibility Metric Preview */}
              <div
                className="content-card"
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Sparkles size={20} color="#60a5fa" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    Financial Calculation Engine
                  </h3>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
                  Land acquisition subtotals are now computed deterministically via the backend calculation engine (`backend/app/calculations/costs.py`).
                  Future phases will integrate construction costing, unit sales phasing, and cash flow schedules.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Total Land Acq
                    </span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
                      {activeScenarioLand
                        ? formatCurrency(activeScenarioLand.calculations.total_land_acquisition)
                        : '$0'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Total Dev Cost
                    </span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>
                      {activeMetrics
                        ? formatCurrency(parseFloat(String(activeMetrics.total_development_cost_ex_land)) || 0)
                        : '$0'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Dev Margin
                    </span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                      {activeMetrics
                        ? `${(parseFloat(String(activeMetrics.margin_on_cost_pct)) || 0).toFixed(1)}%`
                        : '0.0%'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Project IRR
                    </span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                      {activeMetrics ? `${activeMetrics.project_irr.toFixed(1)}%` : '0.0%'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Scenario Management & Next Actions */}
            <div>
              <div className="content-card">
                <div className="card-header-flex">
                  <h3 className="card-title">Project Scenarios</h3>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsScenarioModalOpen(true)}
                  >
                    <Plus size={14} />
                    <span>New</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {project.scenarios.map((scen) => (
                    <div
                      key={scen.id}
                      className={`scenario-item-card ${
                        selectedScenarioId === scen.id ? 'is-active-baseline' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedScenarioId(scen.id)}
                    >
                      <div className="scenario-item-info">
                        <div className="scenario-name-row">
                          <span className="scenario-title">{scen.name}</span>
                          {scen.is_baseline && (
                            <span className="badge badge-baseline">Baseline</span>
                          )}
                        </div>
                        {scen.description && (
                          <span className="scenario-desc">{scen.description}</span>
                        )}
                      </div>

                      <ChevronRight
                        size={16}
                        color={selectedScenarioId === scen.id ? '#2563eb' : '#94a3b8'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Feasibility Workflow Roadmap */}
              <div className="content-card">
                <h3 className="card-title" style={{ marginBottom: '14px' }}>
                  Feasibility Workflow
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                    <CheckCircle2 size={16} />
                    <strong>Phase 1: Project Setup & Baseline</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                    <CheckCircle2 size={16} />
                    <strong>Phase 2: Land & Acquisition Engine</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                    <CheckCircle2 size={16} />
                    <strong>Phase 3: Development Costs & Sales Mix</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                    <CheckCircle2 size={16} />
                    <strong>Phase 4: Funding, Schedule & Cash Flow</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                    <CheckCircle2 size={16} />
                    <strong>Phase 5: Scenario Comparison & Stress Testing</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 1 Master Valuation & RLV Engine */}
            <ResidualLandValueCard
              projectId={project.id}
              scenario={activeScenario}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {/* Fully Functional Land & Acquisition Workspace */}
        {activeTab === 'land' && (
          <LandWorkspace
            projectId={project.id}
            scenario={activeScenario}
            onLandUpdated={(updated) => {
              setActiveScenarioLand(updated);
              triggerRefresh();
            }}
          />
        )}

        {activeTab === 'scenarios' && (
          <div>
            <div className="page-header" style={{ marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Feasibility Scenarios & Schemes
                </h2>
                <p className="page-subtitle">
                  Create and manage scenario branches to test yield variations, cost inflations, and planning options.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setIsScenarioModalOpen(true)}
              >
                <Plus size={16} />
                <span>Create New Scenario</span>
              </button>
            </div>

            <ScenarioComparisonMatrix
              projectId={project.id}
              onScenarioSelected={(scenId) => {
                setSelectedScenarioId(scenId);
                setActiveTab('overview');
              }}
              onScenariosChanged={() => {
                // Refresh project details
                api.getProject(project.id).then((p) => onProjectUpdated(p)).catch(() => {});
              }}
            />
          </div>
        )}

        {activeTab === 'costs' && (
          <CostsWorkspace
            projectId={project.id}
            scenario={activeScenario}
            onCostsUpdated={triggerRefresh}
          />
        )}

        {activeTab === 'sales' && (
          <SalesWorkspace
            projectId={project.id}
            scenario={activeScenario}
            onSalesUpdated={triggerRefresh}
          />
        )}

        {activeTab === 'funding' && (
          <FundingWorkspace
            projectId={project.id}
            scenario={activeScenario}
            onFundingUpdated={triggerRefresh}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleWorkspace
            projectId={project.id}
            scenario={activeScenario}
          />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowWorkspace
            projectId={project.id}
            scenario={activeScenario}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsWorkspace
            projectId={project.id}
            scenario={activeScenario}
          />
        )}

        {activeTab === 'sensitivity' && (
          <SensitivityWorkspace
            projectId={project.id}
            scenario={activeScenario}
          />
        )}
      </div>

      <CreateScenarioModal
        isOpen={isScenarioModalOpen}
        projectId={project.id}
        onClose={() => setIsScenarioModalOpen(false)}
        onSuccess={handleScenarioCreated}
      />
    </div>
  );
};
