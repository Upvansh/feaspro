import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Coins,
  DollarSign,
  TrendingUp,
  Percent,
  ShieldCheck,
  Building,
  Sparkles,
  Plus,
  Trash2,
  ArrowUpDown,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  FundingAssumption,
  FundingCalculationSummary,
  FundingTranche,
  TrancheType,
  WaterfallResponse,
  Scenario,
} from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface FundingWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onFundingUpdated?: (summary: FundingCalculationSummary) => void;
}

const TRANCHE_CONFIG: Record<
  TrancheType,
  { label: string; color: string; bg: string; icon: string }
> = {
  senior_debt: {
    label: 'Senior Debt',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    icon: '🏦',
  },
  mezzanine: {
    label: 'Mezzanine Loan',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.1)',
    icon: '⚡',
  },
  preferred_equity: {
    label: 'Preferred Equity',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    icon: '🤝',
  },
  ordinary_equity: {
    label: 'Ordinary Equity',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    icon: '👔',
  },
};

const TRANCHE_TYPES: TrancheType[] = [
  'senior_debt',
  'mezzanine',
  'preferred_equity',
  'ordinary_equity',
];

const TRANCHE_PRESETS = [
  {
    name: 'Senior Construction Debt',
    tranche_type: 'senior_debt' as TrancheType,
    amount: 55000000,
    hurdle_rate_pct: 0,
    investor_split_pct: 100,
    developer_promote_pct: 0,
  },
  {
    name: 'Mezzanine Subordinated Debt',
    tranche_type: 'mezzanine' as TrancheType,
    amount: 12000000,
    hurdle_rate_pct: 0,
    investor_split_pct: 100,
    developer_promote_pct: 0,
  },
  {
    name: 'LP Investor Preferred Equity',
    tranche_type: 'preferred_equity' as TrancheType,
    amount: 15000000,
    hurdle_rate_pct: 8.0,
    investor_split_pct: 80,
    developer_promote_pct: 20,
  },
  {
    name: 'Developer / GP Sponsor Equity',
    tranche_type: 'ordinary_equity' as TrancheType,
    amount: 3000000,
    hurdle_rate_pct: 0,
    investor_split_pct: 20,
    developer_promote_pct: 80,
  },
];

const toNum = (v: unknown) => parseFloat(String(v)) || 0;

