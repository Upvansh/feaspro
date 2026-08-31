import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Building,
  Home,
  Tag,
  Sparkles,
  PieChart as PieIcon,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  Sliders,
  Layers,
  Info,
  X,
  Building2,
  Check,
} from 'lucide-react';
import { SalesProductItem, SalesCalculationSummary, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface SalesWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onSalesUpdated?: (summary: SalesCalculationSummary) => void;
}

const UNIT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  residential_1bed: {
    label: '1-Bed Apartment',
    color: '#0891b2',
    bg: 'rgba(8, 145, 178, 0.1)',
    icon: <Home size={15} />,
  },
  residential_2bed: {
    label: '2-Bed Apartment',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    icon: <Home size={15} />,
  },
  residential_3bed: {
    label: '3-Bed Apartment',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.1)',
    icon: <Home size={15} />,
  },
  penthouse: {
    label: 'Penthouse Residence',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    icon: <Sparkles size={15} />,
  },
  townhouse: {
    label: 'Townhouse / Villa',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    icon: <Building size={15} />,
  },
  commercial_retail: {
    label: 'Retail / Commercial',
    color: '#db2777',
    bg: 'rgba(219, 39, 119, 0.1)',
    icon: <Building2 size={15} />,
  },
  land_lot: {
    label: 'Subdivided Land Lot',
    color: '#475569',
    bg: 'rgba(71, 85, 105, 0.1)',
    icon: <Layers size={15} />,
  },
};

const TYPOLOGY_PRESETS = [
  {
    name: '1-Bedroom Executive Suite',
    unit_type: 'residential_1bed',
    total_units: 8,
    avg_internal_area: 55,
    avg_external_area: 10,
    price_per_sqm: 12000,
    unit_sale_price: 660000,
    sales_start_m: 3,
    sales_end_m: 12,
    settlement_m: 18,
    commission_pct: 2.0,
    marketing_pct: 1.5,
    notes: 'Targeted at first-home buyers and investors',
  },
  {
    name: '2-Bedroom / 2-Bath Residence',
    unit_type: 'residential_2bed',
    total_units: 16,
    avg_internal_area: 82,
    avg_external_area: 14,
    price_per_sqm: 11500,
    unit_sale_price: 943000,
    sales_start_m: 2,
    sales_end_m: 14,
    settlement_m: 18,
    commission_pct: 2.0,
    marketing_pct: 1.5,
    notes: 'Premium owner-occupier corner layouts with parking',
  },
  {
    name: '3-Bedroom Luxury Sky Suite',
    unit_type: 'residential_3bed',
    total_units: 6,
    avg_internal_area: 120,
    avg_external_area: 25,
    price_per_sqm: 12800,
    unit_sale_price: 1536000,
    sales_start_m: 4,
    sales_end_m: 16,
    settlement_m: 18,
    commission_pct: 2.5,
    marketing_pct: 1.5,
    notes: 'Expansive family residence with dual secure parking',
  },
  {
    name: 'Top Floor Penthouse Sky-Home',
    unit_type: 'penthouse',
    total_units: 2,
    avg_internal_area: 165,
    avg_external_area: 45,
    price_per_sqm: 15500,
    unit_sale_price: 2557500,
    sales_start_m: 6,
    sales_end_m: 16,
    settlement_m: 18,
    commission_pct: 2.5,
    marketing_pct: 2.0,
    notes: 'Private rooftop plunge pool and panoramic ocean views',
  },
  {
    name: 'Ground Floor Retail / Dining',
    unit_type: 'commercial_retail',
    total_units: 2,
    avg_internal_area: 90,
    avg_external_area: 20,
    price_per_sqm: 9000,
    unit_sale_price: 810000,
    sales_start_m: 8,
    sales_end_m: 16,
    settlement_m: 18,
    commission_pct: 3.0,
    marketing_pct: 1.0,
    notes: 'High-exposure corner retail / cafe tenancy with grease trap',
  },
];

