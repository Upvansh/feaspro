import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Coins,
  FileText,
  DollarSign,
  Sparkles,
  PieChart as PieIcon,
  Info,
} from 'lucide-react';
import { LandInput, LandInputUpdate, Scenario, AcquisitionCostItem } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface LandWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onLandUpdated?: (land: LandInput) => void;
}

interface CostRow {
  id?: string;
  category: string;
  name: string;
  amount: string;
  notes: string;
  date: string;
}

const ACQUISITION_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  stamp_duty: { label: 'Stamp / Transfer Duty', color: '#7c3aed', icon: '📜' },
  legal_fees: { label: 'Legal & Conveyancing', color: '#0284c7', icon: '⚖️' },
  due_diligence: { label: 'Due Diligence & Site Tests', color: '#059669', icon: '🧪' },
  valuation_fees: { label: 'Valuation & Advisory', color: '#d97706', icon: '📊' },
  agent_fees: { label: 'Buyer’s Agent / Acquisition Fee', color: '#2563eb', icon: '🤝' },
  other: { label: 'Other Acquisition Cost', color: '#64748b', icon: '📁' },
};

export const LandWorkspace: React.FC<LandWorkspaceProps> = ({
  projectId,
  scenario,
  onLandUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form States
  const [purchasePrice, setPurchasePrice] = useState<string>('0');
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [contractDate, setContractDate] = useState<string>('');
  const [depositDueDate, setDepositDueDate] = useState<string>('');
  const [settlementDate, setSettlementDate] = useState<string>('');

  const [siteArea, setSiteArea] = useState<string>('');
  const [siteAreaUnit, setSiteAreaUnit] = useState<string>('m²');
  const [currentZoning, setCurrentZoning] = useState<string>('');
  const [existingImprovements, setExistingImprovements] = useState<string>('');
  const [planningNotes, setPlanningNotes] = useState<string>('');
  const [devPotentialNotes, setDevPotentialNotes] = useState<string>('');

  const [costRows, setCostRows] = useState<CostRow[]>([]);

  // Load Land Data for Current Scenario
  const loadLandData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const land = await api.getLand(projectId, scenario.id);

      setPurchasePrice(String(land.purchase_price ?? 0));
      setDepositAmount(String(land.deposit_amount ?? 0));
      setContractDate(land.contract_date || '');
      setDepositDueDate(land.deposit_due_date || '');
      setSettlementDate(land.settlement_date || '');

      setSiteArea(land.site_area ? String(land.site_area) : '');
      setSiteAreaUnit(land.site_area_unit || 'm²');
      setCurrentZoning(land.current_zoning || '');
      setExistingImprovements(land.existing_improvements || '');
      setPlanningNotes(land.planning_notes || '');
      setDevPotentialNotes(land.development_potential_notes || '');

      setCostRows(
        land.acquisition_costs.map((c: AcquisitionCostItem) => ({
          id: c.id,
          category: c.category || 'other',
          name: c.name || '',
          amount: String(c.amount ?? 0),
          notes: c.notes || '',
          date: c.date || '',
        }))
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load land and acquisition data.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadLandData();
  }, [loadLandData]);

  // Reactive Calculations
  const numPurchasePrice = useMemo(() => parseFloat(purchasePrice) || 0, [purchasePrice]);
  const numDepositAmount = useMemo(() => parseFloat(depositAmount) || 0, [depositAmount]);
  const totalAcquisitionCosts = useMemo(
    () => costRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [costRows]
  );
  const totalLandAcquisition = numPurchasePrice + totalAcquisitionCosts;
  const remainingPurchaseAmount = Math.max(0, numPurchasePrice - numDepositAmount);

  // Site rate metrics
  const numSiteArea = parseFloat(siteArea) || 0;
  const ratePerSqmSite = numSiteArea > 0 ? numPurchasePrice / numSiteArea : 0;
  const depositPct = numPurchasePrice > 0 ? (numDepositAmount / numPurchasePrice) * 100 : 0;

  // Add Cost Row
  const handleAddCostRow = (presetCategory: string = 'other') => {
    setCostRows([
      ...costRows,
      {
        category: presetCategory,
        name: `New ${ACQUISITION_CATEGORY_CONFIG[presetCategory]?.label || 'Acquisition'} Cost`,
        amount: '10000',
        notes: '',
        date: contractDate || '',
      },
    ]);
  };

  // Quick Preset Adders
  const handleApplyPreset = (type: string) => {
    if (type === 'stamp_duty') {
      const estimatedDuty = Math.round(numPurchasePrice * 0.055);
      setCostRows([
        ...costRows,
        {
          category: 'stamp_duty',
          name: 'State Government Transfer / Stamp Duty (~5.5%)',
          amount: String(estimatedDuty > 0 ? estimatedDuty : 125000),
          notes: 'Standard residential/commercial statutory transfer duty',
          date: contractDate || '',
        },
      ]);
    } else if (type === 'legal_fees') {
      setCostRows([
        ...costRows,
        {
          category: 'legal_fees',
          name: 'Legal Due Diligence & Conveyancing Fees',
          amount: '18000',
          notes: 'Contract review, title searches and settlement representation',
          date: contractDate || '',
        },
      ]);
    } else if (type === 'due_diligence') {
      setCostRows([
        ...costRows,
        {
          category: 'due_diligence',
          name: 'Geotechnical & Environmental Phase 1 Site Audit',
          amount: '25000',
          notes: 'Soil boreholes, contamination screening and survey',
          date: contractDate || '',
        },
      ]);
    } else if (type === 'valuation') {
      setCostRows([
        ...costRows,
        {
          category: 'valuation_fees',
          name: 'As-Is & As-If-Complete Bank Feasibility Valuation',
          amount: '15000',
          notes: 'Independent API registered valuer mortgage report',
          date: contractDate || '',
        },
      ]);
    }
  };

  // Auto calculate 10% deposit
  const handleAutoDeposit = (pct: number = 10) => {
    if (numPurchasePrice > 0) {
      setDepositAmount(String(Math.round(numPurchasePrice * (pct / 100))));
    }
  };

  // Update Cost Row
  const handleUpdateCostRow = (index: number, field: keyof CostRow, value: string) => {
    const updated = [...costRows];
    updated[index] = { ...updated[index], [field]: value };
    setCostRows(updated);
  };

  // Remove Cost Row
  const handleRemoveCostRow = (index: number) => {
    setCostRows(costRows.filter((_, i) => i !== index));
  };

  // Save Land Data
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: LandInputUpdate = {
        purchase_price: numPurchasePrice,
        deposit_amount: numDepositAmount,
        contract_date: contractDate || null,
        deposit_due_date: depositDueDate || null,
        settlement_date: settlementDate || null,
        site_area: siteArea ? parseFloat(siteArea) : null,
        site_area_unit: siteAreaUnit,
        current_zoning: currentZoning.trim() || null,
        existing_improvements: existingImprovements.trim() || null,
        planning_notes: planningNotes.trim() || null,
        development_potential_notes: devPotentialNotes.trim() || null,
        acquisition_costs: costRows.map((r) => ({
          category: r.category,
          name: r.name.trim() || 'Cost Item',
          amount: parseFloat(r.amount) || 0,
          notes: r.notes.trim() || null,
          date: r.date || null,
        })),
      };

      const updatedLand = await api.updateLand(projectId, scenario.id, payload);
      setSaveSuccess(true);
      if (onLandUpdated) onLandUpdated(updatedLand);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save land details.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading land and site parameters...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving land:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Land valuation, acquisition schedule, and planning inputs saved successfully!
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Site Purchase Price</span>
            <DollarSign size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(numPurchasePrice)}</div>
          <div className="kpi-subtext">
            {numSiteArea > 0 ? `${formatCurrency(ratePerSqmSite)}/m² Land Area` : 'Base contract agreed sum'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Acquisition Costs & Duties</span>
            <Coins size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatCurrency(totalAcquisitionCosts)}</div>
          <div className="kpi-subtext">
            {totalLandAcquisition > 0
              ? `${((totalAcquisitionCosts / totalLandAcquisition) * 100).toFixed(1)}% of Land Cap`
              : `${costRows.length} itemized lines`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Land Capitalization</span>
            <PieIcon size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(totalLandAcquisition)}</div>
          <div className="kpi-subtext">Purchase + Stamp Duty + Due Diligence</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Settlement Balance</span>
            <Calendar size={18} className="kpi-icon text-warning" />
          </div>
          <div className="kpi-value text-warning">{formatCurrency(remainingPurchaseAmount)}</div>
          <div className="kpi-subtext">
            Less deposit of {formatCurrency(numDepositAmount)} ({depositPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Hero Visual Land Capitalization Composition Bar */}
      <div className="cost-distribution-hero">
        <div className="cost-distribution-header">
          <div className="cost-distribution-title">
            <PieIcon size={16} color="var(--brand-accent)" />
            <span>Land Capitalization Composition Breakdown</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total Capitalized: <strong>{formatCurrency(totalLandAcquisition)}</strong>
          </span>
        </div>

        {/* Stacked Progress Track */}
        <div className="cost-distribution-bar-track">
          {totalLandAcquisition > 0 && (
            <>
              <div
                className="cost-distribution-segment"
                style={{
                  width: `${(numPurchasePrice / totalLandAcquisition) * 100}%`,
                  backgroundColor: '#2563eb',
                }}
                title={`Purchase Price: ${formatCurrency(numPurchasePrice)}`}
              >
                {((numPurchasePrice / totalLandAcquisition) * 100) >= 12 ? 'Purchase Price' : ''}
              </div>

              {costRows.map((r, idx) => {
                const amt = parseFloat(r.amount) || 0;
                const pct = (amt / totalLandAcquisition) * 100;
                if (pct <= 0) return null;
                const config = ACQUISITION_CATEGORY_CONFIG[r.category] || ACQUISITION_CATEGORY_CONFIG.other;
                return (
                  <div
                    key={idx}
                    className="cost-distribution-segment"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: config.color,
                    }}
                    title={`${r.name}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                  >
                    {pct >= 6 ? `${pct.toFixed(0)}%` : ''}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Left Column: Purchase & Financial Terms */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} color="#2563eb" />
                <h3 className="card-title">Land Purchase & Financial Terms</h3>
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Contract Purchase Price ($) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="cost-input-group">
                  <span className="cost-currency-prefix">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="cost-input-formatted"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="2500000"
                  />
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Contract base purchase price: <strong>{formatCurrency(numPurchasePrice)}</strong>
                </span>
              </div>

              {/* Deposit Amount & Quick Auto-Calc */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Deposit Amount ($)</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      onClick={() => handleAutoDeposit(5)}
                    >
                      5%
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      onClick={() => handleAutoDeposit(10)}
                    >
                      10%
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      onClick={() => handleAutoDeposit(15)}
                    >
                      15%
                    </button>
                  </div>
                </div>

                <div className="cost-input-group">
                  <span className="cost-currency-prefix">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="cost-input-formatted"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="250000"
                  />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Contract Exchange Date</label>
                  <input
                    type="date"
                    className="cost-desc-input"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Title Settlement Date</label>
                  <input
                    type="date"
                    className="cost-desc-input"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Site Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Site Area</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="cost-desc-input"
                    value={siteArea}
                    onChange={(e) => setSiteArea(e.target.value)}
                    placeholder="1250"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Unit</label>
                  <select
                    className="cost-select-styled"
                    value={siteAreaUnit}
                    onChange={(e) => setSiteAreaUnit(e.target.value)}
                  >
                    <option value="m²">m²</option>
                    <option value="hectares">ha</option>
                    <option value="acres">acres</option>
                  </select>
                </div>
              </div>

              {/* Planning & Zoning */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Current Planning Zoning</label>
                <input
                  type="text"
                  className="cost-desc-input"
                  value={currentZoning}
                  onChange={(e) => setCurrentZoning(e.target.value)}
                  placeholder="e.g. Medium Density Residential (R3) / Mixed Use (MU1)"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>Planning & Yield Notes</label>
                <textarea
                  className="cost-desc-input"
                  rows={2}
                  value={planningNotes}
                  onChange={(e) => setPlanningNotes(e.target.value)}
                  placeholder="e.g. FSR 2.0:1, maximum building height 21m, setback restrictions..."
                />
              </div>
            </div>
          </div>

          {/* Right Column: Acquisition Costs Schedule */}
          <div className="card">
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#2563eb" />
                <h3 className="card-title">Acquisition Costs & Duties</h3>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleAddCostRow('other')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                <Plus size={14} />
                <span>Add Cost</span>
              </button>
            </div>

            <div className="card-body">
              {/* Presets Toolbar */}
              <div className="cost-presets-toolbar" style={{ marginBottom: '16px' }}>
                <span className="cost-preset-label">⚡ Presets:</span>
                <button
                  type="button"
                  className="cost-preset-btn"
                  onClick={() => handleApplyPreset('stamp_duty')}
                >
                  <Plus size={13} />
                  <span>Stamp Duty (~5.5%)</span>
                </button>
                <button
                  type="button"
                  className="cost-preset-btn"
                  onClick={() => handleApplyPreset('legal_fees')}
                >
                  <Plus size={13} />
                  <span>Legal & Conveyancing</span>
                </button>
                <button
                  type="button"
                  className="cost-preset-btn"
                  onClick={() => handleApplyPreset('due_diligence')}
                >
                  <Plus size={13} />
                  <span>Geotech & Due Diligence</span>
                </button>
                <button
                  type="button"
                  className="cost-preset-btn"
                  onClick={() => handleApplyPreset('valuation')}
                >
                  <Plus size={13} />
                  <span>Bank Valuation</span>
                </button>
              </div>

              {/* Cost Rows List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {costRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <Info size={24} style={{ marginBottom: '8px' }} />
                    <p>No acquisition costs itemized. Use quick presets above or click "Add Cost".</p>
                  </div>
                ) : (
                  costRows.map((row, idx) => {
                    const catConfig = ACQUISITION_CATEGORY_CONFIG[row.category] || ACQUISITION_CATEGORY_CONFIG.other;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <select
                            className="cost-select-styled"
                            style={{
                              flex: 1,
                              borderLeft: `4px solid ${catConfig.color}`,
                              fontSize: '0.8rem',
                              paddingTop: '6px',
                              paddingBottom: '6px',
                            }}
                            value={row.category}
                            onChange={(e) => handleUpdateCostRow(idx, 'category', e.target.value)}
                          >
                            {Object.entries(ACQUISITION_CATEGORY_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.icon} {v.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            className="cost-desc-input"
                            style={{ flex: 1.5, fontSize: '0.84rem' }}
                            value={row.name}
                            onChange={(e) => handleUpdateCostRow(idx, 'name', e.target.value)}
                            placeholder="Cost Description"
                          />

                          <div style={{ width: '130px' }}>
                            <div className="cost-input-group">
                              <span className="cost-currency-prefix">$</span>
                              <input
                                type="number"
                                min="0"
                                className="cost-input-formatted"
                                style={{ fontSize: '0.84rem' }}
                                value={row.amount}
                                onChange={(e) => handleUpdateCostRow(idx, 'amount', e.target.value)}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            className="action-btn text-danger"
                            onClick={() => handleRemoveCostRow(idx)}
                            title="Remove cost item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="date"
                            className="cost-desc-input"
                            style={{ width: '140px', fontSize: '0.78rem', padding: '4px 8px' }}
                            value={row.date}
                            onChange={(e) => handleUpdateCostRow(idx, 'date', e.target.value)}
                            title="Expected Payment Date"
                          />
                          <input
                            type="text"
                            className="cost-desc-input"
                            style={{ flex: 1, fontSize: '0.78rem', padding: '4px 8px' }}
                            value={row.notes}
                            onChange={(e) => handleUpdateCostRow(idx, 'notes', e.target.value)}
                            placeholder="Notes or calculation basis (optional)..."
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Total Acquisition Summary */}
              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '14px',
                  borderTop: '2px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Total Acquisition Costs
                  </span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    Sum of duties, legal, valuation & searches
                  </p>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>
                  {formatCurrency(totalAcquisitionCosts)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>
              Total Capitalized Land: <strong>{formatCurrency(totalLandAcquisition)}</strong>
            </span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '160px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Land Details'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
