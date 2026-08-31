import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sliders,
  Plus,
  Building,
  Check,
} from 'lucide-react';
import { ScenarioComparisonResponse, ScenarioMetrics } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ScenarioComparisonMatrixProps {
  projectId: string;
  onScenarioSelected?: (scenarioId: string) => void;
  onScenariosChanged?: () => void;
}

export const ScenarioComparisonMatrix: React.FC<ScenarioComparisonMatrixProps> = ({
  projectId,
  onScenarioSelected,
  onScenariosChanged,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ScenarioComparisonResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Sensitivity variables (Percentage shifts)
  const [priceShiftPct, setPriceShiftPct] = useState<number>(0);
  const [costShiftPct, setCostShiftPct] = useState<number>(0);

  const loadComparison = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getScenarioComparison(projectId);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load scenario comparison.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const handleClone = async (scenario: ScenarioMetrics) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.cloneScenario(projectId, scenario.scenario_id, {
        name: `Scheme ${String.fromCharCode(66 + (data?.scenarios.length || 1))} (${scenario.name.split(' (')[0]} Variant)`,
        description: `Duplicated branch from '${scenario.name}' for feasibility optimization.`,
      });
      setActionSuccess(`Successfully cloned "${scenario.name}".`);
      await loadComparison();
      if (onScenariosChanged) onScenariosChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to clone scenario.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateNewScheme = async (presetName: string) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const baseScenario = data?.scenarios.find((s) => s.is_baseline) || data?.scenarios[0];
      if (baseScenario) {
        await api.cloneScenario(projectId, baseScenario.scenario_id, {
          name: presetName,
          description: `Alternative scheme for comparative yield and margin testing.`,
        });
        setActionSuccess(`Created new comparative scheme "${presetName}".`);
        await loadComparison();
        if (onScenariosChanged) onScenariosChanged();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to create new scheme.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetBaseline = async (scenarioId: string) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.updateScenario(scenarioId, { is_baseline: true });
      setActionSuccess('Baseline scenario updated.');
      await loadComparison();
      if (onScenariosChanged) onScenariosChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to set baseline scenario.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (scenario: ScenarioMetrics) => {
    if (scenario.is_baseline) {
      setErrorMessage('Cannot delete the primary baseline scenario. Please set another baseline first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete scenario "${scenario.name}"?`)) {
      return;
    }
    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.deleteScenario(scenario.scenario_id);
      setActionSuccess(`Deleted scenario "${scenario.name}".`);
      await loadComparison();
      if (onScenariosChanged) onScenariosChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to delete scenario.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Computing scenario comparison matrix across portfolio models...</p>
      </div>
    );
  }

  const scenarios = data?.scenarios || [];
  const baselineScenario = scenarios.find((s) => s.is_baseline) || scenarios[0];

  const getShiftedMetrics = (s: ScenarioMetrics) => {
    const rawGrv = parseFloat(String(s.gross_realisation_value)) || 0;
    const rawNrv = parseFloat(String(s.net_realisation_value)) || rawGrv * 0.965;
    const rawLand = parseFloat(String(s.land_acquisition_total)) || 0;
    const rawConst = parseFloat(String(s.construction_subtotal)) || 0;
    const rawDevExLand = parseFloat(String(s.total_development_cost_ex_land)) || rawConst * 1.25;

    // Apply shifts
    const shiftedGrv = rawGrv * (1 + priceShiftPct / 100);
    const shiftedNrv = rawNrv * (1 + priceShiftPct / 100);
    const shiftedDevExLand = rawDevExLand * (1 + costShiftPct / 100);
    const shiftedCost = rawLand + shiftedDevExLand;
    const shiftedProfit = shiftedNrv - shiftedCost;
    const shiftedMargin = shiftedCost > 0 ? (shiftedProfit / shiftedCost) * 100 : 0;
    const shiftedMarginGrv = shiftedGrv > 0 ? (shiftedProfit / shiftedGrv) * 100 : 0;

    return {
      grv: shiftedGrv,
      nrv: shiftedNrv,
      cost: shiftedCost,
      profit: shiftedProfit,
      margin: shiftedMargin,
      marginGrv: shiftedMarginGrv,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notifications */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={18} />
          <div>{errorMessage}</div>
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success" role="alert">
          <CheckCircle2 size={18} />
          <div>{actionSuccess}</div>
        </div>
      )}

      {/* Sensitivity Sliders / Quick Controls */}
      <div className="card" style={{ backgroundColor: '#ffffff' }}>
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
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="card-title">Live Sensitivity & Market Stress Testing</h3>
              <p className="card-subtitle">
                Stress test sales pricing and construction cost variations across all comparative schemes in real time.
              </p>
            </div>
          </div>

          {/* Quick Stress Presets */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Presets:
            </span>
            <button
              type="button"
              className="cost-preset-btn"
              onClick={() => {
                setPriceShiftPct(-10);
                setCostShiftPct(10);
              }}
              title="Bear Market: -10% Sales, +10% Costs"
            >
              <span>🐻 Bear Market (-10% / +10%)</span>
            </button>
            <button
              type="button"
              className="cost-preset-btn"
              onClick={() => {
                setPriceShiftPct(0);
                setCostShiftPct(0);
              }}
              title="Base Case: 0% Shift"
            >
              <span>⚖️ Base Case (0%)</span>
            </button>
            <button
              type="button"
              className="cost-preset-btn"
              onClick={() => {
                setPriceShiftPct(10);
                setCostShiftPct(-5);
              }}
              title="Bull Market: +10% Sales, -5% Costs"
            >
              <span>🐂 Bull Market (+10% / -5%)</span>
            </button>
          </div>
        </div>

        <div
          className="card-body"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            margin: '0 16px 16px 16px',
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Sales Shift Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 700, marginBottom: '6px' }}>
              <span>Sales Realisation Shift (Price Variance)</span>
              <span
                style={{
                  backgroundColor: priceShiftPct > 0 ? 'rgba(16,185,129,0.15)' : priceShiftPct < 0 ? 'rgba(239,68,68,0.15)' : '#e2e8f0',
                  color: priceShiftPct > 0 ? '#059669' : priceShiftPct < 0 ? '#dc2626' : 'var(--text-primary)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                {priceShiftPct > 0 ? `+${priceShiftPct}%` : `${priceShiftPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="2.5"
              value={priceShiftPct}
              onChange={(e) => setPriceShiftPct(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', height: '6px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>-20% (Market Downturn)</span>
              <span style={{ fontWeight: 600 }}>0% (Base)</span>
              <span>+20% (Bull Escalation)</span>
            </div>
          </div>

          {/* Cost Shift Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 700, marginBottom: '6px' }}>
              <span>Development Cost Shift (Inflation / Escalation)</span>
              <span
                style={{
                  backgroundColor: costShiftPct < 0 ? 'rgba(16,185,129,0.15)' : costShiftPct > 0 ? 'rgba(239,68,68,0.15)' : '#e2e8f0',
                  color: costShiftPct < 0 ? '#059669' : costShiftPct > 0 ? '#dc2626' : 'var(--text-primary)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                {costShiftPct > 0 ? `+${costShiftPct}%` : `${costShiftPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="2.5"
              value={costShiftPct}
              onChange={(e) => setCostShiftPct(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', height: '6px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>-20% (Value Engineered)</span>
              <span style={{ fontWeight: 600 }}>0% (Base)</span>
              <span>+20% (Cost Blowout)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="card">
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
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <h3 className="card-title">Side-by-Side Feasibility Comparison Matrix</h3>
              <p className="card-subtitle">
                Compare yield, gross realisation, margin on cost, project IRR, and peak equity exposure.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleCreateNewScheme('Scheme B (High Density Optimization)')}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <Plus size={15} />
              <span>Branch Alternate Scheme</span>
            </button>
          </div>
        </div>

        <div className="card-body">
          {scenarios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <Building size={36} style={{ marginBottom: '12px', color: '#94a3b8' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>No Scenarios Available for Comparison</h4>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>Create your first scheme to unlock side-by-side financial comparisons.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleCreateNewScheme('Primary Base Case')}
                style={{ marginTop: '16px' }}
              >
                <Plus size={16} />
                <span>Create Baseline Feasibility</span>
              </button>
            </div>
          ) : (
            <div className="cost-table-wrapper">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px', width: '28%' }}>Key Feasibility Metric</th>
                    {scenarios.map((s) => (
                      <th key={s.scenario_id} style={{ textAlign: 'right', minWidth: '200px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--brand-primary)' }}>
                            {s.name}
                          </span>
                          {s.is_baseline ? (
                            <span
                              style={{
                                backgroundColor: 'rgba(37,99,235,0.12)',
                                color: '#2563eb',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              ⭐ Primary Baseline
                            </span>
                          ) : (
                            <span
                              style={{
                                backgroundColor: 'rgba(124,58,237,0.12)',
                                color: '#7c3aed',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              Alternate Scheme
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 1. Yield & Density */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={scenarios.length + 1} style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      1. Yield, Density & Timeline
                    </td>
                  </tr>
                  <tr>
                    <td>Total Product Units</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.92rem' }}>
                        {s.total_units} Units
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Total Net Saleable Area (NSA)</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                        {formatNumber(parseFloat(String(s.total_internal_area)) || 0)} m²
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Project Timeline Duration</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                        {s.duration_months} Months
                      </td>
                    ))}
                  </tr>

                  {/* 2. Capital Costs */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={scenarios.length + 1} style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      2. Capital Costs Breakdown
                    </td>
                  </tr>
                  <tr>
                    <td>Land Acquisition (Purchase + Duty)</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                        {formatCurrency(parseFloat(String(s.land_acquisition_total)) || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Construction & Works</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                        {formatCurrency(parseFloat(String(s.construction_subtotal)) || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Total Development Cost (Ex. Land)</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(parseFloat(String(s.total_development_cost_ex_land)) || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td>Total Project Cost (TPC)</td>
                    {scenarios.map((s) => {
                      const shifted = getShiftedMetrics(s);
                      return (
                        <td key={s.scenario_id} style={{ textAlign: 'right', fontSize: '0.96rem', fontWeight: 800 }}>
                          {formatCurrency(shifted.cost)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 3. Realisation & Returns */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={scenarios.length + 1} style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      3. Realisation & Financial Returns
                    </td>
                  </tr>
                  <tr>
                    <td>Gross Realisation (GRV)</td>
                    {scenarios.map((s) => {
                      const shifted = getShiftedMetrics(s);
                      return (
                        <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          {formatCurrency(shifted.grv)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr style={{ fontWeight: 800, backgroundColor: 'rgba(16,185,129,0.06)' }}>
                    <td style={{ color: '#047857' }}>Net Development Profit ($)</td>
                    {scenarios.map((s) => {
                      const shifted = getShiftedMetrics(s);
                      const isBase = s.is_baseline;
                      const baseShifted = baselineScenario ? getShiftedMetrics(baselineScenario) : shifted;
                      const deltaProfit = shifted.profit - baseShifted.profit;

                      return (
                        <td key={s.scenario_id} style={{ textAlign: 'right', fontSize: '1.05rem', color: shifted.profit >= 0 ? '#047857' : '#dc2626' }}>
                          <div>{formatCurrency(shifted.profit)}</div>
                          {!isBase && deltaProfit !== 0 && (
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaProfit > 0 ? '#059669' : '#dc2626', marginTop: '2px' }}>
                              {deltaProfit > 0 ? `+${formatCurrency(deltaProfit)}` : formatCurrency(deltaProfit)} vs Base
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td>Development Margin on Cost (%)</td>
                    {scenarios.map((s) => {
                      const shifted = getShiftedMetrics(s);
                      return (
                        <td key={s.scenario_id} style={{ textAlign: 'right', color: 'var(--brand-accent)', fontSize: '0.98rem' }}>
                          {shifted.margin.toFixed(2)}%
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Project IRR (% p.a.)</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        {s.project_irr.toFixed(2)}%
                      </td>
                    ))}
                  </tr>

                  {/* 4. Capital Stack & Peak Exposure */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={scenarios.length + 1} style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      4. Capital Stack & Peak Exposure
                    </td>
                  </tr>
                  <tr>
                    <td>Peak Debt Requirement</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                        {formatCurrency(s.peak_debt)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Required Sponsor Equity</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(parseFloat(String(s.required_developer_equity)) || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Return on Equity (ROE %)</td>
                    {scenarios.map((s) => (
                      <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.96rem' }}>
                        {(parseFloat(String(s.return_on_equity_pct)) || 0).toFixed(2)}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Action Cards */}
      {scenarios.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {scenarios.map((s) => {
            const shifted = getShiftedMetrics(s);
            return (
              <div key={s.scenario_id} className="card" style={{ marginBottom: 0 }}>
                <div
                  className="card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--brand-primary)' }}>
                      {s.name}
                    </h4>
                    <div style={{ marginTop: '4px' }}>
                      {s.is_baseline ? (
                        <span
                          style={{
                            backgroundColor: 'rgba(37,99,235,0.12)',
                            color: '#2563eb',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          ⭐ Primary Baseline
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: 'rgba(124,58,237,0.12)',
                            color: '#7c3aed',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          Alternate Scheme
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', marginBottom: '16px' }}>
                    <div style={{ backgroundColor: '#f0fdf4', padding: '8px 10px', borderRadius: '6px' }}>
                      <span style={{ color: '#065f46', fontSize: '0.75rem', fontWeight: 600 }}>Net Profit:</span>
                      <div style={{ fontWeight: 800, color: '#047857', fontSize: '0.96rem' }}>
                        {formatCurrency(shifted.profit)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(37,99,235,0.06)', padding: '8px 10px', borderRadius: '6px' }}>
                      <span style={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>Margin on Cost:</span>
                      <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.96rem' }}>
                        {shifted.margin.toFixed(2)}%
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Units:</span>
                      <div style={{ fontWeight: 700 }}>{s.total_units} Units</div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Project IRR:</span>
                      <div style={{ fontWeight: 700, color: '#2563eb' }}>{s.project_irr.toFixed(2)}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {onScenarioSelected && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, padding: '7px 12px', fontWeight: 700 }}
                        onClick={() => onScenarioSelected(s.scenario_id)}
                      >
                        <span>Open Scheme</span>
                        <ArrowRight size={14} />
                      </button>
                    )}

                    <div className="action-btn-group">
                      <button
                        type="button"
                        className="action-btn"
                        title="Clone / Duplicate Scenario"
                        disabled={actionLoading}
                        onClick={() => handleClone(s)}
                      >
                        <Copy size={14} />
                      </button>

                      {!s.is_baseline && (
                        <>
                          <button
                            type="button"
                            className="action-btn"
                            title="Set as Primary Baseline"
                            disabled={actionLoading}
                            onClick={() => handleSetBaseline(s.scenario_id)}
                          >
                            <Check size={14} />
                          </button>

                          <button
                            type="button"
                            className="action-btn text-danger"
                            title="Delete Scenario Branch"
                            disabled={actionLoading}
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
