import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Flag,
  Sparkles,
  CheckCircle,
  PlayCircle,
  Clock3,
  Copy,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ScheduleMilestone, Scenario } from '../types';
import { api } from '../services/api';

interface ScheduleWorkspaceProps {
  projectId: string;
  scenario: Scenario;
}

const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  acquisition: {
    label: 'Site Acquisition & Settlement',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    icon: '📍',
  },
  planning_da: {
    label: 'Planning & DA Approvals',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
    icon: '📐',
  },
  presales: {
    label: 'Presales Campaign',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    icon: '📣',
  },
  civil_demo: {
    label: 'Demolition & Civil Works',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.1)',
    icon: '⚡',
  },
  construction: {
    label: 'Main Construction Works',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    icon: '🏗️',
  },
  titling: {
    label: 'Strata Titling & Compliance',
    color: '#475569',
    bg: 'rgba(71, 85, 105, 0.1)',
    icon: '📋',
  },
  settlement: {
    label: 'Final Settlements & Handover',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    icon: '🔑',
  },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  planned: { label: 'Planned', badge: 'badge-neutral', icon: <Clock3 size={13} /> },
  in_progress: { label: 'In Progress', badge: 'badge-active', icon: <PlayCircle size={13} /> },
  completed: { label: 'Completed', badge: 'badge-success', icon: <CheckCircle size={13} /> },
};

const STAGE_PRESETS = [
  {
    stage: 'acquisition',
    name: 'Site Contract Exchange & Settlement',
    start_m: 1,
    dur: 2,
    status: 'completed',
    notes: 'Contract deposit paid at Month 1, title handover at Month 2',
  },
  {
    stage: 'planning_da',
    name: 'Development Approval (DA) & CC Working Drawings',
    start_m: 1,
    dur: 6,
    status: 'in_progress',
    notes: 'Council statutory planning assessment and CC certification',
  },
  {
    stage: 'presales',
    name: 'Off-the-Plan Presales Marketing Campaign',
    start_m: 2,
    dur: 10,
    status: 'in_progress',
    notes: 'Achieve 60% debt qualifying presale threshold',
  },
  {
    stage: 'civil_demo',
    name: 'Site Clearing, Demolition & Bulk Earthworks',
    start_m: 3,
    dur: 3,
    status: 'planned',
    notes: 'Old improvement demolition and retention piling',
  },
  {
    stage: 'construction',
    name: 'Main Head Contract Building Works',
    start_m: 5,
    dur: 16,
    status: 'planned',
    notes: 'Turnkey structural, envelope, fitout and commissioning',
  },
  {
    stage: 'titling',
    name: 'Strata Plan Registration & Occupation Certificate (OC)',
    start_m: 20,
    dur: 2,
    status: 'planned',
    notes: 'Council subdivision signoff and Land Titles registration',
  },
  {
    stage: 'settlement',
    name: 'Buyer Settlements & Debt Repayment',
    start_m: 22,
    dur: 2,
    status: 'planned',
    notes: 'Simultaneous 14-day buyer contract settlements and debt sweep',
  },
];