// Mini SVG Sparkline Component for Sales Row
const SalesPhasingSparkline: React.FC<{
  salesStart: number;
  salesEnd: number;
  settlementMonth: number;
  color: string;
  onClick: () => void;
}> = ({ salesStart, salesEnd, settlementMonth, color, onClick }) => {
  const width = 120;
  const height = 22;
  const maxM = Math.max(settlementMonth, 24);

  // Calculate campaign bar x coordinates
  const campStartX = Math.max(0, ((salesStart - 1) / maxM) * width);
  const campWidth = Math.max(8, (((salesEnd - salesStart + 1) / maxM) * width));
  const settleX = Math.min(width - 6, Math.max(0, ((settlementMonth - 1) / maxM) * width));

  return (
    <div
      className="phasing-sparkline-btn"
      onClick={onClick}
      title="Click to view simulated monthly revenue and deposit inflow"
    >
      <div className="phasing-sparkline-meta">
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Campaign: M{salesStart}→M{salesEnd}
        </span>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981' }}>
          Settle: M{settlementMonth}
        </span>
      </div>

      <svg className="phasing-svg-chart" viewBox={`0 0 ${width} ${height}`}>
        {/* Background track */}
        <rect x={0} y={12} width={width} height={4} rx={2} fill="#e2e8f0" />

        {/* Sales Campaign Period Bar (10% Deposits) */}
        <rect
          x={campStartX}
          y={11}
          width={campWidth}
          height={6}
          rx={3}
          fill={color}
          opacity={0.85}
        />

        {/* Settlement Spike at Handover (90% Cash Settlement) */}
        <line
          x1={settleX + 3}
          y1={2}
          x2={settleX + 3}
          y2={18}
          stroke="#10b981"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={settleX + 3} cy={3} r={3} fill="#059669" />
      </svg>
    </div>
  );
};

