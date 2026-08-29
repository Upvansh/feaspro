import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Percent,
  Clock,
  Flame,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  SensitivityDashboardResponse,
  SensitivitySimulateResponse,
  Scenario,
} from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface SensitivityWorkspaceProps {
  projectId: string;
  scenario: Scenario;
}

type MatrixMetricMode = 'margin' | 'profit' | 'irr' | 'rlv';

export const SensitivityWorkspace: React.FC<SensitivityWorkspaceProps> = ({ projectId, scenario }) => {
  const [data, setData] = useState<SensitivityDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2D Matrix display mode
  const [matrixMode, setMatrixMode] = useState<MatrixMetricMode>('margin');

  // Interactive What-If Simulation Sliders
  const [priceShift, setPriceShift] = useState<number>(0);
  const [costShift, setCostShift] = useState<number>(0);
  const [rateDelta, setRateDelta] = useState<number>(0);
  const [delayMonths, setDelayMonths] = useState<number>(0);

  // Live simulation output
  const [simResult, setSimResult] = useState<SensitivitySimulateResponse | null>(null);

  const loadSensitivity = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getSensitivityAnalysis(projectId, scenario.id);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load sensitivity analysis.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadSensitivity();
  }, [loadSensitivity]);

  // Run on-the-fly simulation whenever slider values change
  const runSimulation = useCallback(async () => {
    try {
      const res = await api.simulateSensitivity(projectId, scenario.id, {
        price_shift_pct: priceShift,
        cost_shift_pct: costShift,
        interest_rate_delta_pct: rateDelta,
        delay_months: delayMonths,
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  }, [projectId, scenario.id, priceShift, costShift, rateDelta, delayMonths]);

  useEffect(() => {
    if (data) {
      runSimulation();
    }
  }, [priceShift, costShift, rateDelta, delayMonths, data, runSimulation]);

  const handleResetSliders = () => {
    setPriceShift(0);
    setCostShift(0);
    setRateDelta(0);
    setDelayMonths(0);
  };

  const applyPreset = (p: number, c: number, r: number, d: number) => {
    setPriceShift(p);
    setCostShift(c);
    setRateDelta(r);
    setDelayMonths(d);
  };

  if (loading) {
    return (
      <div className="content-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <RefreshCw className="spin-icon" size={36} style={{ color: 'var(--brand-accent)', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Computing Sensitivity & Stress Matrices...
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
          Generating 2D multi-variable price/cost heatmaps, interest rate shocks, and delay curves.
        </p>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="content-card" style={{ padding: '40px 20px', textAlign: 'center', borderColor: 'var(--danger-border)' }}>
        <AlertTriangle size={40} style={{ color: 'var(--danger-text)', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger-text)' }}>
          Unable to Load Sensitivity Dashboard
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
          {errorMessage || 'Sensitivity data could not be computed.'}
        </p>
        <button
          className="btn btn-secondary"
          onClick={loadSensitivity}
          style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} /> Retry Analysis
        </button>
      </div>
    );
  }

  const { baseline_kpis, matrix_2d, interest_rate_matrix, delay_stress_test, breakeven, tornado_ranking } = data;

  const toNum = (val: unknown) => parseFloat(String(val)) || 0;

  return (
    <div className="sensitivity-workspace-root">
      {/* Header Toolbar */}
      <div className="sensitivity-header-card">
        <div className="sh-left">
          <div className="badge-status-pill">
            <Flame size={14} style={{ color: '#ef4444' }} />
            <span>Phase 4: Sensitivity & Stress Testing</span>
          </div>
          <h2 className="sh-title">Market Volatility & Multi-Variable Stress Testing</h2>
          <p className="sh-subtitle">
            Evaluate project resilience across revenue shocks, construction cost escalation, interest rate shifts, and timeline delays for <strong>{scenario.name}</strong>.
          </p>
        </div>
        <div className="sh-right">
          <button className="btn btn-secondary" onClick={loadSensitivity} title="Recompute Matrices">
            <RefreshCw size={16} />
            <span>Refresh Analysis</span>
          </button>
        </div>
      </div>

      {/* ─── 1. INTERACTIVE WHAT-IF SIMULATION BAR ─── */}
      <div className="simulator-card">
        <div className="simulator-header">
          <div className="sim-title-wrap">
            <Zap size={18} style={{ color: '#f59e0b' }} />
            <h3>Live What-If Stress Simulator</h3>
          </div>
          <div className="sim-presets">
            <span className="preset-label">Quick Presets:</span>
            <button className="preset-btn" onClick={() => applyPreset(0, 0, 0, 0)}>
              Baseline (0/0)
            </button>
            <button className="preset-btn" onClick={() => applyPreset(10, -5, -0.5, 0)}>
              Bull (+10% / -5%)
            </button>
            <button className="preset-btn" onClick={() => applyPreset(-10, 10, 1.0, 3)}>
              Moderate Stress
            </button>
            <button className="preset-btn danger-preset" onClick={() => applyPreset(-15, 15, 2.5, 6)}>
              Severe Shock
            </button>
            {(priceShift !== 0 || costShift !== 0 || rateDelta !== 0 || delayMonths !== 0) && (
              <button className="preset-btn reset-btn" onClick={handleResetSliders} title="Reset to Baseline">
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="sliders-grid">
          {/* Slider 1: Sales Price Shift */}
          <div className="slider-box">
            <div className="slider-info">
              <span className="slider-label">Sales Realisation (GRV)</span>
              <span className={`slider-val ${priceShift > 0 ? 'text-green' : priceShift < 0 ? 'text-red' : ''}`}>
                {priceShift > 0 ? `+${priceShift}%` : `${priceShift}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={priceShift}
              onChange={(e) => setPriceShift(parseFloat(e.target.value))}
              className="range-slider"
            />
            <div className="slider-minmax">
              <span>-20% (Bear)</span>
              <span>0% (Base)</span>
              <span>+20% (Bull)</span>
            </div>
          </div>

          {/* Slider 2: Cost Shift */}
          <div className="slider-box">
            <div className="slider-info">
              <span className="slider-label">Construction & TDC Cost</span>
              <span className={`slider-val ${costShift > 0 ? 'text-red' : costShift < 0 ? 'text-green' : ''}`}>
                {costShift > 0 ? `+${costShift}%` : `${costShift}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={costShift}
              onChange={(e) => setCostShift(parseFloat(e.target.value))}
              className="range-slider"
            />
            <div className="slider-minmax">
              <span>-20% (Savings)</span>
              <span>0% (Base)</span>
              <span>+20% (Overrun)</span>
            </div>
          </div>

          {/* Slider 3: Interest Rate Delta */}
          <div className="slider-box">
            <div className="slider-info">
              <span className="slider-label">Interest Rate Shock</span>
              <span className={`slider-val ${rateDelta > 0 ? 'text-red' : rateDelta < 0 ? 'text-green' : ''}`}>
                {rateDelta > 0 ? `+${rateDelta.toFixed(1)}%` : `${rateDelta.toFixed(1)}%`} ({toNum(baseline_kpis.interest_rate_pct) + rateDelta}%)
              </span>
            </div>
            <input
              type="range"
              min="-3.0"
              max="4.0"
              step="0.5"
              value={rateDelta}
              onChange={(e) => setRateDelta(parseFloat(e.target.value))}
              className="range-slider"
            />
            <div className="slider-minmax">
              <span>-3.0% (Easing)</span>
              <span>0% (Base)</span>
              <span>+4.0% (Hike)</span>
            </div>
          </div>

          {/* Slider 4: Delay Months */}
          <div className="slider-box">
            <div className="slider-info">
              <span className="slider-label">Construction Slippage</span>
              <span className={`slider-val ${delayMonths > 0 ? 'text-red' : ''}`}>
                +{delayMonths} Months ({baseline_kpis.duration_months + delayMonths} mo)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={delayMonths}
              onChange={(e) => setDelayMonths(parseInt(e.target.value, 10))}
              className="range-slider"
            />
            <div className="slider-minmax">
              <span>On Schedule</span>
              <span>+6 mo</span>
              <span>+12 mo Delay</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Results Banner */}
        {simResult && (
          <div className={`simulation-results-band status-${simResult.status}`}>
            <div className="sim-kpi-item">
              <span className="sim-kpi-label">Simulated Profit</span>
              <span className="sim-kpi-val" style={{ color: toNum(simResult.simulated_net_profit) >= 0 ? '#059669' : '#dc2626' }}>
                {formatCurrency(simResult.simulated_net_profit)}
              </span>
              <span className="sim-kpi-diff">
                Base: {formatCurrency(baseline_kpis.net_profit)}
              </span>
            </div>

            <div className="sim-kpi-item">
              <span className="sim-kpi-label">Margin on Cost</span>
              <span className="sim-kpi-val" style={{ color: toNum(simResult.simulated_margin_on_cost_pct) >= 18 ? '#059669' : toNum(simResult.simulated_margin_on_cost_pct) >= 0 ? '#d97706' : '#dc2626' }}>
                {formatNumber(simResult.simulated_margin_on_cost_pct)}%
              </span>
              <span className="sim-kpi-diff">
                Base: {formatNumber(baseline_kpis.dev_margin_on_cost_pct)}%
              </span>
            </div>

            <div className="sim-kpi-item">
              <span className="sim-kpi-label">Projected IRR</span>
              <span className="sim-kpi-val" style={{ color: simResult.simulated_project_irr_pct >= 18 ? '#2563eb' : '#d97706' }}>
                {simResult.simulated_project_irr_pct.toFixed(1)}%
              </span>
              <span className="sim-kpi-diff">
                Base: {baseline_kpis.project_irr_pct.toFixed(1)}%
              </span>
            </div>

            <div className="sim-kpi-item">
              <span className="sim-kpi-label">Return on Equity (ROE)</span>
              <span className="sim-kpi-val">
                {formatNumber(simResult.simulated_return_on_equity_pct)}%
              </span>
              <span className="sim-kpi-diff">
                Equity: {formatCurrency(baseline_kpis.equity_amount)}
              </span>
            </div>

            <div className="sim-kpi-item">
              <span className="sim-kpi-label">Residual Land Value</span>
              <span className="sim-kpi-val">
                {formatCurrency(simResult.simulated_residual_land_value)}
              </span>
              <span className="sim-kpi-diff">
                Actual: {formatCurrency(baseline_kpis.land_cost)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. 2D MULTI-VARIABLE SENSITIVITY MATRIX (HEATMAP) ─── */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-title">2D Sensitivity Heatmap Matrix (Price vs Cost)</h3>
            <p className="card-subtitle">
              Comprehensive two-variable matrix evaluating financial returns across combinations of sales price and cost shifts.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="matrix-metric-switcher">
            <button
              className={`metric-tab-btn ${matrixMode === 'margin' ? 'active' : ''}`}
              onClick={() => setMatrixMode('margin')}
            >
              Dev Margin (%)
            </button>
            <button
              className={`metric-tab-btn ${matrixMode === 'profit' ? 'active' : ''}`}
              onClick={() => setMatrixMode('profit')}
            >
              Net Profit ($)
            </button>
            <button
              className={`metric-tab-btn ${matrixMode === 'irr' ? 'active' : ''}`}
              onClick={() => setMatrixMode('irr')}
            >
              Project IRR (%)
            </button>
            <button
              className={`metric-tab-btn ${matrixMode === 'rlv' ? 'active' : ''}`}
              onClick={() => setMatrixMode('rlv')}
            >
              Residual Land ($)
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="legend-title">Return Tiers:</span>
          <div className="legend-item"><span className="legend-dot status-optimal"></span> <strong>Optimal</strong> (≥20% Margin)</div>
          <div className="legend-item"><span className="legend-dot status-acceptable"></span> <strong>Acceptable</strong> (15% - 20%)</div>
          <div className="legend-item"><span className="legend-dot status-marginal"></span> <strong>Marginal</strong> (0% - 15%)</div>
          <div className="legend-item"><span className="legend-dot status-deficit"></span> <strong>Loss / Deficit</strong> (&lt;0%)</div>
        </div>

        {/* 2D Table Grid */}
        <div className="heatmap-table-wrap">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th className="th-corner">Cost Shift ↓ \ Price Shift →</th>
                {matrix_2d.price_steps.map((p) => (
                  <th key={p} className={`th-price-step ${p === 0 ? 'th-baseline' : ''}`}>
                    {p > 0 ? `+${p}%` : `${p}%`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix_2d.rows.map((row) => (
                <tr key={row.cost_shift_pct}>
                  <td className={`td-cost-step ${row.cost_shift_pct === 0 ? 'td-baseline' : ''}`}>
                    {row.cost_shift_pct > 0 ? `+${row.cost_shift_pct}%` : `${row.cost_shift_pct}%`}
                  </td>
                  {row.cells.map((cell) => {
                    let displayValue = '';
                    if (matrixMode === 'margin') {
                      displayValue = `${formatNumber(cell.dev_margin_on_cost_pct)}%`;
                    } else if (matrixMode === 'profit') {
                      displayValue = formatCurrency(cell.net_profit);
                    } else if (matrixMode === 'irr') {
                      displayValue = `${cell.project_irr_pct.toFixed(1)}%`;
                    } else if (matrixMode === 'rlv') {
                      displayValue = formatCurrency(cell.residual_land_value);
                    }

                    return (
                      <td
                        key={cell.price_shift_pct}
                        className={`heatmap-cell cell-${cell.status} ${cell.is_baseline ? 'cell-baseline-center' : ''}`}
                        title={`Price: ${cell.price_shift_pct > 0 ? '+' : ''}${cell.price_shift_pct}% | Cost: ${cell.cost_shift_pct > 0 ? '+' : ''}${cell.cost_shift_pct}%\nProfit: ${formatCurrency(cell.net_profit)}\nMargin: ${formatNumber(cell.dev_margin_on_cost_pct)}%\nIRR: ${cell.project_irr_pct.toFixed(1)}%\nRLV: ${formatCurrency(cell.residual_land_value)}`}
                      >
                        <div className="cell-val">{displayValue}</div>
                        {cell.is_baseline && <span className="baseline-tag">BASE</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 3. BREAKEVEN ANALYSIS SCORECARD ─── */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-title">Breakeven Thresholds & Safety Margins</h3>
            <p className="card-subtitle">
              Critical tolerance limits before development enters net negative cash flow.
            </p>
          </div>
          <span className="badge badge-active">
            Safety Margin: {formatNumber(breakeven.revenue_safety_buffer_pct)}%
          </span>
        </div>

        <div className="breakeven-grid">
          <div className="breakeven-card">
            <div className="be-label">Breakeven Sales Revenue (GRV)</div>
            <div className="be-val">{formatCurrency(breakeven.breakeven_grv)}</div>
            <div className="be-detail">
              Current GRV: <strong>{formatCurrency(breakeven.current_grv)}</strong>
            </div>
            <div className="be-buffer text-green">
              Buffer: <strong>{formatCurrency(breakeven.revenue_safety_buffer_dollar)}</strong> ({formatNumber(breakeven.revenue_safety_buffer_pct)}% drop tolerance)
            </div>
          </div>

          <div className="breakeven-card">
            <div className="be-label">Breakeven Rate per m² (NSA)</div>
            <div className="be-val">${formatNumber(breakeven.breakeven_rate_per_sqm)}/m²</div>
            <div className="be-detail">
              Current Rate: <strong>${formatNumber(breakeven.current_rate_per_sqm)}/m²</strong>
            </div>
            <div className="be-buffer text-green">
              Buffer: <strong>${formatNumber(toNum(breakeven.current_rate_per_sqm) - toNum(breakeven.breakeven_rate_per_sqm))}/m²</strong> minimum sales price
            </div>
          </div>

          <div className="breakeven-card">
            <div className="be-label">Maximum Cost Overrun Tolerance</div>
            <div className="be-val text-amber">+{formatNumber(breakeven.max_cost_overrun_pct)}%</div>
            <div className="be-detail">
              Max Tolerable TDC: <strong>{formatCurrency(breakeven.max_tolerable_cost)}</strong>
            </div>
            <div className="be-buffer">
              Headroom: <strong>{formatCurrency(breakeven.max_cost_overrun_dollar)}</strong> in additional cost
            </div>
          </div>

          <div className="breakeven-card">
            <div className="be-label">Maximum Land Purchase Tolerance</div>
            <div className="be-val">{formatCurrency(breakeven.max_tolerable_land_price)}</div>
            <div className="be-detail">
              Contract Land Price: <strong>{formatCurrency(breakeven.current_land_cost)}</strong>
            </div>
            <div className="be-buffer text-green">
              Acquisition Headroom: <strong>{formatCurrency(toNum(breakeven.max_tolerable_land_price) - toNum(breakeven.current_land_cost))}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. TWO-COLUMN STRESS TABLES: INTEREST RATES & DELAYS ─── */}
      <div className="stress-split-grid">
        {/* Left: Interest Rate Stress Matrix */}
        <div className="content-card">
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} style={{ color: '#2563eb' }} />
              <h3 className="card-title">Interest Rate Shock Scenarios</h3>
            </div>
            <span className="badge badge-draft">Base: {formatNumber(baseline_kpis.interest_rate_pct)}%</span>
          </div>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Rate Delta</th>
                  <th>Rate (%)</th>
                  <th style={{ textAlign: 'right' }}>Finance Cost</th>
                  <th style={{ textAlign: 'right' }}>Net Profit</th>
                  <th style={{ textAlign: 'right' }}>ROE (%)</th>
                </tr>
              </thead>
              <tbody>
                {interest_rate_matrix.map((row) => (
                  <tr key={row.rate_delta_pct} className={row.is_baseline ? 'row-baseline-highlight' : ''}>
                    <td style={{ fontWeight: 600 }}>
                      {row.rate_delta_pct > 0 ? `+${row.rate_delta_pct.toFixed(1)}%` : `${row.rate_delta_pct.toFixed(1)}%`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(row.interest_rate_pct)}%</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.total_finance_cost)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: toNum(row.net_profit_after_finance) >= 0 ? '#059669' : '#dc2626' }}>
                      {formatCurrency(row.net_profit_after_finance)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {formatNumber(row.return_on_equity_pct)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Construction Delay Slippage */}
        <div className="content-card">
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#d97706' }} />
              <h3 className="card-title">Timeline Delay & Holding Stress Test</h3>
            </div>
            <span className="badge badge-draft">Base: {baseline_kpis.duration_months} mo</span>
          </div>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Slippage</th>
                  <th>Duration</th>
                  <th style={{ textAlign: 'right' }}>Holding Cost</th>
                  <th style={{ textAlign: 'right' }}>Margin (%)</th>
                  <th style={{ textAlign: 'right' }}>IRR (%)</th>
                </tr>
              </thead>
              <tbody>
                {delay_stress_test.map((row) => (
                  <tr key={row.delay_months} className={row.is_baseline ? 'row-baseline-highlight' : ''}>
                    <td style={{ fontWeight: 600 }}>
                      {row.delay_months === 0 ? 'On Schedule' : `+${row.delay_months} Months`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.total_duration_months} mo</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.delay_months > 0 ? '#dc2626' : 'inherit' }}>
                      +{formatCurrency(row.total_delay_cost)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {formatNumber(row.dev_margin_on_cost_pct)}%
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.project_irr_pct >= 18 ? '#2563eb' : '#d97706' }}>
                      {row.project_irr_pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 5. TORNADO ELASTICITY RANKING ─── */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-title">Tornado Sensitivity Elasticity Ranking</h3>
            <p className="card-subtitle">
              Relative sensitivity of Net Development Profit to normalized ±10% parameter shifts across core project drivers.
            </p>
          </div>
          <span className="badge badge-active">Ranked by Elasticity</span>
        </div>

        <div className="tornado-list">
          {tornado_ranking.map((item) => (
            <div key={item.driver} className="tornado-row">
              <div className="tornado-meta">
                <span className="tornado-rank">#{item.rank}</span>
                <span className="tornado-driver">{item.driver}</span>
                <span className="tornado-swing-label">
                  Swing: <strong>{formatCurrency(item.profit_swing)}</strong> ({formatNumber(item.elasticity_pct)}% Elasticity)
                </span>
              </div>

              <div className="tornado-bar-container">
                <div className="tornado-bar-left" style={{ width: `${Math.min(50, (toNum(item.elasticity_pct) / 120) * 50)}%` }}>
                  <span className="tornado-val-caption">{formatCurrency(item.low_shock_profit)} (-10%)</span>
                </div>
                <div className="tornado-center-axis"></div>
                <div className="tornado-bar-right" style={{ width: `${Math.min(50, (toNum(item.elasticity_pct) / 120) * 50)}%` }}>
                  <span className="tornado-val-caption">{formatCurrency(item.high_shock_profit)} (+10%)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