export const ScheduleWorkspace: React.FC<ScheduleWorkspaceProps> = ({
  projectId,
  scenario,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [milestones, setMilestones] = useState<ScheduleMilestone[]>([]);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const loadScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getSchedule(projectId, scenario.id);
      setMilestones(res.milestones);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load project schedule.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const maxMonth = useMemo(() => {
    if (milestones.length === 0) return 24;
    return Math.max(
      ...milestones.map((m) => (m.start_month || 1) + (m.duration_months || 1) - 1),
      24
    );
  }, [milestones]);

  const constructionMilestone = milestones.find((m) => m.stage === 'construction');
  const constructionDuration = constructionMilestone ? constructionMilestone.duration_months : 16;

  const handleAddMilestone = (stageType: string = 'construction') => {
    const newM: ScheduleMilestone = {
      stage: stageType,
      name: `${STAGE_CONFIG[stageType]?.label || 'Stage'} Milestone`,
      start_month: 6,
      duration_months: 6,
      end_month: 11,
      status: 'planned',
      notes: '',
    };
    setMilestones([...milestones, newM]);
  };

  const handleApplyPreset = (preset: typeof STAGE_PRESETS[0]) => {
    const newM: ScheduleMilestone = {
      stage: preset.stage,
      name: preset.name,
      start_month: preset.start_m,
      duration_months: preset.dur,
      end_month: preset.start_m + preset.dur - 1,
      status: preset.status,
      notes: preset.notes,
    };
    setMilestones([...milestones, newM]);
  };

  const handleDuplicateMilestone = (index: number) => {
    const m = milestones[index];
    const cloned: ScheduleMilestone = {
      ...m,
      id: undefined,
      name: `${m.name} (Copy)`,
    };
    const updated = [...milestones];
    updated.splice(index + 1, 0, cloned);
    setMilestones(updated);
  };

  const handleUpdateMilestone = (
    index: number,
    field: keyof ScheduleMilestone,
    value: any
  ) => {
    const updated = [...milestones];
    const current = { ...updated[index], [field]: value };
    const start = parseInt(String(current.start_month)) || 1;
    const dur = parseInt(String(current.duration_months)) || 1;
    current.end_month = start + dur - 1;
    updated[index] = current;
    setMilestones(updated);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: ScheduleMilestone[] = milestones.map((m) => ({
        stage: m.stage,
        name: m.name.trim() || 'Development Milestone',
        start_month: parseInt(String(m.start_month)) || 1,
        duration_months: parseInt(String(m.duration_months)) || 1,
        end_month:
          (parseInt(String(m.start_month)) || 1) + (parseInt(String(m.duration_months)) || 1) - 1,
        status: m.status || 'planned',
        notes: m.notes?.trim() || null,
      }));

      const res = await api.updateScheduleBatch(projectId, scenario.id, payload);
      setMilestones(res.milestones);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save project schedule.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredMilestones = useMemo(() => {
    if (filterStage === 'all') return milestones;
    return milestones.filter((m) => m.stage === filterStage);
  }, [milestones, filterStage]);

  if (loading) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading project Gantt schedule & milestones...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving schedule:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Timeline phasing and Gantt milestones updated successfully!
          </div>
        </div>
      )}

      {/* KPI Header Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Project Duration</span>
            <Calendar size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{maxMonth} Months</div>
          <div className="kpi-subtext">Site Acquisition to Title Settlement</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Main Construction Duration</span>
            <Clock size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{constructionDuration} Months</div>
          <div className="kpi-subtext">Head Contract Build Period</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Project Stages</span>
            <Layers size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{milestones.length} Milestones</div>
          <div className="kpi-subtext">Active Planning & Delivery Workstreams</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Final Settlement</span>
            <Flag size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">Month {maxMonth}</div>
          <div className="kpi-subtext">Senior Debt Sweep & Equity Distribution</div>
        </div>
      </div>

      {/* Visual Interactive Gantt Chart Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Project Gantt Master Timeline</h3>
            <p className="card-subtitle">Visual timeline and duration bars across development phases.</p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Project Horizon: <strong>{maxMonth} Months</strong>
          </span>
        </div>

        <div className="card-body" style={{ overflowX: 'auto', padding: '20px 24px' }}>
          <div style={{ minWidth: '850px' }}>
            {/* Timeline Header Row (Months) */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '8px',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '240px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                }}
              >
                Milestone Workstream
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {Array.from({ length: maxMonth }, (_, i) => i + 1).map((m) => (
                  <div
                    key={m}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: m % 6 === 0 || m === 1 ? 'var(--brand-accent)' : 'var(--text-muted)',
                      borderLeft: '1px solid #f1f5f9',
                    }}
                  >
                    M{m}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {milestones.map((m, idx) => {
                const stageObj = STAGE_CONFIG[m.stage] || STAGE_CONFIG.construction;
                const color = stageObj.color;
                const leftPct = ((m.start_month - 1) / maxMonth) * 100;
                const widthPct = (m.duration_months / maxMonth) * 100;

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '240px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingRight: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{stageObj.icon}</span>
                      <span title={m.name}>{m.name}</span>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        position: 'relative',
                        height: '28px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${Math.max(2, widthPct)}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '8px',
                          color: '#ffffff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                        title={`${m.name}: Month ${m.start_month} to ${m.end_month} (${m.duration_months} mos)`}
                      >
                        {m.duration_months >= 2 ? `${m.duration_months} mos (M${m.start_month}-M${m.end_month})` : `M${m.start_month}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Milestones Table Form */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="section-icon-badge"
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="card-title">Schedule Milestones & Stage Durations</h3>
                <p className="card-subtitle">Itemize project timeline start periods, stage durations, and delivery status.</p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleAddMilestone('construction')}
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              <Plus size={16} />
              <span>Add Stage</span>
            </button>
          </div>

          <div className="card-body">
            {/* Quick Presets Toolbar */}
            <div className="cost-presets-toolbar">
              <span className="cost-preset-label">⚡ Quick Stages:</span>
              {STAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="cost-preset-btn"
                  onClick={() => handleApplyPreset(preset)}
                  title={`Add ${preset.name}`}
                >
                  <Plus size={13} />
                  <span>{preset.name.split(' (')[0]}</span>
                </button>
              ))}
            </div>

            {/* Stage Filter Pills */}
            <div className="cost-filter-container" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className={`cost-filter-pill ${filterStage === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStage('all')}
              >
                <span>All Stages</span>
                <span className="cost-filter-count">{milestones.length}</span>
              </button>

              {Object.entries(STAGE_CONFIG).map(([sKey, config]) => {
                const count = milestones.filter((m) => m.stage === sKey).length;
                const isActive = filterStage === sKey;
                return (
                  <button
                    key={sKey}
                    type="button"
                    className={`cost-filter-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setFilterStage(sKey)}
                    style={{
                      borderColor: isActive ? config.color : undefined,
                      backgroundColor: isActive ? config.color : undefined,
                    }}
                  >
                    <span
                      className="cost-legend-dot"
                      style={{ backgroundColor: isActive ? '#ffffff' : config.color }}
                    />
                    <span>{config.label}</span>
                    <span className="cost-filter-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="cost-table-wrapper">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px', width: '22%' }}>Stage Category</th>
                    <th style={{ minWidth: '240px', width: '26%' }}>Milestone Workstream</th>
                    <th style={{ minWidth: '150px', width: '15%', textAlign: 'center' }}>Start Month</th>
                    <th style={{ minWidth: '150px', width: '15%', textAlign: 'center' }}>Duration</th>
                    <th style={{ minWidth: '110px', width: '10%', textAlign: 'center' }}>End Month</th>
                    <th style={{ minWidth: '140px', width: '12%' }}>Status</th>
                    <th style={{ minWidth: '80px', width: '6%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMilestones.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No schedule milestones in this category. Click <strong>"Add Stage"</strong> to begin scheduling.
                      </td>
                    </tr>
                  ) : (
                    filteredMilestones.map((m) => {
                      const realIndex = milestones.indexOf(m);
                      const isExpanded = expandedIndex === realIndex;
                      const stageConfig = STAGE_CONFIG[m.stage] || STAGE_CONFIG.construction;

                      return (
                        <React.Fragment key={realIndex}>
                          <tr className={isExpanded ? 'expanded' : ''}>
                            {/* Stage Selector */}
                            <td>
                              <select
                                className="cost-select-styled"
                                value={m.stage}
                                onChange={(e) => handleUpdateMilestone(realIndex, 'stage', e.target.value)}
                                style={{
                                  borderLeft: `5px solid ${stageConfig.color}`,
                                  paddingLeft: '12px',
                                }}
                              >
                                {Object.entries(STAGE_CONFIG).map(([sKey, sVal]) => (
                                  <option key={sKey} value={sKey}>
                                    {sVal.icon} {sVal.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Milestone Name */}
                            <td>
                              <input
                                type="text"
                                className="cost-desc-input"
                                value={m.name}
                                placeholder="e.g. Head Contract Construction"
                                onChange={(e) => handleUpdateMilestone(realIndex, 'name', e.target.value)}
                              />
                            </td>

                            {/* Start Month Stepper */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <button
                                  type="button"
                                  className="timing-month-btn"
                                  onClick={() =>
                                    handleUpdateMilestone(
                                      realIndex,
                                      'start_month',
                                      Math.max(1, (m.start_month || 1) - 1)
                                    )
                                  }
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={60}
                                  className="timing-input-box"
                                  value={m.start_month}
                                  onChange={(e) =>
                                    handleUpdateMilestone(realIndex, 'start_month', parseInt(e.target.value) || 1)
                                  }
                                />
                                <button
                                  type="button"
                                  className="timing-month-btn"
                                  onClick={() =>
                                    handleUpdateMilestone(realIndex, 'start_month', (m.start_month || 1) + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Duration Stepper */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <button
                                  type="button"
                                  className="timing-month-btn"
                                  onClick={() =>
                                    handleUpdateMilestone(
                                      realIndex,
                                      'duration_months',
                                      Math.max(1, (m.duration_months || 1) - 1)
                                    )
                                  }
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={60}
                                  className="timing-input-box"
                                  value={m.duration_months}
                                  onChange={(e) =>
                                    handleUpdateMilestone(realIndex, 'duration_months', parseInt(e.target.value) || 1)
                                  }
                                />
                                <button
                                  type="button"
                                  className="timing-month-btn"
                                  onClick={() =>
                                    handleUpdateMilestone(realIndex, 'duration_months', (m.duration_months || 1) + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {m.duration_months} months
                              </div>
                            </td>

                            {/* End Month */}
                            <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--brand-accent)', fontSize: '0.95rem' }}>
                              M{(m.start_month || 1) + (m.duration_months || 1) - 1}
                            </td>

                            {/* Status */}
                            <td>
                              <select
                                className="cost-select-styled"
                                value={m.status || 'planned'}
                                onChange={(e) => handleUpdateMilestone(realIndex, 'status', e.target.value)}
                                style={{ fontSize: '0.8rem', padding: '6px 24px 6px 8px' }}
                              >
                                {Object.entries(STATUS_CONFIG).map(([stKey, stVal]) => (
                                  <option key={stKey} value={stKey}>
                                    {stVal.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Row Actions */}
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-btn-group">
                                <button
                                  type="button"
                                  className={`action-btn ${isExpanded ? 'active' : ''}`}
                                  title="Expand Notes"
                                  onClick={() => setExpandedIndex(isExpanded ? null : realIndex)}
                                >
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Duplicate Stage"
                                  onClick={() => handleDuplicateMilestone(realIndex)}
                                >
                                  <Copy size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="action-btn text-danger"
                                  title="Delete Stage"
                                  onClick={() => handleRemoveMilestone(realIndex)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Notes */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="cost-row-details">
                                <div>
                                  <label
                                    style={{
                                      display: 'block',
                                      fontSize: '0.76rem',
                                      fontWeight: 700,
                                      color: 'var(--text-secondary)',
                                      marginBottom: '6px',
                                    }}
                                  >
                                    Delivery Notes & Milestone Precedents
                                  </label>
                                  <input
                                    type="text"
                                    className="cost-desc-input"
                                    placeholder="e.g. Critical path milestone; requires Section 73 Sydney Water certificate prior to OC issue."
                                    value={m.notes || ''}
                                    onChange={(e) => handleUpdateMilestone(realIndex, 'notes', e.target.value)}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Timeline changes automatically align cash flow duration and financing periods</span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '160px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Schedule'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