export const SalesWorkspace: React.FC<SalesWorkspaceProps> = ({
  projectId,
  scenario,
  onSalesUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<SalesProductItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  // Search, Sort & Interactive states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rev_desc' | 'rev_asc' | 'price_desc' | 'units_desc'>('rev_desc');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [inspectModalItem, setInspectModalItem] = useState<{ item: SalesProductItem; index: number } | null>(null);
  const [showBulkAdjust, setShowBulkAdjust] = useState<boolean>(false);
  const [escalationPct, setEscalationPct] = useState<number>(5);

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getSales(projectId, scenario.id);
      setItems(res.items);
      if (onSalesUpdated) onSalesUpdated(res.summary);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load sales and revenue assumptions.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, onSalesUpdated]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  // Reactive calculations for live client preview
  const clientTotalUnits = useMemo(() => {
    return items.reduce((acc, i) => acc + (parseInt(String(i.total_units)) || 0), 0);
  }, [items]);

  const clientTotalArea = useMemo(() => {
    return items.reduce(
      (acc, i) => acc + (parseFloat(String(i.avg_internal_area)) || 0) * (parseInt(String(i.total_units)) || 0),
      0
    );
  }, [items]);

  const clientGrv = useMemo(() => {
    return items.reduce(
      (acc, i) => acc + (parseFloat(String(i.unit_sale_price)) || 0) * (parseInt(String(i.total_units)) || 0),
      0
    );
  }, [items]);

  const clientSellingCosts = useMemo(() => {
    return items.reduce((acc, i) => {
      const lineRev = (parseFloat(String(i.unit_sale_price)) || 0) * (parseInt(String(i.total_units)) || 0);
      const commPct = (parseFloat(String(i.sales_commission_pct)) || 2.0) / 100.0;
      const mktgPct = (parseFloat(String(i.marketing_cost_pct)) || 1.5) / 100.0;
      return acc + lineRev * (commPct + mktgPct);
    }, 0);
  }, [items]);

  const clientNrv = clientGrv - clientSellingCosts;
  const avgRateSqm = clientTotalArea > 0 ? clientGrv / clientTotalArea : 0;

  // Typology breakdown subtotals map
  const typeRevenueMap = useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {};
    Object.keys(UNIT_TYPE_CONFIG).forEach((k) => {
      map[k] = { revenue: 0, units: 0 };
    });

    items.forEach((i) => {
      const t = i.unit_type || 'residential_2bed';
      const u = parseInt(String(i.total_units)) || 0;
      const p = parseFloat(String(i.unit_sale_price)) || 0;
      const rev = u * p;
      if (map[t]) {
        map[t].revenue += rev;
        map[t].units += u;
      }
    });

    return map;
  }, [items]);

  // Handle Add Item
  const handleAddItem = (presetType: string = 'residential_2bed') => {
    const newItem: SalesProductItem = {
      name: `New ${UNIT_TYPE_CONFIG[presetType]?.label || 'Product'} Line`,
      unit_type: presetType,
      total_units: 4,
      avg_internal_area: '78',
      avg_external_area: '12',
      price_per_sqm: '11000',
      unit_sale_price: '858000',
      total_revenue: '3432000',
      sales_commission_pct: '2.00',
      marketing_cost_pct: '1.50',
      gst_applicable: true,
      sales_start_month: 3,
      sales_end_month: 12,
      settlement_month: 18,
      notes: '',
    };
    setItems([...items, newItem]);
    setExpandedIndex(items.length);
  };

  // Handle Apply Preset Template
  const handleApplyPreset = (preset: typeof TYPOLOGY_PRESETS[0]) => {
    const newItem: SalesProductItem = {
      name: preset.name,
      unit_type: preset.unit_type,
      total_units: preset.total_units,
      avg_internal_area: preset.avg_internal_area,
      avg_external_area: preset.avg_external_area,
      price_per_sqm: preset.price_per_sqm,
      unit_sale_price: preset.unit_sale_price,
      total_revenue: preset.unit_sale_price * preset.total_units,
      sales_commission_pct: preset.commission_pct,
      marketing_cost_pct: preset.marketing_pct,
      gst_applicable: true,
      sales_start_month: preset.sales_start_m,
      sales_end_month: preset.sales_end_m,
      settlement_month: preset.settlement_m,
      notes: preset.notes,
    };
    setItems([...items, newItem]);
  };

  // Handle Duplicate Item
  const handleDuplicateItem = (index: number) => {
    const itemToClone = items[index];
    const cloned: SalesProductItem = {
      ...itemToClone,
      id: undefined,
      name: `${itemToClone.name} (Copy)`,
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, cloned);
    setItems(newItems);
  };

  // Update Item Fields with Auto-Calculations
  const handleUpdateItem = (index: number, field: keyof SalesProductItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // Auto calculate unit sale price if area or rate per sqm changed
    if (field === 'avg_internal_area' || field === 'price_per_sqm') {
      const area = parseFloat(String(field === 'avg_internal_area' ? value : current.avg_internal_area)) || 0;
      const rate = parseFloat(String(field === 'price_per_sqm' ? value : current.price_per_sqm)) || 0;
      if (rate > 0 && area > 0) {
        current.unit_sale_price = Math.round(rate * area);
      }
    }

    // Auto calculate price per sqm if unit sale price changed
    if (field === 'unit_sale_price') {
      const price = parseFloat(String(value)) || 0;
      const area = parseFloat(String(current.avg_internal_area)) || 0;
      if (area > 0 && price > 0) {
        current.price_per_sqm = Math.round(price / area);
      }
    }

    const units = parseInt(String(current.total_units)) || 1;
    const price = parseFloat(String(current.unit_sale_price)) || 0;
    current.total_revenue = price * units;

    // Timing safeguards
    if (field === 'sales_start_month') {
      const s = parseInt(value) || 1;
      if (s > current.sales_end_month) current.sales_end_month = s;
      if (s > current.settlement_month) current.settlement_month = s;
    }
    if (field === 'sales_end_month') {
      const e = parseInt(value) || 1;
      if (e > current.settlement_month) current.settlement_month = e;
    }

    updated[index] = current;
    setItems(updated);

    if (inspectModalItem && inspectModalItem.index === index) {
      setInspectModalItem({ item: current, index });
    }
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    if (inspectModalItem?.index === index) setInspectModalItem(null);
  };

  // Bulk Price Escalation
  const handleApplyPriceEscalation = (typeTarget: string = 'all') => {
    const factor = 1 + escalationPct / 100;
    const updated = items.map((i) => {
      if (typeTarget === 'all' || i.unit_type === typeTarget) {
        const currentPrice = parseFloat(String(i.unit_sale_price)) || 0;
        const newPrice = Math.round(currentPrice * factor);
        const area = parseFloat(String(i.avg_internal_area)) || 0;
        const newRate = area > 0 ? Math.round(newPrice / area) : i.price_per_sqm;
        return {
          ...i,
          unit_sale_price: newPrice,
          price_per_sqm: newRate,
          total_revenue: newPrice * (parseInt(String(i.total_units)) || 1),
        };
      }
      return i;
    });
    setItems(updated);
    setShowBulkAdjust(false);
  };

  // Bulk Timing Shifter
  const handleShiftSalesTimings = (months: number) => {
    const updated = items.map((i) => {
      const newStart = Math.max(1, (i.sales_start_month || 1) + months);
      const newEnd = Math.max(newStart, (i.sales_end_month || 12) + months);
      const newSettle = Math.max(newEnd, (i.settlement_month || 18) + months);
      return {
        ...i,
        sales_start_month: newStart,
        sales_end_month: newEnd,
        settlement_month: newSettle,
      };
    });
    setItems(updated);
    setShowBulkAdjust(false);
  };

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: SalesProductItem[] = items.map((i) => ({
        name: i.name.trim() || 'Product Line',
        unit_type: i.unit_type || 'residential_2bed',
        total_units: parseInt(String(i.total_units)) || 1,
        avg_internal_area: parseFloat(String(i.avg_internal_area)) || 0,
        avg_external_area: parseFloat(String(i.avg_external_area)) || 0,
        price_per_sqm: parseFloat(String(i.price_per_sqm)) || 0,
        unit_sale_price: parseFloat(String(i.unit_sale_price)) || 0,
        total_revenue:
          (parseFloat(String(i.unit_sale_price)) || 0) * (parseInt(String(i.total_units)) || 1),
        sales_commission_pct: parseFloat(String(i.sales_commission_pct)) || 2.0,
        marketing_cost_pct: parseFloat(String(i.marketing_cost_pct)) || 1.5,
        gst_applicable: i.gst_applicable !== false,
        sales_start_month: parseInt(String(i.sales_start_month)) || 1,
        sales_end_month: parseInt(String(i.sales_end_month)) || 12,
        settlement_month: parseInt(String(i.settlement_month)) || 18,
        notes: i.notes?.trim() || null,
      }));

      const res = await api.updateSalesBatch(projectId, scenario.id, payload);
      setItems(res.items);
      setSaveSuccess(true);
      if (onSalesUpdated) onSalesUpdated(res.summary);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save sales products.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    let result = [...items];

    if (filterType !== 'all') {
      result = result.filter((i) => i.unit_type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          UNIT_TYPE_CONFIG[i.unit_type]?.label.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const revA = (parseFloat(String(a.unit_sale_price)) || 0) * (parseInt(String(a.total_units)) || 1);
      const revB = (parseFloat(String(b.unit_sale_price)) || 0) * (parseInt(String(b.total_units)) || 1);

      if (sortBy === 'rev_desc') return revB - revA;
      if (sortBy === 'rev_asc') return revA - revB;
      if (sortBy === 'price_desc') {
        return (parseFloat(String(b.unit_sale_price)) || 0) - (parseFloat(String(a.unit_sale_price)) || 0);
      }
      if (sortBy === 'units_desc') {
        return (parseInt(String(b.total_units)) || 0) - (parseInt(String(a.total_units)) || 0);
      }
      return 0;
    });

    return result;
  }, [items, filterType, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading interactive product mix & pricing schedule...</p>
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
            <strong>Error saving sales:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Product mix, GRV, selling costs, and settlement milestones saved successfully!
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Gross Realisation (GRV)</span>
            <DollarSign size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(clientGrv)}</div>
          <div className="kpi-subtext">Total Gross Revenue Across All Units</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Product Mix</span>
            <Building size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{clientTotalUnits} Units</div>
          <div className="kpi-subtext">
            {formatNumber(clientTotalArea)} m² Total NSA (@ {formatCurrency(avgRateSqm)}/m²)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Selling & Marketing</span>
            <Tag size={18} className="kpi-icon text-warning" />
          </div>
          <div className="kpi-value text-warning">{formatCurrency(clientSellingCosts)}</div>
          <div className="kpi-subtext">Commissions & Marketing Fees</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Net Realisation (NRV)</span>
            <TrendingUp size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(clientNrv)}</div>
          <div className="kpi-subtext">Net Revenue Inflow to Project</div>
        </div>
      </div>

      {/* Hero Visual Revenue Breakdown Stacked Bar */}
      <div className="cost-distribution-hero">
        <div className="cost-distribution-header">
          <div className="cost-distribution-title">
            <PieIcon size={16} color="var(--brand-accent)" />
            <span>Interactive Revenue Typology Breakdown (GRV Share)</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total Realisation: <strong>{clientTotalUnits} Units</strong> ({formatCurrency(clientGrv)})
            </span>
          </div>
        </div>

        {/* Segmented Stacked Progress Bar */}
        <div className="cost-distribution-bar-track">
          {Object.entries(typeRevenueMap).map(([tKey, data]) => {
            const pct = clientGrv > 0 ? (data.revenue / clientGrv) * 100 : 0;
            if (pct <= 0) return null;
            const config = UNIT_TYPE_CONFIG[tKey] || UNIT_TYPE_CONFIG.residential_2bed;
            return (
              <div
                key={tKey}
                className="cost-distribution-segment"
                style={{
                  width: `${pct}%`,
                  backgroundColor: config.color,
                }}
                onClick={() => setFilterType(tKey === filterType ? 'all' : tKey)}
                title={`${config.label}: ${formatCurrency(data.revenue)} (${pct.toFixed(1)}%) - ${data.units} Units`}
              >
                {pct >= 8 ? `${pct.toFixed(0)}%` : ''}
              </div>
            );
          })}
        </div>

        {/* Legend Chips */}
        <div className="cost-distribution-legend">
          {Object.entries(typeRevenueMap).map(([tKey, data]) => {
            const config = UNIT_TYPE_CONFIG[tKey] || UNIT_TYPE_CONFIG.residential_2bed;
            const pct = clientGrv > 0 ? (data.revenue / clientGrv) * 100 : 0;
            const isActive = filterType === tKey;
            return (
              <div
                key={tKey}
                className={`cost-legend-chip ${isActive ? 'active' : ''}`}
                onClick={() => setFilterType(isActive ? 'all' : tKey)}
              >
                <span className="cost-legend-dot" style={{ backgroundColor: config.color }} />
                <strong>{config.label}</strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  {data.units} units · {formatCurrency(data.revenue)} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Content */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '24px' }}>
          {/* Card Header */}
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
                <Home size={20} />
              </div>
              <div>
                <h3 className="card-title">Product Mix & Pricing Schedule</h3>
                <p className="card-subtitle">
                  Define unit types, internal/external areas, price points, agent commissions, and settlement milestones.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowBulkAdjust(!showBulkAdjust)}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                title="Bulk Pricing & Phasing Adjustment"
              >
                <Sliders size={15} />
                <span>Bulk Adjust</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleAddItem('residential_2bed')}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                <Plus size={16} />
                <span>Add Product Type</span>
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Quick Typology Presets Toolbar */}
            <div className="cost-presets-toolbar">
              <span className="cost-preset-label">⚡ Quick Presets:</span>
              {TYPOLOGY_PRESETS.map((preset, idx) => (
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

            {/* Bulk Price & Timing Adjustment Drawer */}
            {showBulkAdjust && (
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
                    <strong style={{ fontSize: '0.85rem' }}>Global Pricing & Timing Adjustments</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Apply uniform price increases or schedule shifts across product lines
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Price Increase:</span>
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
                      onClick={() => handleApplyPriceEscalation('all')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Apply All
                    </button>
                  </div>

                  <div style={{ height: '20px', width: '1px', background: '#cbd5e1' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Shift Timeline:</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShiftSalesTimings(-1)}
                      title="Shift campaign and settlement by -1 month"
                    >
                      -1 Mo
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShiftSalesTimings(1)}
                      title="Shift campaign and settlement by +1 month"
                    >
                      +1 Mo
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShiftSalesTimings(3)}
                      title="Shift campaign and settlement by +3 months"
                    >
                      +3 Mos
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBulkAdjust(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Filter Pills & Search Toolbar */}
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
              {/* Product Type Filter Pills */}
              <div className="cost-filter-container">
                <button
                  type="button"
                  className={`cost-filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  <span>All Typologies</span>
                  <span className="cost-filter-count">{items.length}</span>
                </button>

                {Object.entries(UNIT_TYPE_CONFIG).map(([tKey, config]) => {
                  const count = items.filter((i) => i.unit_type === tKey).length;
                  const isActive = filterType === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      className={`cost-filter-pill ${isActive ? 'active' : ''}`}
                      onClick={() => setFilterType(tKey)}
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

              {/* Search & Sort Controls */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search products..."
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
                      width: '170px',
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
                    <option value="rev_desc">Revenue (Highest first)</option>
                    <option value="rev_asc">Revenue (Lowest first)</option>
                    <option value="price_desc">Unit Price (Highest)</option>
                    <option value="units_desc">Unit Count (Most)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Data Table */}
            <div className="cost-table-wrapper">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px', width: '22%' }}>Product Name & Typology</th>
                    <th style={{ minWidth: '90px', width: '8%', textAlign: 'center' }}>Units</th>
                    <th style={{ minWidth: '150px', width: '14%' }}>Area (m² Int + Ext)</th>
                    <th style={{ minWidth: '130px', width: '12%' }}>Rate ($/m²)</th>
                    <th style={{ minWidth: '150px', width: '14%' }}>Unit Price ($)</th>
                    <th style={{ minWidth: '160px', width: '15%', textAlign: 'right' }}>Total GRV ($)</th>
                    <th style={{ minWidth: '140px', width: '15%' }}>Phasing & Settle</th>
                    <th style={{ minWidth: '80px', width: '5%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <Info size={24} style={{ marginBottom: '8px', color: '#94a3b8' }} />
                        <p>No product lines match the current filter or search criteria.</p>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleAddItem(filterType !== 'all' ? filterType : 'residential_2bed')}
                          style={{ marginTop: '12px' }}
                        >
                          <Plus size={14} />
                          <span>Add New Product Type</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    processedItems.map((item) => {
                      const realIndex = items.indexOf(item);
                      const isExpanded = expandedIndex === realIndex;
                      const typeConfig = UNIT_TYPE_CONFIG[item.unit_type] || UNIT_TYPE_CONFIG.residential_2bed;
                      const lineUnits = parseInt(String(item.total_units)) || 1;
                      const linePrice = parseFloat(String(item.unit_sale_price)) || 0;
                      const lineRev = lineUnits * linePrice;
                      const pctOfGrv = clientGrv > 0 ? ((lineRev / clientGrv) * 100).toFixed(1) : '0.0';

                      return (
                        <React.Fragment key={realIndex}>
                          <tr className={isExpanded ? 'expanded' : ''}>
                            {/* Product Name & Typology Dropdown */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  type="text"
                                  className="cost-desc-input"
                                  value={item.name}
                                  placeholder="e.g. 2-Bed Luxury Suite"
                                  onChange={(e) => handleUpdateItem(realIndex, 'name', e.target.value)}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <select
                                    className="cost-select-styled"
                                    value={item.unit_type}
                                    onChange={(e) => handleUpdateItem(realIndex, 'unit_type', e.target.value)}
                                    style={{
                                      borderLeft: `5px solid ${typeConfig.color}`,
                                      paddingLeft: '10px',
                                      fontSize: '0.78rem',
                                      paddingTop: '4px',
                                      paddingBottom: '4px',
                                    }}
                                  >
                                    {Object.entries(UNIT_TYPE_CONFIG).map(([uKey, uVal]) => (
                                      <option key={uKey} value={uKey}>
                                        {uVal.label}
                                      </option>
                                    ))}
                                  </select>

                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: typeConfig.color,
                                      background: typeConfig.bg,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {pctOfGrv}% GRV
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Total Units */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <button
                                  type="button"
                                  className="timing-month-btn"
                                  onClick={() =>
                                    handleUpdateItem(realIndex, 'total_units', Math.max(1, lineUnits - 1))
                                  }
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={5000}
                                  className="timing-input-box"
                                  style={{ width: '48px', fontWeight: 700 }}
                                  value={item.total_units}
                                  onChange={(e) =>
                                    handleUpdateItem(realIndex, 'total_units', parseInt(e.target.value) || 1)
                                  }
                                />
                                <button
                                  type="button"
                                  className="timing-month-btn"
                                  onClick={() =>
                                    handleUpdateItem(realIndex, 'total_units', lineUnits + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Areas (Internal + External) */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <input
                                    type="number"
                                    step="any"
                                    className="cost-desc-input"
                                    style={{ padding: '6px 8px', fontSize: '0.84rem' }}
                                    placeholder="Int m²"
                                    title="Internal NSA (m²)"
                                    value={item.avg_internal_area}
                                    onChange={(e) => handleUpdateItem(realIndex, 'avg_internal_area', e.target.value)}
                                  />
                                </div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>+</span>
                                <div style={{ position: 'relative', width: '60px' }}>
                                  <input
                                    type="number"
                                    step="any"
                                    className="cost-desc-input"
                                    style={{ padding: '6px 8px', fontSize: '0.84rem' }}
                                    placeholder="Ext"
                                    title="Balcony / Terrace Area (m²)"
                                    value={item.avg_external_area}
                                    onChange={(e) => handleUpdateItem(realIndex, 'avg_external_area', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Total: {(parseFloat(String(item.avg_internal_area)) || 0) + (parseFloat(String(item.avg_external_area)) || 0)} m² NSA
                              </div>
                            </td>

                            {/* Price per sqm ($/m²) */}
                            <td>
                              <div className="cost-input-group">
                                <span className="cost-currency-prefix">$</span>
                                <input
                                  type="number"
                                  step="any"
                                  className="cost-input-formatted"
                                  style={{ fontSize: '0.84rem' }}
                                  placeholder="11000"
                                  value={item.price_per_sqm || ''}
                                  onChange={(e) => handleUpdateItem(realIndex, 'price_per_sqm', e.target.value)}
                                />
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                                / m² internal
                              </div>
                            </td>

                            {/* Unit Sale Price ($) */}
                            <td>
                              <div className="cost-input-group">
                                <span className="cost-currency-prefix">$</span>
                                <input
                                  type="number"
                                  step="any"
                                  className="cost-input-formatted"
                                  value={item.unit_sale_price}
                                  onChange={(e) => handleUpdateItem(realIndex, 'unit_sale_price', e.target.value)}
                                />
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                                {formatCurrency(linePrice)} each
                              </div>
                            </td>

                            {/* Total Line GRV */}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#10b981' }}>
                                {formatCurrency(lineRev)}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {lineUnits} × {formatCurrency(linePrice)}
                              </div>
                            </td>

                            {/* Phasing Sparkline Visualizer */}
                            <td>
                              <SalesPhasingSparkline
                                salesStart={item.sales_start_month || 1}
                                salesEnd={item.sales_end_month || 12}
                                settlementMonth={item.settlement_month || 18}
                                color={typeConfig.color}
                                onClick={() => setInspectModalItem({ item, index: realIndex })}
                              />
                            </td>

                            {/* Row Actions */}
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-btn-group">
                                <button
                                  type="button"
                                  className={`action-btn ${isExpanded ? 'active' : ''}`}
                                  title="Expand Selling Fees & Specifications"
                                  onClick={() => setExpandedIndex(isExpanded ? null : realIndex)}
                                >
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Duplicate Product Line"
                                  onClick={() => handleDuplicateItem(realIndex)}
                                >
                                  <Copy size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="action-btn text-danger"
                                  title="Delete Product Line"
                                  onClick={() => handleRemoveItem(realIndex)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Product Details Drawer */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="cost-row-details">
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px',
                                  }}
                                >
                                  {/* Commission % */}
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
                                      Sales Agent Commission (%)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input
                                        type="number"
                                        step="0.1"
                                        className="cost-desc-input"
                                        value={item.sales_commission_pct}
                                        onChange={(e) => handleUpdateItem(realIndex, 'sales_commission_pct', e.target.value)}
                                      />
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>%</span>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      Fee: {formatCurrency(lineRev * ((parseFloat(String(item.sales_commission_pct)) || 0) / 100))}
                                    </span>
                                  </div>

                                  {/* Marketing % */}
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
                                      Marketing & Media Levy (%)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input
                                        type="number"
                                        step="0.1"
                                        className="cost-desc-input"
                                        value={item.marketing_cost_pct}
                                        onChange={(e) => handleUpdateItem(realIndex, 'marketing_cost_pct', e.target.value)}
                                      />
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>%</span>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      Budget: {formatCurrency(lineRev * ((parseFloat(String(item.marketing_cost_pct)) || 0) / 100))}
                                    </span>
                                  </div>

                                  {/* Settlement Month */}
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
                                      Settlement Handover Month
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input
                                        type="number"
                                        min={item.sales_end_month || 1}
                                        max={60}
                                        className="cost-desc-input"
                                        value={item.settlement_month}
                                        onChange={(e) => handleUpdateItem(realIndex, 'settlement_month', parseInt(e.target.value) || 18)}
                                      />
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Month</span>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                                      90% Settlement Received @ M{item.settlement_month}
                                    </span>
                                  </div>

                                  {/* GST Status */}
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
                                      GST Margin Scheme Status
                                    </label>
                                    <div
                                      className="gst-toggle-switch"
                                      style={{ marginTop: '6px' }}
                                      onClick={() =>
                                        handleUpdateItem(realIndex, 'gst_applicable', item.gst_applicable === false)
                                      }
                                    >
                                      <div className={`gst-switch-track ${item.gst_applicable !== false ? 'active' : ''}`}>
                                        <div className="gst-switch-thumb" />
                                      </div>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                        {item.gst_applicable !== false ? 'GST Applicable / Taxable' : 'Margin Scheme / Exempt'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Notes & Specs */}
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
                                      Product Specification Notes & Inclusions
                                    </label>
                                    <input
                                      type="text"
                                      className="cost-desc-input"
                                      placeholder="e.g. Premium Miele appliances, engineered timber flooring, north-east corner orientation, 2 side-by-side car parks."
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

                {/* Footer Totals */}
                <tfoot>
                  <tr style={{ fontWeight: 700, backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong>Portfolio Totals: {clientTotalUnits} Total Units</strong>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '1rem', color: 'var(--brand-primary)' }}>
                      {clientTotalUnits}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {formatNumber(clientTotalArea)} m² NSA
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--brand-accent)' }}>
                      Avg {formatCurrency(avgRateSqm)}/m²
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Gross Realisation (GRV):
                    </td>
                    <td style={{ textAlign: 'right', padding: '14px 16px', color: '#059669', fontSize: '1.15rem', fontWeight: 800 }}>
                      {formatCurrency(clientGrv)}
                    </td>
                    <td colSpan={2} style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      NRV: <strong>{formatCurrency(clientNrv)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Floating / Sticky Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>
              Live Revenue Target: <strong>{formatCurrency(clientGrv)}</strong> GRV across <strong>{clientTotalUnits} Units</strong>
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
              <span>{saving ? 'Saving...' : 'Save Product Mix'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Revenue & Settlement Phasing Modal Inspector */}
      {inspectModalItem && (
        <div className="modal-overlay" onClick={() => setInspectModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    Sales Campaign & Settlement Cash Inflow Schedule
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {inspectModalItem.item.name} ({UNIT_TYPE_CONFIG[inspectModalItem.item.unit_type]?.label})
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
              {/* Campaign Controls */}
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
                    Sales Campaign Start (Deposits)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className="form-control form-control-sm"
                    value={inspectModalItem.item.sales_start_month || 1}
                    onChange={(e) =>
                      handleUpdateItem(inspectModalItem.index, 'sales_start_month', parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Sales Campaign End
                  </label>
                  <input
                    type="number"
                    min={inspectModalItem.item.sales_start_month || 1}
                    max={60}
                    className="form-control form-control-sm"
                    value={inspectModalItem.item.sales_end_month || 12}
                    onChange={(e) =>
                      handleUpdateItem(inspectModalItem.index, 'sales_end_month', parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Final Settlement Handover
                  </label>
                  <input
                    type="number"
                    min={inspectModalItem.item.sales_end_month || 1}
                    max={60}
                    className="form-control form-control-sm"
                    value={inspectModalItem.item.settlement_month || 18}
                    onChange={(e) =>
                      handleUpdateItem(inspectModalItem.index, 'settlement_month', parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Total Line Revenue
                  </label>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                    {formatCurrency((parseFloat(String(inspectModalItem.item.unit_sale_price)) || 0) * (parseInt(String(inspectModalItem.item.total_units)) || 1))}
                  </div>
                </div>
              </div>

              {/* Monthly Revenue Inflow Visualization */}
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px' }}>
                Simulated Cash Flow Phasing (10% Deposits during Campaign + 90% Settlement Inflow)
              </h4>

              {(() => {
                const sStart = inspectModalItem.item.sales_start_month || 1;
                const sEnd = inspectModalItem.item.sales_end_month || 12;
                const settleM = inspectModalItem.item.settlement_month || 18;
                const units = parseInt(String(inspectModalItem.item.total_units)) || 1;
                const price = parseFloat(String(inspectModalItem.item.unit_sale_price)) || 0;
                const totalGross = units * price;
                const comm = (parseFloat(String(inspectModalItem.item.sales_commission_pct)) || 2) / 100;
                const mktg = (parseFloat(String(inspectModalItem.item.marketing_cost_pct)) || 1.5) / 100;
                const netRev = totalGross * (1 - comm - mktg);

                const depositPortion = netRev * 0.1;
                const settlePortion = netRev * 0.9;
                const campDur = Math.max(1, sEnd - sStart + 1);
                const depPerMo = depositPortion / campDur;

                const maxM = Math.max(settleM, sEnd);
                const monthlyData: { month: number; inflow: number; desc: string }[] = [];

                for (let m = 1; m <= maxM; m++) {
                  let val = 0;
                  let d = '';
                  if (m >= sStart && m <= sEnd) {
                    val += depPerMo;
                    d = 'Buyer Deposit (10%)';
                  }
                  if (m === settleM) {
                    val += settlePortion;
                    d = d ? `${d} + Final Settlement (90%)` : 'Final Title Settlement (90%)';
                  }
                  if (val > 0) {
                    monthlyData.push({ month: m, inflow: val, desc: d });
                  }
                }

                const maxVal = Math.max(...monthlyData.map((d) => d.inflow), 1);

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
                      {monthlyData.map((d) => {
                        const barH = (d.inflow / maxVal) * 110;
                        const isSettle = d.month === settleM;
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
                            title={`Month ${d.month}: ${formatCurrency(d.inflow)} (${d.desc})`}
                          >
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isSettle ? '#059669' : 'var(--text-muted)' }}>
                              {isSettle ? '90%' : 'Dep'}
                            </span>
                            <div
                              style={{
                                width: '100%',
                                height: `${Math.max(6, barH)}px`,
                                background: isSettle
                                  ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
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
                            <th>Cash Inflow Type</th>
                            <th style={{ textAlign: 'right' }}>Net Inflow ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyData.map((d) => (
                            <tr key={d.month}>
                              <td>
                                <strong>Month {d.month}</strong>
                              </td>
                              <td>{d.desc}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: d.month === settleM ? '#059669' : 'var(--text-primary)' }}>
                                {formatCurrency(d.inflow)}
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
