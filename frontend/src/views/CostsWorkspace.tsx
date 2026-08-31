import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HardHat,
  TrendingUp,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  Sliders,
  Calendar,
  Info,
  X,
  Building2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { CostItem, CostCalculationSummary, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface CostsWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onCostsUpdated?: (summary: CostCalculationSummary) => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode; benchmark: string }
> = {
  construction: {
    label: 'Construction & Works',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    icon: <HardHat size={16} />,
    benchmark: '60 - 75% of TDC',
  },
  consultants: {
    label: 'Professional & Design Fees',
    color: '#0891b2',
    bg: 'rgba(8, 145, 178, 0.1)',
    icon: <TrendingUp size={16} />,
    benchmark: '6 - 10% of TDC',
  },
  statutory: {
    label: 'Statutory & Council Levies',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    icon: <Building2 size={16} />,
    benchmark: '3 - 6% of TDC',
  },
  contingency: {
    label: 'Contingency & Buffers',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.1)',
    icon: <ShieldCheck size={16} />,
    benchmark: '5 - 10% of Build',
  },
  holding: {
    label: 'Holding & Operating Costs',
    color: '#475569',
    bg: 'rgba(71, 85, 105, 0.1)',
    icon: <Calendar size={16} />,
    benchmark: '1 - 3% of TDC',
  },
  other: {
    label: 'Other Development Costs',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.1)',
    icon: <Layers size={16} />,
    benchmark: '1 - 4% of TDC',
  },
};

const PHASING_CONFIG: Record<
  string,
  { label: string; short: string; desc: string; icon: string; badgeClass: string }
> = {
  s_curve: {
    label: 'S-Curve (Bell Distribution)',
    short: 'S-Curve',
    desc: 'Standard smooth bell curve (slow start, peak middle, taper off)',
    icon: '📈',
    badgeClass: 's_curve',
  },
  linear: {
    label: 'Linear (Even Monthly Spread)',
    short: 'Linear',
    desc: 'Equal monthly disbursements across duration',
    icon: '➖',
    badgeClass: 'linear',
  },
  upfront: {
    label: 'Upfront (100% at Start Month)',
    short: 'Upfront',
    desc: 'Entire amount disbursed in the first month',
    icon: '⚡',
    badgeClass: 'upfront',
  },
  end: {
    label: 'End / Completion (100% at End Month)',
    short: 'Completion',
    desc: 'Entire amount disbursed at final month',
    icon: '🏁',
    badgeClass: 'end',
  },
};

const INDUSTRY_PRESETS = [
  {
    category: 'construction',
    name: 'Head Contract Construction Works',
    calc_method: 'fixed_amount',
    amount: 12500000,
    phasing: 's_curve',
    start_m: 4,
    end_m: 20,
    notes: 'Turnkey head contractor lump sum build',
  },
  {
    category: 'consultants',
    name: 'Architectural & Engineering Design (DA/CC)',
    calc_method: 'percent_construction',
    rate: 5.5,
    amount: 687500,
    phasing: 'linear',
    start_m: 1,
    end_m: 14,
    notes: 'Lead architect, structural, civil, MEP and ESD consultants',
  },
  {
    category: 'statutory',
    name: 'Council Section 7.11 / Development Levies',
    calc_method: 'fixed_amount',
    amount: 450000,
    phasing: 'upfront',
    start_m: 3,
    end_m: 3,
    notes: 'Local municipal infrastructure contribution',
  },
  {
    category: 'contingency',
    name: 'Construction Contingency (5%)',
    calc_method: 'percent_construction',
    rate: 5.0,
    amount: 625000,
    phasing: 's_curve',
    start_m: 4,
    end_m: 20,
    notes: '5% unforeseen site and structural risk buffer',
  },
  {
    category: 'holding',
    name: 'Rates, Land Tax & Insurances',
    calc_method: 'fixed_amount',
    amount: 95000,
    phasing: 'linear',
    start_m: 1,
    end_m: 22,
    notes: 'Ongoing statutory holding outgoings during development',
  },
  {
    category: 'other',
    name: 'Project Management & Superintendent',
    calc_method: 'fixed_amount',
    amount: 180000,
    phasing: 'linear',
    start_m: 1,
    end_m: 22,
    notes: 'Independent client project manager and contract admin',
  },
];