export const FundingWorkspace: React.FC<FundingWorkspaceProps> = ({
  projectId,
  scenario,
  onFundingUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [seniorDebtEnabled, setSeniorDebtEnabled] = useState<boolean>(true);
  const [seniorMaxLtc, setSeniorMaxLtc] = useState<string>('70.00');
  const [seniorMaxLvr, setSeniorMaxLvr] = useState<string>('65.00');
  const [seniorInterestRate, setSeniorInterestRate] = useState<string>('8.50');
  const [seniorLineFee, setSeniorLineFee] = useState<string>('1.50');
  const [seniorEstFee, setSeniorEstFee] = useState<string>('1.00');
  const [mezzanineEnabled, setMezzanineEnabled] = useState<boolean>(false);
  const [mezzanineAmount, setMezzanineAmount] = useState<string>('0');
  const [mezzanineInterestRate, setMezzanineInterestRate] = useState<string>('15.00');
  const [targetEquity, setTargetEquity] = useState<string>('0');
  const [summary, setSummary] = useState<FundingCalculationSummary | null>(null);

  const [tranches, setTranches] = useState<FundingTranche[]>([]);
  const [waterfall, setWaterfall] = useState<WaterfallResponse | null>(null);
  const [trancheError, setTrancheError] = useState<string | null>(null);
  const [savingTranche, setSavingTranche] = useState<string | null>(null);

  const refreshWaterfall = useCallback(async () => {
    try {
      const wf = await api.getWaterfall(projectId, scenario.id);
      setWaterfall(wf);
    } catch {
      setWaterfall(null);
    }
  }, [projectId, scenario.id]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [fundingRes, trancheRes] = await Promise.all([
        api.getFunding(projectId, scenario.id),
        api.listTranches(projectId, scenario.id).catch(() => [] as FundingTranche[]),
      ]);
      const a = fundingRes.assumption;
      setSeniorDebtEnabled(a.senior_debt_enabled);
      setSeniorMaxLtc(String(a.senior_max_ltc_pct ?? '70.00'));
      setSeniorMaxLvr(String(a.senior_max_lvr_pct ?? '65.00'));
      setSeniorInterestRate(String(a.senior_interest_rate_pct ?? '8.50'));
      setSeniorLineFee(String(a.senior_line_fee_pct ?? '1.50'));
      setSeniorEstFee(String(a.senior_establishment_fee_pct ?? '1.00'));
      setMezzanineEnabled(a.mezzanine_enabled);
      setMezzanineAmount(String(a.mezzanine_amount ?? '0'));
      setMezzanineInterestRate(String(a.mezzanine_interest_rate_pct ?? '15.00'));
      setTargetEquity(String(a.target_equity_contribution ?? '0'));
      setSummary(fundingRes.summary);
      setTranches(trancheRes);
      if (onFundingUpdated) onFundingUpdated(fundingRes.summary);
      if (trancheRes.length > 0) await refreshWaterfall();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load funding data.');
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, onFundingUpdated, refreshWaterfall]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);
    try {
      const payload: Partial<FundingAssumption> = {
        senior_debt_enabled: seniorDebtEnabled,
        senior_max_ltc_pct: parseFloat(seniorMaxLtc) || 70.0,
        senior_max_lvr_pct: parseFloat(seniorMaxLvr) || 65.0,
        senior_interest_rate_pct: parseFloat(seniorInterestRate) || 8.5,
        senior_line_fee_pct: parseFloat(seniorLineFee) || 1.5,
        senior_establishment_fee_pct: parseFloat(seniorEstFee) || 1.0,
        mezzanine_enabled: mezzanineEnabled,
        mezzanine_amount: parseFloat(mezzanineAmount) || 0,
        mezzanine_interest_rate_pct: parseFloat(mezzanineInterestRate) || 15.0,
        target_equity_contribution: parseFloat(targetEquity) || 0,
      };
      const res = await api.updateFunding(projectId, scenario.id, payload);
      setSummary(res.summary);
      setSaveSuccess(true);
      if (onFundingUpdated) onFundingUpdated(res.summary);
      setTimeout(() => setSaveSuccess(false), 4000);
      if (tranches.length > 0) await refreshWaterfall();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save funding.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTranche = async (preset?: typeof TRANCHE_PRESETS[0]) => {
    try {
      setTrancheError(null);
      const newT = await api.createTranche(projectId, scenario.id, {
        tranche_type: preset?.tranche_type || 'ordinary_equity',
        name: preset?.name || `Equity Tranche ${tranches.length + 1}`,
        priority_order: tranches.length + 1,
        amount: preset?.amount || 0,
        hurdle_rate_pct: preset?.hurdle_rate_pct || 0,
        investor_split_pct: preset?.investor_split_pct ?? 80,
        developer_promote_pct: preset?.developer_promote_pct ?? 20,
      });
      setTranches((prev) => [...prev, newT]);
      await refreshWaterfall();
    } catch {
      setTrancheError('Failed to add tranche.');
    }
  };

  const handleUpdateTranche = (
    tranche: FundingTranche,
    field: keyof FundingTranche,
    value: string | number
  ) => {
    setTranches((prev) =>
      prev.map((t) => {
        if (t.id !== tranche.id) return t;
        const updated = { ...t, [field]: value };
        // Auto-balance investor & developer promote splits
        if (field === 'investor_split_pct') {
          const inv = Math.min(100, Math.max(0, parseFloat(String(value)) || 0));
          updated.developer_promote_pct = 100 - inv;
        } else if (field === 'developer_promote_pct') {
          const prom = Math.min(100, Math.max(0, parseFloat(String(value)) || 0));
          updated.investor_split_pct = 100 - prom;
        }
        return updated;
      })
    );
  };

  const handleSaveTranche = async (tranche: FundingTranche) => {
    if (!tranche.id) return;
    setSavingTranche(tranche.id);
    try {
      const saved = await api.updateTranche(projectId, scenario.id, tranche.id, {
        tranche_type: tranche.tranche_type,
        name: tranche.name,
        priority_order: tranche.priority_order,
        amount: toNum(tranche.amount),
        hurdle_rate_pct: toNum(tranche.hurdle_rate_pct),
        investor_split_pct: toNum(tranche.investor_split_pct),
        developer_promote_pct: toNum(tranche.developer_promote_pct),
      });
      setTranches((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      await refreshWaterfall();
    } catch {
      setTrancheError('Failed to save tranche.');
    } finally {
      setSavingTranche(null);
    }
  };

  const handleDeleteTranche = async (id: string) => {
    try {
      await api.deleteTranche(projectId, scenario.id, id);
      setTranches((prev) => prev.filter((t) => t.id !== id));
      await refreshWaterfall();
    } catch {
      setTrancheError('Failed to delete tranche.');
    }
  };

  const seniorFacility = toNum(summary?.senior_debt_facility_limit);
  const reqEquity = toNum(summary?.required_developer_equity);
  const financeCost = toNum(summary?.total_estimated_finance_cost);
  const roe = toNum(summary?.return_on_equity_pct);
  const debtPct = toNum(summary?.debt_percentage);
  const equityPct = toNum(summary?.equity_percentage);
  const totalTrancheAmt = tranches.reduce((s, t) => s + toNum(t.amount), 0);
  const netProfit = toNum(waterfall?.net_profit_after_finance);
  const totalDist = toNum(waterfall?.waterfall.total_distributed);
  const recon = toNum(waterfall?.waterfall.reconciliation_difference);

  const sortedTranches = [...tranches].sort((a, b) => a.priority_order - b.priority_order);

  if (loading && !summary) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading capital stack & funding structure...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error:</strong> {errorMessage}
          </div>
        </div>
      )}
      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Capital stack and funding parameters updated successfully!
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Senior Debt Facility</span>
            <Building size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(seniorFacility)}</div>
          <div className="kpi-subtext">
            Constrained by <strong>{summary?.constraining_factor || 'LTC Limit'}</strong>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Required Sponsor Equity</span>
            <Coins size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(reqEquity)}</div>
          <div className="kpi-subtext">{equityPct.toFixed(1)}% of Total Development Cost</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Estimated Finance Costs</span>
            <DollarSign size={18} className="kpi-icon text-warning" />
          </div>
          <div className="kpi-value text-warning">{formatCurrency(financeCost)}</div>
          <div className="kpi-subtext">Interest, Line & Establishment Fees</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Return on Equity (ROE)</span>
            <TrendingUp size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value">{roe.toFixed(2)}%</div>
          <div className="kpi-subtext">Net Developer Equity Multiplier</div>
        </div>
      </div>

      {/* Hero Capital Stack Visual Composition Bar */}
      <div className="cost-distribution-hero" style={{ marginBottom: '24px' }}>
        <div className="cost-distribution-header">
          <div className="cost-distribution-title">
            <PieIcon size={16} color="var(--brand-accent)" />
            <span>Interactive Capital Stack Structure & Waterfall Hierarchy</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total Capitalization: <strong>{formatCurrency(totalTrancheAmt > 0 ? totalTrancheAmt : seniorFacility + reqEquity)}</strong>
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="cost-distribution-bar-track">
          {tranches.length > 0 && totalTrancheAmt > 0 ? (
            sortedTranches.map((t) => {
              const amt = toNum(t.amount);
              const pct = (amt / totalTrancheAmt) * 100;
              const config = TRANCHE_CONFIG[t.tranche_type] || TRANCHE_CONFIG.ordinary_equity;
              return (
                <div
                  key={t.id}
                  className="cost-distribution-segment"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: config.color,
                  }}
                  title={`${t.name}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                >
                  {pct >= 10 ? `${pct.toFixed(0)}%` : ''}
                </div>
              );
            })
          ) : (
            <>
              <div
                className="cost-distribution-segment"
                style={{ width: `${debtPct}%`, backgroundColor: '#2563eb' }}
                title={`Senior Debt: ${formatCurrency(seniorFacility)} (${debtPct.toFixed(1)}%)`}
              >
                {debtPct >= 12 ? `Debt (${debtPct.toFixed(0)}%)` : ''}
              </div>
              <div
                className="cost-distribution-segment"
                style={{ width: `${equityPct}%`, backgroundColor: '#10b981' }}
                title={`Developer Equity: ${formatCurrency(reqEquity)} (${equityPct.toFixed(1)}%)`}
              >
                {equityPct >= 12 ? `Equity (${equityPct.toFixed(0)}%)` : ''}
              </div>
            </>
          )}
        </div>

        {/* Legend Chips */}
        <div className="cost-distribution-legend">
          {tranches.length > 0 && totalTrancheAmt > 0 ? (
            sortedTranches.map((t) => {
              const amt = toNum(t.amount);
              const pct = (amt / totalTrancheAmt) * 100;
              const config = TRANCHE_CONFIG[t.tranche_type] || TRANCHE_CONFIG.ordinary_equity;
              return (
                <div key={t.id} className="cost-legend-chip">
                  <span className="cost-legend-dot" style={{ backgroundColor: config.color }} />
                  <strong>#{t.priority_order} {t.name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(amt)} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })
          ) : (
            <>
              <div className="cost-legend-chip">
                <span className="cost-legend-dot" style={{ backgroundColor: '#2563eb' }} />
                <strong>Senior Debt Facility</strong>
                <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(seniorFacility)}</span>
              </div>
              <div className="cost-legend-chip">
                <span className="cost-legend-dot" style={{ backgroundColor: '#10b981' }} />
                <strong>Developer Equity</strong>
                <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(reqEquity)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Funding Tranches Table Card */}
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
              <Coins size={20} />
            </div>
            <div>
              <h3 className="card-title">Funding Tranches & Capital Hierarchy</h3>
              <p className="card-subtitle">
                Configure debt facilities, preferred equity hurdles, and GP promote waterfall splits.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleAddTranche()}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Plus size={16} />
            <span>Add Tranche</span>
          </button>
        </div>

        <div className="card-body">
          {/* Quick Presets Toolbar */}
          <div className="cost-presets-toolbar" style={{ marginBottom: '16px' }}>
            <span className="cost-preset-label">⚡ Capital Presets:</span>
            {TRANCHE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="cost-preset-btn"
                onClick={() => handleAddTranche(preset)}
                title={`Add ${preset.name}`}
              >
                <Plus size={13} />
                <span>{preset.name.split(' (')[0]}</span>
              </button>
            ))}
          </div>

          {trancheError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{trancheError}</span>
            </div>
          )}

          {tranches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <ArrowUpDown size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p>No funding tranches configured. Use quick presets above or click "Add Tranche" to begin.</p>
            </div>
          ) : (
            <div className="cost-table-wrapper">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '70px', width: '6%', textAlign: 'center' }}>Priority</th>
                    <th style={{ minWidth: '220px', width: '22%' }}>Tranche Name</th>
                    <th style={{ minWidth: '180px', width: '18%' }}>Capital Type</th>
                    <th style={{ minWidth: '160px', width: '18%' }}>Amount ($)</th>
                    <th style={{ minWidth: '120px', width: '12%', textAlign: 'center' }}>Hurdle (%)</th>
                    <th style={{ minWidth: '120px', width: '12%', textAlign: 'center' }}>Investor (%)</th>
                    <th style={{ minWidth: '120px', width: '12%', textAlign: 'center' }}>Promote (%)</th>
                    <th style={{ minWidth: '60px', width: '6%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTranches.map((t) => {
                    const config = TRANCHE_CONFIG[t.tranche_type] || TRANCHE_CONFIG.ordinary_equity;
                    const amt = toNum(t.amount);
                    const pctOfCap = totalTrancheAmt > 0 ? ((amt / totalTrancheAmt) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={t.id}>
                        {/* Priority Order */}
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            className="timing-input-box"
                            style={{ width: '44px', fontWeight: 700, textAlign: 'center' }}
                            value={t.priority_order}
                            min={1}
                            max={20}
                            onChange={(e) =>
                              handleUpdateTranche(t, 'priority_order', parseInt(e.target.value) || 1)
                            }
                            onBlur={() => handleSaveTranche(t)}
                          />
                        </td>

                        {/* Tranche Name */}
                        <td>
                          <input
                            type="text"
                            className="cost-desc-input"
                            value={t.name}
                            placeholder="e.g. LP Preferred Equity"
                            onChange={(e) => handleUpdateTranche(t, 'name', e.target.value)}
                            onBlur={() => handleSaveTranche(t)}
                          />
                          <div style={{ fontSize: '0.68rem', color: config.color, fontWeight: 700, marginTop: '2px' }}>
                            {pctOfCap}% of Capital Stack
                          </div>
                        </td>

                        {/* Capital Type Dropdown */}
                        <td>
                          <select
                            className="cost-select-styled"
                            value={t.tranche_type}
                            onChange={(e) => {
                              const v = e.target.value as TrancheType;
                              handleUpdateTranche(t, 'tranche_type', v);
                              setTimeout(() => handleSaveTranche({ ...t, tranche_type: v }), 0);
                            }}
                            style={{
                              borderLeft: `5px solid ${config.color}`,
                              paddingLeft: '10px',
                            }}
                          >
                            {TRANCHE_TYPES.map((tt) => (
                              <option key={tt} value={tt}>
                                {TRANCHE_CONFIG[tt]?.icon} {TRANCHE_CONFIG[tt]?.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Amount ($) */}
                        <td>
                          <div className="cost-input-group">
                            <span className="cost-currency-prefix">$</span>
                            <input
                              type="number"
                              step="1000"
                              className="cost-input-formatted"
                              value={t.amount}
                              onChange={(e) => handleUpdateTranche(t, 'amount', e.target.value)}
                              onBlur={() => handleSaveTranche(t)}
                            />
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                            {formatCurrency(amt)}
                          </div>
                        </td>

                        {/* Hurdle Rate (%) */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              className="timing-input-box"
                              style={{ width: '56px', fontWeight: 600, textAlign: 'center' }}
                              value={t.hurdle_rate_pct}
                              disabled={t.tranche_type !== 'preferred_equity'}
                              onChange={(e) => handleUpdateTranche(t, 'hurdle_rate_pct', e.target.value)}
                              onBlur={() => handleSaveTranche(t)}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                          </div>
                        </td>

                        {/* Investor Split (%) */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              step="1"
                              min={0}
                              max={100}
                              className="timing-input-box"
                              style={{ width: '56px', fontWeight: 600, textAlign: 'center' }}
                              value={t.investor_split_pct}
                              disabled={t.tranche_type !== 'ordinary_equity' && t.tranche_type !== 'preferred_equity'}
                              onChange={(e) => handleUpdateTranche(t, 'investor_split_pct', e.target.value)}
                              onBlur={() => handleSaveTranche(t)}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                          </div>
                        </td>

                        {/* Developer Promote (%) */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              step="1"
                              min={0}
                              max={100}
                              className="timing-input-box"
                              style={{ width: '56px', fontWeight: 600, textAlign: 'center' }}
                              value={t.developer_promote_pct}
                              disabled={t.tranche_type !== 'ordinary_equity' && t.tranche_type !== 'preferred_equity'}
                              onChange={(e) => handleUpdateTranche(t, 'developer_promote_pct', e.target.value)}
                              onBlur={() => handleSaveTranche(t)}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-btn-group">
                            {savingTranche === t.id ? (
                              <div className="loading-spinner" style={{ width: '16px', height: '16px', margin: '6px' }} />
                            ) : (
                              <button
                                type="button"
                                className="action-btn text-danger"
                                onClick={() => t.id && handleDeleteTranche(t.id)}
                                title="Delete Tranche"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totals */}
                <tfoot>
                  <tr style={{ fontWeight: 700, backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={3} style={{ padding: '12px 16px' }}>
                      <strong>Total Capital Stack: {sortedTranches.length} Tranches</strong>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--brand-accent)', fontSize: '1.05rem', fontWeight: 800 }}>
                      {formatCurrency(totalTrancheAmt)}
                    </td>
                    <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Auto Waterfall Ready
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Waterfall Results Panel */}
      {waterfall && tranches.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">Distribution Waterfall Simulation</h3>
              <p className="card-subtitle">
                Tier-by-tier capital return and promote profit distribution.
              </p>
            </div>
            {Math.abs(recon) < 0.01 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={14} />
                <span>100% Balanced & Reconciled</span>
              </span>
            )}
          </div>

          <div className="card-body">
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Tier 1 */}
              <div style={{ background: '#f0f9ff', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Tier 1 — Return of Invested Capital</span>
                </h4>
                {waterfall.waterfall.tier1_return_of_capital.map((item, i, arr) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid #e0f2fe' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>{item.tranche_name}</span>
                    <strong style={{ color: '#0369a1', fontSize: '0.95rem' }}>{formatCurrency(toNum(item.capital_returned))}</strong>
                  </div>
                ))}
              </div>

              {/* Tier 2 */}
              {waterfall.waterfall.tier2_preferred_return.length > 0 && (
                <div style={{ background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '0.95rem', fontWeight: 700 }}>
                    Tier 2 — Preferred Return Hurdle
                  </h4>
                  {waterfall.waterfall.tier2_preferred_return.map((item, i, arr) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #fef3c7' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>{item.tranche_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Target Hurdle: {formatCurrency(toNum(item.preferred_return_target))}
                          {toNum(item.shortfall) > 0 ? ` · Shortfall: ${formatCurrency(toNum(item.shortfall))}` : ''}
                        </div>
                      </div>
                      <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>{formatCurrency(toNum(item.preferred_return_paid))}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Tier 3 */}
              {waterfall.waterfall.tier3_residual_split.length > 0 && (
                <div style={{ background: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#065f46', fontSize: '0.95rem', fontWeight: 700 }}>
                    Tier 3 — Residual Profit & Developer Promote Split
                  </h4>
                  {waterfall.waterfall.tier3_residual_split.map((item, i, arr) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #dcfce7' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px' }}>{item.tranche_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          Investors ({item.investor_split_pct.toFixed(0)}%)
                        </span>
                        <strong style={{ color: '#065f46' }}>{formatCurrency(toNum(item.investor_distribution))}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          Developer Promote ({item.developer_promote_pct.toFixed(0)}%)
                        </span>
                        <strong style={{ color: '#065f46' }}>{formatCurrency(toNum(item.developer_promote_distribution))}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reconciliation Footer */}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Total Profit Distributed</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{formatCurrency(totalDist)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Available Net Proceeds</span>
                  <strong style={{ fontSize: '1rem', color: '#2563eb' }}>{formatCurrency(netProfit)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Reconciliation Difference</span>
                  <strong style={{ fontSize: '1rem', color: Math.abs(recon) < 0.01 ? '#059669' : '#dc2626' }}>
                    {formatCurrency(recon)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Senior Construction Debt & Mezzanine Facility Parameters */}
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Senior Loan Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  className="section-icon-badge"
                  style={{
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    color: '#2563eb',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="card-title">Senior Construction Loan</h3>
                  <p className="card-subtitle">Primary bank or institutional debt facility</p>
                </div>
              </div>

              <div
                className="gst-toggle-switch"
                onClick={() => setSeniorDebtEnabled(!seniorDebtEnabled)}
              >
                <div className={`gst-switch-track ${seniorDebtEnabled ? 'active' : ''}`}>
                  <div className="gst-switch-thumb" />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {seniorDebtEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Max Loan-to-Cost (LTC %)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="cost-desc-input"
                    value={seniorMaxLtc}
                    onChange={(e) => setSeniorMaxLtc(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  LTC Cap: {formatCurrency(toNum(summary?.senior_ltc_cap))}
                </span>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Max Loan-to-Value (LVR %)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="cost-desc-input"
                    value={seniorMaxLvr}
                    onChange={(e) => setSeniorMaxLvr(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  LVR Cap: {formatCurrency(toNum(summary?.senior_lvr_cap))}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Interest Rate (% p.a.)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="cost-desc-input"
                      value={seniorInterestRate}
                      onChange={(e) => setSeniorInterestRate(e.target.value)}
                      disabled={!seniorDebtEnabled}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Line Fee (% p.a.)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="cost-desc-input"
                      value={seniorLineFee}
                      onChange={(e) => setSeniorLineFee(e.target.value)}
                      disabled={!seniorDebtEnabled}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Establishment Fee (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="cost-desc-input"
                    value={seniorEstFee}
                    onChange={(e) => setSeniorEstFee(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mezzanine & Equity Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  className="section-icon-badge"
                  style={{
                    backgroundColor: 'rgba(124,58,237,0.1)',
                    color: '#7c3aed',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <Percent size={20} />
                </div>
                <div>
                  <h3 className="card-title">Mezzanine & Equity Sizing</h3>
                  <p className="card-subtitle">Secondary financing and sponsor equity sizing</p>
                </div>
              </div>

              <div
                className="gst-toggle-switch"
                onClick={() => setMezzanineEnabled(!mezzanineEnabled)}
              >
                <div className={`gst-switch-track ${mezzanineEnabled ? 'active' : ''}`}>
                  <div className="gst-switch-thumb" />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {mezzanineEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Mezzanine Loan Facility ($)</label>
                <div className="cost-input-group">
                  <span className="cost-currency-prefix">$</span>
                  <input
                    type="number"
                    step="1000"
                    className="cost-input-formatted"
                    value={mezzanineAmount}
                    onChange={(e) => setMezzanineAmount(e.target.value)}
                    disabled={!mezzanineEnabled}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Mezzanine Interest Rate (% p.a.)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="cost-desc-input"
                    value={mezzanineInterestRate}
                    onChange={(e) => setMezzanineInterestRate(e.target.value)}
                    disabled={!mezzanineEnabled}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Calculated Required Equity</label>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Required Equity:</span>
                  <strong style={{ fontSize: '1.05rem', color: '#059669' }}>
                    {formatCurrency(reqEquity)}
                  </strong>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Total Project Cost minus Senior Debt & Mezzanine
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Funding structure updates cash flow, returns, and waterfall engine</span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '160px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Funding'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