// Calculation of S-Curve distribution weights
const calculateSCurvePoints = (duration: number): number[] => {
  if (duration <= 0) return [];
  if (duration === 1) return [1.0];
  const weights: number[] = [];
  let prevF = 0.0;
  for (let i = 1; i <= duration; i++) {
    const t = i / duration;
    const f = 10.0 * Math.pow(t, 3) - 15.0 * Math.pow(t, 4) + 6.0 * Math.pow(t, 5);
    weights.push(f - prevF);
    prevF = f;
  }
  const total = weights.reduce((a, b) => a + b, 0);
  return total > 0 ? weights.map((w) => w / total) : weights;
};

// Mini SVG Sparkline Component for Cost Row
const PhasingSparkline: React.FC<{
  phasing: string;
  startMonth: number;
  endMonth: number;
  color: string;
  onClick: () => void;
}> = ({ phasing, startMonth, endMonth, color, onClick }) => {
  const duration = Math.max(1, endMonth - startMonth + 1);
  const width = 110;
  const height = 22;

  // Compute distribution heights
  let heights: number[] = [];
  if (phasing === 's_curve') {
    const weights = calculateSCurvePoints(duration);
    const maxW = Math.max(...weights, 0.01);
    heights = weights.map((w) => (w / maxW) * (height - 4));
  } else if (phasing === 'upfront') {
    heights = [height - 4, ...Array(Math.max(0, duration - 1)).fill(2)];
  } else if (phasing === 'end') {
    heights = [...Array(Math.max(0, duration - 1)).fill(2), height - 4];
  } else {
    // Linear
    heights = Array(duration).fill((height - 4) * 0.65);
  }

  const barWidth = Math.max(2, Math.min(10, (width - (duration - 1) * 2) / duration));

  return (
    <div
      className="phasing-sparkline-btn"
      onClick={onClick}
      title="Click to view detailed monthly cash flow schedule"
    >
      <div className="phasing-sparkline-meta">
        <span className={`phasing-curve-badge ${PHASING_CONFIG[phasing]?.badgeClass || 's_curve'}`}>
          {PHASING_CONFIG[phasing]?.icon} {PHASING_CONFIG[phasing]?.short || phasing}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          M{startMonth} → M{endMonth} ({duration}m)
        </span>
      </div>

      <svg className="phasing-svg-chart" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {heights.map((h, idx) => {
          const x = idx * (barWidth + 2);
          const y = height - h;
          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(2, h)}
              rx={1.5}
              fill={`url(#grad-${color.replace('#', '')})`}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const CostsWorkspace: React.FC<CostsWorkspaceProps> = ({
  projectId,
  scenario,
  onCostsUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<CostItem[]>([]);
  const [summary, setSummary] = useState<CostCalculationSummary | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Search, Sort & Interactive states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'amount_desc' | 'amount_asc' | 'timing' | 'category'>('amount_desc');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [inspectModalItem, setInspectModalItem] = useState<{ item: CostItem; index: number } | null>(null);
  const [showBulkEscalation, setShowBulkEscalation] = useState<boolean>(false);
  const [escalationPct, setEscalationPct] = useState<number>(5);

  const loadCostsData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getCosts(projectId, scenario.id);
      setItems(res.items);
      setSummary(res.summary);
      if (onCostsUpdated) onCostsUpdated(res.summary);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load development costs.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, onCostsUpdated]);

  useEffect(() => {
    loadCostsData();
  }, [loadCostsData]);

  // Reactive calculations for live client preview
  const clientTdcExLand = useMemo(() => {
    return items.reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);
  }, [items]);

  const clientConstruction = useMemo(() => {
    return items
      .filter((i) => i.category === 'construction')
      .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);
  }, [items]);

  const clientConsultants = useMemo(() => {
    return items
      .filter((i) => i.category === 'consultants')
      .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);
  }, [items]);

  const clientGSTCredits = useMemo(() => {
    return items
      .filter((i) => i.gst_applicable !== false)
      .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0) * 0.1, 0);
  }, [items]);

  const landTotal = summary ? parseFloat(String(summary.land_acquisition_total)) || 0 : 0;
  const clientTotalProjectCost = landTotal + clientTdcExLand;

  // Category subtotals map
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {
      construction: 0,
      consultants: 0,
      statutory: 0,
      contingency: 0,
      holding: 0,
      other: 0,
    };
    items.forEach((i) => {
      const cat = i.category || 'other';
      const amt = parseFloat(String(i.amount)) || 0;
      if (map[cat] !== undefined) {
        map[cat] += amt;
      } else {
        map['other'] += amt;
      }
    });
    return map;
  }, [items]);

  // Handle Add Item
  const handleAddItem = (presetCategory: string = 'construction') => {
    const newItem: CostItem = {
      category: presetCategory,
      name: `New ${CATEGORY_CONFIG[presetCategory]?.label || 'Cost'} Line`,
      calculation_method: 'fixed_amount',
      amount: '50000',
      phasing_curve: presetCategory === 'construction' ? 's_curve' : 'linear',
      start_month: presetCategory === 'construction' ? 4 : 1,
      end_month: presetCategory === 'construction' ? 16 : 12,
      gst_applicable: true,
      notes: '',
    };
    setItems([...items, newItem]);
    setExpandedIndex(items.length);
  };

  // Handle Apply Preset Template
  const handleApplyPreset = (preset: typeof INDUSTRY_PRESETS[0]) => {
    let calculatedAmount = preset.amount;
    if (preset.calc_method === 'percent_construction' && clientConstruction > 0) {
      calculatedAmount = Math.round(clientConstruction * ((preset.rate || 5) / 100));
    }

    const newItem: CostItem = {
      category: preset.category,
      name: preset.name,
      calculation_method: preset.calc_method,
      rate: preset.rate || null,
      amount: calculatedAmount,
      phasing_curve: preset.phasing,
      start_month: preset.start_m,
      end_month: preset.end_m,
      gst_applicable: true,
      notes: preset.notes,
    };
    setItems([...items, newItem]);
  };

  // Handle Duplicate Item
  const handleDuplicateItem = (index: number) => {
    const itemToClone = items[index];
    const cloned: CostItem = {
      ...itemToClone,
      id: undefined,
      name: `${itemToClone.name} (Copy)`,
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, cloned);
    setItems(newItems);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof CostItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // If calculation method changes or quantity/rate changes, recompute amount
    if (current.calculation_method === 'rate_per_sqm') {
      const q = parseFloat(String(current.quantity)) || 0;
      const r = parseFloat(String(current.rate)) || 0;
      if (q > 0 && r > 0) {
        current.amount = Math.round(q * r);
      }
    } else if (current.calculation_method === 'percent_construction') {
      const pct = parseFloat(String(current.rate)) || 0;
      if (pct > 0 && clientConstruction > 0) {
        current.amount = Math.round(clientConstruction * (pct / 100));
      }
    }

    // Ensure start_month <= end_month
    if (field === 'start_month') {
      const s = parseInt(value) || 1;
      if (s > current.end_month) {
        current.end_month = s;
      }
    }

    updated[index] = current;
    setItems(updated);

    if (inspectModalItem && inspectModalItem.index === index) {
      setInspectModalItem({ item: current, index });
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    if (inspectModalItem?.index === index) setInspectModalItem(null);
  };

  // Bulk Escalation Application
  const handleApplyEscalation = (categoryTarget: string = 'all') => {
    const factor = 1 + escalationPct / 100;
    const updated = items.map((i) => {
      if (categoryTarget === 'all' || i.category === categoryTarget) {
        const currentAmt = parseFloat(String(i.amount)) || 0;
        return {
          ...i,
          amount: Math.round(currentAmt * factor),
        };
      }
      return i;
    });
    setItems(updated);
    setShowBulkEscalation(false);
  };

  // Shift timings bulk
  const handleShiftTimings = (months: number) => {
    const updated = items.map((i) => {
      const newStart = Math.max(1, (i.start_month || 1) + months);
      const newEnd = Math.max(newStart, (i.end_month || 12) + months);
      return {
        ...i,
        start_month: newStart,
        end_month: newEnd,
      };
    });
    setItems(updated);
    setShowBulkEscalation(false);
  };

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: CostItem[] = items.map((i) => ({
        category: i.category,
        name: i.name.trim() || 'Cost Line',
        calculation_method: i.calculation_method || 'fixed_amount',
        quantity: i.quantity ? parseFloat(String(i.quantity)) : null,
        rate: i.rate ? parseFloat(String(i.rate)) : null,
        amount: parseFloat(String(i.amount)) || 0,
        gst_applicable: i.gst_applicable !== false,
        phasing_curve: i.phasing_curve || 'linear',
        start_month: parseInt(String(i.start_month)) || 1,
        end_month: parseInt(String(i.end_month)) || 12,
        notes: i.notes?.trim() || null,
      }));

      const res = await api.updateCostsBatch(projectId, scenario.id, payload);
      setItems(res.items);
      setSummary(res.summary);
      setSaveSuccess(true);
      if (onCostsUpdated) onCostsUpdated(res.summary);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save cost changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Filter by Category
    if (filterCategory !== 'all') {
      result = result.filter((i) => i.category === filterCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          CATEGORY_CONFIG[i.category]?.label.toLowerCase().includes(q)
      );
    }

    // Sort items
    result.sort((a, b) => {
      if (sortBy === 'amount_desc') {
        return (parseFloat(String(b.amount)) || 0) - (parseFloat(String(a.amount)) || 0);
      }
      if (sortBy === 'amount_asc') {
        return (parseFloat(String(a.amount)) || 0) - (parseFloat(String(b.amount)) || 0);
      }
      if (sortBy === 'timing') {
        return (a.start_month || 1) - (b.start_month || 1);
      }
      if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });

    return result;
  }, [items, filterCategory, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading interactive scenario cost schedule...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Top Notification Bar */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving costs:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Cost schedule and cashflow phasing saved successfully!
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Dev Cost (Ex. Land)</span>
            <HardHat size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatCurrency(clientTdcExLand)}</div>
          <div className="kpi-subtext">Total Construction & Soft Costs</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Construction Works</span>
            <Layers size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(clientConstruction)}</div>
          <div className="kpi-subtext">
            {clientTdcExLand > 0
              ? `${((clientConstruction / clientTdcExLand) * 100).toFixed(1)}% of Dev Costs`
              : 'Direct build contract'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Consultants & Design</span>
            <TrendingUp size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatCurrency(clientConsultants)}</div>
          <div className="kpi-subtext">
            {clientTdcExLand > 0
              ? `${((clientConsultants / clientTdcExLand) * 100).toFixed(1)}% of Dev Costs`
              : 'Architecture & Engineering'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Project Cost</span>
            <PieIcon size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(clientTotalProjectCost)}</div>
          <div className="kpi-subtext">Incl. {formatCurrency(landTotal)} Land</div>
        </div>
      </div>

      {/* Hero Visual Cost Distribution Stacked Bar */}
      <div className="cost-distribution-hero">
        <div className="cost-distribution-header">
          <div className="cost-distribution-title">
            <PieIcon size={16} color="var(--brand-accent)" />
            <span>Interactive Cost Composition & S-Curve Allocation</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total Scope: <strong>{items.length} lines</strong> ({formatCurrency(clientTdcExLand)})
            </span>
          </div>
        </div>

        {/* Segmented Stacked Progress Bar */}
        <div className="cost-distribution-bar-track">
          {Object.entries(categoryTotals).map(([cat, total]) => {
            const pct = clientTdcExLand > 0 ? (total / clientTdcExLand) * 100 : 0;
            if (pct <= 0) return null;
            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
            return (
              <div
                key={cat}
                className="cost-distribution-segment"
                style={{
                  width: `${pct}%`,
                  backgroundColor: config.color,
                }}
                onClick={() => setFilterCategory(cat === filterCategory ? 'all' : cat)}
                title={`${config.label}: ${formatCurrency(total)} (${pct.toFixed(1)}%) - Click to filter`}
              >
                {pct >= 8 ? `${pct.toFixed(0)}%` : ''}
              </div>
            );
          })}
        </div>

        {/* Legend Chips */}
        <div className="cost-distribution-legend">
          {Object.entries(categoryTotals).map(([cat, total]) => {
            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
            const pct = clientTdcExLand > 0 ? (total / clientTdcExLand) * 100 : 0;
            const isActive = filterCategory === cat;
            return (
              <div
                key={cat}
                className={`cost-legend-chip ${isActive ? 'active' : ''}`}
                onClick={() => setFilterCategory(isActive ? 'all' : cat)}
              >
                <span className="cost-legend-dot" style={{ backgroundColor: config.color }} />
                <strong>{config.label}</strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(total)} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Content */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '24px' }}>
          {/* Card Header with Controls */}
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
                <HardHat size={20} />
              </div>
              <div>
                <h3 className="card-title">Development Cost Breakdown</h3>
                <p className="card-subtitle">
                  Manage construction contracts, professional consultant fees, statutory levies, and contingencies.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowBulkEscalation(!showBulkEscalation)}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                title="Bulk Escalation & Timing Adjustment"
              >
                <Sliders size={15} />
                <span>Bulk Adjust</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleAddItem('construction')}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                <Plus size={16} />
                <span>Add Cost Line</span>
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Quick Industry Presets Bar */}
            <div className="cost-presets-toolbar">
              <span className="cost-preset-label">⚡ Quick Presets:</span>
              {INDUSTRY_PRESETS.map((preset, idx) => (
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

            {/* Bulk Escalation Popover / Drawer */}
            {showBulkEscalation && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={18} color="var(--brand-accent)" />
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Global Cost & Phasing Adjustment</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Apply uniform escalation or timeline shifts across items
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Escalation:</span>
                    <input
                      type="number"
                      value={escalationPct}
                      onChange={(e) => setEscalationPct(parseFloat(e.target.value) || 0)}
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <span style={{ fontSize: '0.8rem' }}>%</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleApplyEscalation('all')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Apply All
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleApplyEscalation('construction')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Build Only
                    </button>
                  </div>

                  <div style={{ height: '20px', width: '1px', background: '#cbd5e1' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Shift Timeline:</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShiftTimings(-1)}
                      title="Shift all start and end months by -1 month"
                    >
                      -1 Mo
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShiftTimings(1)}
                      title="Shift all start and end months by +1 month"
                    >
                      +1 Mo
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShiftTimings(3)}
                      title="Shift all start and end months by +3 months"
                    >
                      +3 Mos
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBulkEscalation(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Pills & Search / Sort Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {/* Category Filter Pills */}
              <div className="cost-filter-container">
                <button
                  type="button"
                  className={`cost-filter-pill ${filterCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  <span>All Costs</span>
                  <span className="cost-filter-count">{items.length}</span>
                </button>

                {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
                  const count = items.filter((i) => i.category === cat).length;
                  const isActive = filterCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`cost-filter-pill ${isActive ? 'active' : ''}`}
                      onClick={() => setFilterCategory(cat)}
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

              {/* Search & Sort Inputs */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search cost lines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: '30px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      fontSize: '0.82rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #cbd5e1',
                      width: '180px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUpDown size={14} color="var(--text-muted)" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.82rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                    }}
                  >
                    <option value="amount_desc">Amount (Highest first)</option>
                    <option value="amount_asc">Amount (Lowest first)</option>
                    <option value="timing">Timing (Earliest first)</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Data Table */}
            <div className="cost-table-wrapper">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '190px', width: '19%' }}>Category & Method</th>
                    <th style={{ minWidth: '220px', width: '23%' }}>Cost Description</th>
                    <th style={{ minWidth: '170px', width: '18%' }}>Phasing Curve & Schedule</th>
                    <th style={{ minWidth: '170px', width: '16%' }}>Timing (Months)</th>
                    <th style={{ minWidth: '140px', width: '13%' }}>Amount ($)</th>
                    <th style={{ minWidth: '70px', width: '5%', textAlign: 'center' }}>GST</th>
                    <th style={{ minWidth: '80px', width: '6%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <Info size={24} style={{ marginBottom: '8px', color: '#94a3b8' }} />
                        <p>No cost items match the current filter or search criteria.</p>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleAddItem(filterCategory !== 'all' ? filterCategory : 'construction')}
                          style={{ marginTop: '12px' }}
                        >
                          <Plus size={14} />
                          <span>Add New Cost Line</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    processedItems.map((item) => {
                      const realIndex = items.indexOf(item);
                      const isExpanded = expandedIndex === realIndex;
                      const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                      const lineAmount = parseFloat(String(item.amount)) || 0;
                      const pctOfTdc = clientTdcExLand > 0 ? ((lineAmount / clientTdcExLand) * 100).toFixed(1) : '0.0';

                      return (
                        <React.Fragment key={realIndex}>
                          <tr className={isExpanded ? 'expanded' : ''}>
                            {/* Category Selector */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <select
                                  className="cost-select-styled"
                                  value={item.category}
                                  onChange={(e) => handleUpdateItem(realIndex, 'category', e.target.value)}
                                  style={{
                                    borderLeft: `5px solid ${catConfig.color}`,
                                    paddingLeft: '12px',
                                  }}
                                >
                                  {Object.entries(CATEGORY_CONFIG).map(([cKey, cVal]) => (
                                    <option key={cKey} value={cKey}>
                                      {cVal.label}
                                    </option>
                                  ))}
                                </select>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: catConfig.color,
                                      background: catConfig.bg,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {pctOfTdc}% of TDC
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Cost Description */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  type="text"
                                  className="cost-desc-input"
                                  value={item.name}
                                  placeholder="e.g. Structural Framing & Concrete"
                                  onChange={(e) => handleUpdateItem(realIndex, 'name', e.target.value)}
                                />

                                {item.notes && !isExpanded && (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--text-muted)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={item.notes}
                                  >
                                    📝 {item.notes}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Phasing Sparkline Visualizer */}
                            <td>
                              <PhasingSparkline
                                phasing={item.phasing_curve || 's_curve'}
                                startMonth={item.start_month || 1}
                                endMonth={item.end_month || 12}
                                color={catConfig.color}
                                onClick={() => setInspectModalItem({ item, index: realIndex })}
                              />
                            </td>

                            {/* Timing Month Stepper Controls */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div className="timing-range-control">
                                  <button
                                    type="button"
                                    className="timing-month-btn"
                                    onClick={() =>
                                      handleUpdateItem(
                                        realIndex,
                                        'start_month',
                                        Math.max(1, (item.start_month || 1) - 1)
                                      )
                                    }
                                    title="Decrease start month"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    className="timing-input-box"
                                    value={item.start_month}
                                    title="Start Month"
                                    onChange={(e) =>
                                      handleUpdateItem(realIndex, 'start_month', parseInt(e.target.value) || 1)
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="timing-month-btn"
                                    onClick={() =>
                                      handleUpdateItem(realIndex, 'start_month', (item.start_month || 1) + 1)
                                    }
                                    title="Increase start month"
                                  >
                                    +
                                  </button>

                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 2px' }}>
                                    to
                                  </span>

                                  <button
                                    type="button"
                                    className="timing-month-btn"
                                    onClick={() =>
                                      handleUpdateItem(
                                        realIndex,
                                        'end_month',
                                        Math.max(item.start_month || 1, (item.end_month || 12) - 1)
                                      )
                                    }
                                    title="Decrease end month"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={item.start_month || 1}
                                    max={60}
                                    className="timing-input-box"
                                    value={item.end_month}
                                    title="End Month"
                                    onChange={(e) =>
                                      handleUpdateItem(
                                        realIndex,
                                        'end_month',
                                        parseInt(e.target.value) || item.start_month || 1
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="timing-month-btn"
                                    onClick={() =>
                                      handleUpdateItem(realIndex, 'end_month', (item.end_month || 12) + 1)
                                    }
                                    title="Increase end month"
                                  >
                                    +
                                  </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
                                  <span className="timing-duration-tag">
                                    Duration: {(item.end_month || 12) - (item.start_month || 1) + 1} mos
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Amount ($) */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div className="cost-input-group">
                                  <span className="cost-currency-prefix">$</span>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm cost-input-formatted"
                                    value={item.amount}
                                    onChange={(e) => handleUpdateItem(realIndex, 'amount', e.target.value)}
                                  />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                  {formatCurrency(lineAmount)}
                                </span>
                              </div>
                            </td>

                            {/* GST Switch */}
                            <td style={{ textAlign: 'center' }}>
                              <div
                                className="gst-toggle-switch"
                                onClick={() =>
                                  handleUpdateItem(realIndex, 'gst_applicable', item.gst_applicable === false)
                                }
                                title={
                                  item.gst_applicable !== false
                                    ? 'GST Claimable: 10% Input Tax Credit applies'
                                    : 'GST Exempt: No input tax credit claimable'
                                }
                              >
                                <div className={`gst-switch-track ${item.gst_applicable !== false ? 'active' : ''}`}>
                                  <div className="gst-switch-thumb" />
                                </div>
                              </div>
                              <div style={{ fontSize: '0.66rem', color: item.gst_applicable !== false ? '#059669' : '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                                {item.gst_applicable !== false ? 'ITC +10%' : 'Exempt'}
                              </div>
                            </td>

                            {/* Row Actions */}
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-btn-group">
                                <button
                                  type="button"
                                  className={`action-btn ${isExpanded ? 'active' : ''}`}
                                  title="Expand Notes & Calculation Settings"
                                  onClick={() => setExpandedIndex(isExpanded ? null : realIndex)}
                                >
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Duplicate Cost Line"
                                  onClick={() => handleDuplicateItem(realIndex)}
                                >
                                  <Copy size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="action-btn text-danger"
                                  title="Delete Cost Line"
                                  onClick={() => handleRemoveItem(realIndex)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details Drawer */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="cost-row-details">
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: '16px',
                                  }}
                                >
                                  {/* Calculation Method Selection */}
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
                                      Calculation Method
                                    </label>
                                    <select
                                      className="form-control form-control-sm"
                                      value={item.calculation_method || 'fixed_amount'}
                                      onChange={(e) =>
                                        handleUpdateItem(realIndex, 'calculation_method', e.target.value)
                                      }
                                    >
                                      <option value="fixed_amount">💵 Fixed Lump Sum Amount ($)</option>
                                      <option value="rate_per_sqm">📐 Rate / m² GFA (Qty × Rate)</option>
                                      <option value="percent_construction">📊 % of Total Construction Works</option>
                                    </select>
                                  </div>

                                  {/* Quantity / Rate if applicable */}
                                  {item.calculation_method === 'rate_per_sqm' && (
                                    <>
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
                                          Area / Quantity (m²)
                                        </label>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm"
                                          placeholder="e.g. 4500"
                                          value={item.quantity || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(realIndex, 'quantity', e.target.value)
                                          }
                                        />
                                      </div>
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
                                          Rate ($/m²)
                                        </label>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm"
                                          placeholder="e.g. 3200"
                                          value={item.rate || ''}
                                          onChange={(e) => handleUpdateItem(realIndex, 'rate', e.target.value)}
                                        />
                                      </div>
                                    </>
                                  )}

                                  {item.calculation_method === 'percent_construction' && (
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
                                        Percentage of Construction (%)
                                      </label>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input
                                          type="number"
                                          step="0.1"
                                          className="form-control form-control-sm"
                                          placeholder="e.g. 5.0"
                                          value={item.rate || ''}
                                          onChange={(e) => handleUpdateItem(realIndex, 'rate', e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>%</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Phasing Curve Select */}
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
                                      Phasing Profile
                                    </label>
                                    <select
                                      className="form-control form-control-sm"
                                      value={item.phasing_curve || 's_curve'}
                                      onChange={(e) =>
                                        handleUpdateItem(realIndex, 'phasing_curve', e.target.value)
                                      }
                                    >
                                      {Object.entries(PHASING_CONFIG).map(([pKey, pVal]) => (
                                        <option key={pKey} value={pKey}>
                                          {pVal.icon} {pVal.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Notes & Scopes */}
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <label
                                      style={{
                                        display: 'block',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      Scope Notes & Contractor References
                                    </label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="e.g. Contract sum includes structural piling, retention wall and formwork; excludes contaminated soil removal."
                                      value={item.notes || ''}
                                      onChange={(e) => handleUpdateItem(realIndex, 'notes', e.target.value)}
                                    />
                                  </div>
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

            {/* GST ITC Summary & Tax Efficiency Card */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 20px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem', fontWeight: 700 }}>
                    GST Input Tax Credits (ITCs) Claimable
                  </h4>
                  <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                    Eligible development expenses automatically generate BAS refunds in cash flow modeling.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#047857' }}>
                  {formatCurrency(clientGSTCredits)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                  10% Credit on {formatCurrency(items.filter((i) => i.gst_applicable !== false).reduce((a, b) => a + (parseFloat(String(b.amount)) || 0), 0))} Eligible Costs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating / Sticky Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>
              Real-time calculations active: <strong>{formatCurrency(clientTdcExLand)}</strong> TDC ex. Land
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
              <span>{saving ? 'Saving Changes...' : 'Save Cost Schedule'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Interactive Phasing Modal Drawer (Inspect Monthly Cash Flow) */}
      {inspectModalItem && (
        <div className="modal-overlay" onClick={() => setInspectModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    Monthly Cash Flow Distribution Inspector
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {inspectModalItem.item.name} ({CATEGORY_CONFIG[inspectModalItem.item.category]?.label})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectModalItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Curve Selection & Timing Toggles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Phasing Curve Profile
                  </label>
                  <select
                    className="form-control form-control-sm"
                    value={inspectModalItem.item.phasing_curve || 's_curve'}
                    onChange={(e) =>
                      handleUpdateItem(inspectModalItem.index, 'phasing_curve', e.target.value)
                    }
                  >
                    {Object.entries(PHASING_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Start Month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className="form-control form-control-sm"
                    value={inspectModalItem.item.start_month || 1}
                    onChange={(e) =>
                      handleUpdateItem(inspectModalItem.index, 'start_month', parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    End Month
                  </label>
                  <input
                    type="number"
                    min={inspectModalItem.item.start_month || 1}
                    max={60}
                    className="form-control form-control-sm"
                    value={inspectModalItem.item.end_month || 12}
                    onChange={(e) =>
                      handleUpdateItem(inspectModalItem.index, 'end_month', parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Total Line Cost
                  </label>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-accent)', marginTop: '4px' }}>
                    {formatCurrency(parseFloat(String(inspectModalItem.item.amount)) || 0)}
                  </div>
                </div>
              </div>

              {/* Monthly Disbursement Chart */}
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px' }}>
                Simulated Monthly Outflows (Months {inspectModalItem.item.start_month} - {inspectModalItem.item.end_month})
              </h4>

              {(() => {
                const sMonth = inspectModalItem.item.start_month || 1;
                const eMonth = inspectModalItem.item.end_month || 12;
                const dur = Math.max(1, eMonth - sMonth + 1);
                const totalAmt = parseFloat(String(inspectModalItem.item.amount)) || 0;
                const curve = inspectModalItem.item.phasing_curve || 's_curve';

                let weights: number[] = [];
                if (curve === 's_curve') {
                  weights = calculateSCurvePoints(dur);
                } else if (curve === 'upfront') {
                  weights = [1.0, ...Array(Math.max(0, dur - 1)).fill(0)];
                } else if (curve === 'end') {
                  weights = [...Array(Math.max(0, dur - 1)).fill(0), 1.0];
                } else {
                  // Linear
                  weights = Array(dur).fill(1 / dur);
                }

                const monthlyDraws = weights.map((w, idx) => ({
                  month: sMonth + idx,
                  amount: totalAmt * w,
                  pct: (w * 100).toFixed(1),
                }));

                const maxDraw = Math.max(...monthlyDraws.map((d) => d.amount), 1);

                return (
                  <div>
                    {/* Visual Bar Chart */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '6px',
                        height: '140px',
                        padding: '10px 0',
                        borderBottom: '1px solid #e2e8f0',
                        marginBottom: '16px',
                      }}
                    >
                      {monthlyDraws.map((d) => {
                        const barH = (d.amount / maxDraw) * 110;
                        return (
                          <div
                            key={d.month}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                            }}
                            title={`Month ${d.month}: ${formatCurrency(d.amount)} (${d.pct}%)`}
                          >
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {d.pct}%
                            </span>
                            <div
                              style={{
                                width: '100%',
                                height: `${Math.max(4, barH)}px`,
                                background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                                borderRadius: '3px 3px 0 0',
                                transition: 'height 0.3s ease',
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '4px' }}>
                              M{d.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Breakdown Table */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th style={{ textAlign: 'right' }}>Drawdown Amount</th>
                            <th style={{ textAlign: 'right' }}>% of Line</th>
                            <th style={{ textAlign: 'right' }}>GST Credit (+10%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyDraws.map((d) => (
                            <tr key={d.month}>
                              <td>
                                <strong>Month {d.month}</strong>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(d.amount)}</td>
                              <td style={{ textAlign: 'right' }}>{d.pct}%</td>
                              <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                                {inspectModalItem.item.gst_applicable !== false
                                  ? formatCurrency(d.amount * 0.1)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setInspectModalItem(null)}
              >
                <Check size={16} />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
