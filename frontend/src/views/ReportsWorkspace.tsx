import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  TrendingUp,
  Layers,
  Calendar,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { ExecutiveReportResponse, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ReportsWorkspaceProps {
  projectId: string;
  scenario: Scenario;
}

export const ReportsWorkspace: React.FC<ReportsWorkspaceProps> = ({ projectId, scenario }) => {
  const [report, setReport] = useState<ExecutiveReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View customization toggles
  const [showCashflow, setShowCashflow] = useState<boolean>(true);
  const [showProductMix, setShowProductMix] = useState<boolean>(true);
  const [showMilestones, setShowMilestones] = useState<boolean>(true);
  const [showSignoff, setShowSignoff] = useState<boolean>(true);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await api.getExecutiveReport(projectId, scenario.id);
      setReport(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to generate executive feasibility report.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenHtmlReport = () => {
    const url = api.getReportHtmlUrl(projectId, scenario.id);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="content-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <RefreshCw className="spin-icon" size={36} style={{ color: 'var(--brand-accent)', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Compiling Bank-Ready Feasibility Report...
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
          Aggregating Land, Cost Schedules, Sales Mix, Capital Stack, and Cash Flow Phasing.
        </p>
      </div>
    );
  }

  if (errorMessage || !report) {
    return (
      <div className="content-card" style={{ padding: '40px 20px', textAlign: 'center', borderColor: 'var(--danger-border)' }}>
        <AlertTriangle size={40} style={{ color: 'var(--danger-text)', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger-text)' }}>
          Unable to Generate Feasibility Report
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
          {errorMessage || 'Report generation returned empty data.'}
        </p>
        <button
          className="btn btn-secondary"
          onClick={loadReport}
          style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} /> Retry Compilation
        </button>
      </div>
    );
  }

  const { project_meta, financial_kpis, capital_stack, cost_breakdown, sales_mix, cashflow_summary, milestones } = report;

  const toNum = (val: unknown) => parseFloat(String(val)) || 0;
  const devMargin = toNum(financial_kpis.dev_margin_on_cost_pct);
  const marginHealthy = devMargin >= 18.0;

  return (
    <div className="reports-workspace-root">
      {/* Action Toolbar (Hidden during browser print) */}
      <div className="report-toolbar no-print">
        <div className="report-toolbar-left">
          <div className="report-badge-status">
            <span className="pulse-indicator"></span>
            <strong>Phase 3: Executive Feasibility Report</strong>
          </div>
          <span className="report-last-compiled">Compiled: {project_meta.report_generated_at}</span>
        </div>

        <div className="report-toolbar-right">
          <div className="report-section-toggles" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', marginRight: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showProductMix} onChange={e => setShowProductMix(e.target.checked)} />
              Sales Mix
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showCashflow} onChange={e => setShowCashflow(e.target.checked)} />
              Cash Flow
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showMilestones} onChange={e => setShowMilestones(e.target.checked)} />
              Milestones
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showSignoff} onChange={e => setShowSignoff(e.target.checked)} />
              Sign-off Block
            </label>
          </div>

          <button className="btn btn-secondary" onClick={loadReport} title="Refresh Live Numbers">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button className="btn btn-secondary" onClick={handleOpenHtmlReport} title="Open Standalone Printable HTML Report">
            <ExternalLink size={16} />
            <span>Standalone Web View</span>
          </button>

          <button className="btn btn-primary" onClick={handlePrint} style={{ backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }}>
            <Printer size={16} />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Bank-Ready Document Container */}
      <div className="executive-report-document" id="executive-report-print-target">
        {/* Document Header */}
        <div className="report-header-band">
          <div className="report-header-top">
            <div className="report-confidential-pill">
              <ShieldCheck size={14} />
              <span>CONFIDENTIAL • INVESTMENT COMMITTEE & FINANCIER PACK</span>
            </div>
            <div className="report-org-signature">
              <span className="report-org-name">{project_meta.organization_name}</span>
              <span className="report-doc-id">REF: FP-{project_meta.project_id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div className="report-header-main">
            <div>
              <h1 className="report-project-title">{project_meta.project_name}</h1>
              <div className="report-project-subtitle">
                <span>{project_meta.location}</span>
                <span className="dot-divider">•</span>
                <span style={{ textTransform: 'capitalize' }}>{project_meta.development_type.replace('_', ' ')}</span>
                <span className="dot-divider">•</span>
                <span className="scenario-name-badge">
                  {project_meta.scenario_name} {project_meta.is_baseline && '(Baseline Model)'}
                </span>
              </div>
            </div>

            <div className="report-meta-box">
              <div className="report-meta-item">
                <span className="meta-k">Date of Issue:</span>
                <span className="meta-v">{project_meta.report_generated_at}</span>
              </div>
              <div className="report-meta-item">
                <span className="meta-k">Lead Author:</span>
                <span className="meta-v">{project_meta.generated_by_user || 'Development Director'}</span>
              </div>
              <div className="report-meta-item">
                <span className="meta-k">Project Status:</span>
                <span className="meta-v" style={{ textTransform: 'uppercase', color: '#16a34a', fontWeight: 700 }}>
                  {project_meta.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Financial Scorecard */}
        <div className="report-kpi-grid">
          {/* Card 1: Revenue (GRV / NRV) */}
          <div className="report-kpi-card">
            <div className="report-kpi-label">Gross Realisation (GRV)</div>
            <div className="report-kpi-value">{formatCurrency(financial_kpis.gross_realisation_value)}</div>
            <div className="report-kpi-sub">
              <span>Net: <strong>{formatCurrency(financial_kpis.net_realisation_value)}</strong></span>
              <span className="badge-pill-light">{report.total_units} Units</span>
            </div>
          </div>

          {/* Card 2: Total Project Cost */}
          <div className="report-kpi-card">
            <div className="report-kpi-label">Total Project Cost (TDC)</div>
            <div className="report-kpi-value">{formatCurrency(financial_kpis.total_project_cost)}</div>
            <div className="report-kpi-sub">
              <span>Land: {formatCurrency(financial_kpis.land_acquisition_cost)}</span>
              <span>Dev: {formatCurrency(financial_kpis.development_cost_ex_land)}</span>
            </div>
          </div>

          {/* Card 3: Net Profit & Margin */}
          <div className="report-kpi-card highlight-success">
            <div className="report-kpi-label">Development Profit</div>
            <div className="report-kpi-value" style={{ color: '#059669' }}>
              {formatCurrency(financial_kpis.net_profit)}
            </div>
            <div className="report-kpi-sub">
              <span style={{ fontWeight: 700, color: marginHealthy ? '#059669' : '#d97706' }}>
                {formatNumber(financial_kpis.dev_margin_on_cost_pct)}% Margin on Cost
              </span>
              <span>{formatNumber(financial_kpis.margin_on_grv_pct)}% on GRV</span>
            </div>
          </div>

          {/* Card 4: IRR & Equity Return */}
          <div className="report-kpi-card highlight-brand">
            <div className="report-kpi-label">Project IRR & Equity Multiple</div>
            <div className="report-kpi-value" style={{ color: '#2563eb' }}>
              {financial_kpis.project_irr_pct.toFixed(1)}% p.a.
            </div>
            <div className="report-kpi-sub">
              <span style={{ fontWeight: 700 }}>{toNum(financial_kpis.equity_multiple).toFixed(2)}x Multiple</span>
              <span>ROE: {formatNumber(financial_kpis.return_on_equity_pct)}%</span>
            </div>
          </div>
        </div>

        {/* Executive Commentary & Key Highlights */}
        <div className="report-section-card">
          <div className="report-section-header">
            <div className="report-section-title-wrap">
              <Award size={18} style={{ color: '#2563eb' }} />
              <h3>Executive Feasibility Highlights & Covenant Compliance</h3>
            </div>
          </div>
          <div className="report-notes-list">
            {report.executive_summary_notes.map((note, idx) => (
              <div key={idx} className="report-note-item">
                <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Capital Stack & Financing Architecture */}
        <div className="report-section-card">
          <div className="report-section-header">
            <div className="report-section-title-wrap">
              <Building2 size={18} style={{ color: '#1e3a8a' }} />
              <h3>1. Capital Stack & Financing Architecture</h3>
            </div>
            <span className="report-section-tag">WACC: {formatNumber(financial_kpis.wacc_pct)}%</span>
          </div>

          <div className="capital-stack-cards-grid">
            <div className="capital-stack-mini-card">
              <div className="cs-label">Senior Debt Facility</div>
              <div className="cs-val">{formatCurrency(capital_stack.senior_debt_facility)}</div>
              <div className="cs-detail">
                Rate: <strong>{formatNumber(capital_stack.senior_interest_rate_pct)}% p.a.</strong> • Max {formatNumber(capital_stack.senior_max_ltc_pct)}% LTC
              </div>
              <div className="cs-sub-metric">
                Capitalised Int: {formatCurrency(capital_stack.senior_capitalized_interest)}
              </div>
            </div>

            <div className="capital-stack-mini-card">
              <div className="cs-label">Required Developer Equity</div>
              <div className="cs-val">{formatCurrency(capital_stack.required_equity)}</div>
              <div className="cs-detail">
                Equity Stake: <strong>{formatNumber(capital_stack.equity_ratio_pct)}%</strong> of Total Cost
              </div>
              <div className="cs-sub-metric">
                Net Profit on Equity: {formatCurrency(financial_kpis.net_profit)}
              </div>
            </div>

            <div className="capital-stack-mini-card">
              <div className="cs-label">Peak Debt Exposure</div>
              <div className="cs-val">{formatCurrency(capital_stack.peak_debt_exposure)}</div>
              <div className="cs-detail">
                Actual Peak LTC: <strong>{formatNumber(capital_stack.loan_to_cost_pct)}%</strong>
              </div>
              <div className="cs-sub-metric">
                Loan to Value (LVR): {formatNumber(capital_stack.loan_to_value_pct)}%
              </div>
            </div>

            <div className="capital-stack-mini-card">
              <div className="cs-label">Residual Land Value (RLV)</div>
              <div className="cs-val">{formatCurrency(financial_kpis.residual_land_value)}</div>
              <div className="cs-detail">
                Target Hurdle: <strong>20.0% Margin on Cost</strong>
              </div>
              <div className="cs-sub-metric">
                Actual Purchase: {formatCurrency(financial_kpis.land_acquisition_cost)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Itemized Development Budget Schedule */}
        <div className="report-section-card">
          <div className="report-section-header">
            <div className="report-section-title-wrap">
              <Layers size={18} style={{ color: '#1e3a8a' }} />
              <h3>2. Comprehensive Development Budget Schedule</h3>
            </div>
            <span className="report-section-tag">Total: {formatCurrency(financial_kpis.total_project_cost)}</span>
          </div>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Cost Category & Itemisation</th>
                  <th style={{ textAlign: 'center', width: '15%' }}>Items</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Total Amount ($)</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>% of TDC</th>
                </tr>
              </thead>
              <tbody>
                {cost_breakdown.map((cat, idx) => (
                  <tr key={idx} className="category-summary-row">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.display_name}</div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {cat.item_count} items
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {formatCurrency(cat.total_amount)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {formatNumber(cat.percentage_of_tdc)}%
                    </td>
                  </tr>
                ))}
                <tr className="report-table-total-row">
                  <td>TOTAL PROJECT COST (TDC)</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(financial_kpis.total_project_cost)}</td>
                  <td style={{ textAlign: 'right' }}>100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Page Break for Print */}
        <div className="print-page-break"></div>

        {/* Section 3: Revenue & Product Mix */}
        {showProductMix && (
          <div className="report-section-card">
            <div className="report-section-header">
              <div className="report-section-title-wrap">
                <DollarSign size={18} style={{ color: '#1e3a8a' }} />
                <h3>3. Product Mix & Revenue Realisation Schedule</h3>
              </div>
              <span className="report-section-tag">GRV: {formatCurrency(financial_kpis.gross_realisation_value)}</span>
            </div>

            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Product Typology</th>
                    <th style={{ textAlign: 'center' }}>Units</th>
                    <th style={{ textAlign: 'right' }}>Avg Area</th>
                    <th style={{ textAlign: 'right' }}>Rate / m²</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total Realisation</th>
                    <th style={{ textAlign: 'right' }}>% Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {sales_mix.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.total_units}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{item.avg_internal_area} m²</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${formatNumber(item.price_per_sqm)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(item.unit_sale_price)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatCurrency(item.total_revenue)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(item.percentage_of_revenue)}%</td>
                    </tr>
                  ))}
                  <tr className="report-table-total-row">
                    <td>PORTFOLIO TOTALS</td>
                    <td style={{ textAlign: 'center' }}>{report.total_units} Units</td>
                    <td style={{ textAlign: 'right' }}>{report.total_gfa_sqm} m²</td>
                    <td style={{ textAlign: 'right' }}>${formatNumber(report.avg_price_per_sqm)}/m²</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(financial_kpis.gross_realisation_value)}</td>
                    <td style={{ textAlign: 'right' }}>100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Cash Flow Trajectory */}
        {showCashflow && cashflow_summary && cashflow_summary.length > 0 && (
          <div className="report-section-card">
            <div className="report-section-header">
              <div className="report-section-title-wrap">
                <TrendingUp size={18} style={{ color: '#1e3a8a' }} />
                <h3>4. Multi-Period Cash Flow & Debt Trajectory</h3>
              </div>
              <span className="report-section-tag">IRR: {financial_kpis.project_irr_pct.toFixed(1)}%</span>
            </div>

            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Project Outflows</th>
                    <th style={{ textAlign: 'right' }}>Sales Inflows</th>
                    <th style={{ textAlign: 'right' }}>Net Cash Flow</th>
                    <th style={{ textAlign: 'right' }}>Cumulative Cash Flow</th>
                    <th style={{ textAlign: 'right' }}>Closing Debt Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {cashflow_summary.slice(0, 18).map((cf, idx) => {
                    const net = toNum(cf.net_cashflow);
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{cf.label}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
                          -{formatCurrency(cf.total_outflow)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#16a34a' }}>
                          {formatCurrency(cf.sales_inflow)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            color: net < 0 ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {formatCurrency(cf.net_cashflow)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {formatCurrency(cf.cumulative_net_cashflow)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatCurrency(cf.closing_debt_balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 5: Schedule Milestones */}
        {showMilestones && milestones && milestones.length > 0 && (
          <div className="report-section-card">
            <div className="report-section-header">
              <div className="report-section-title-wrap">
                <Calendar size={18} style={{ color: '#1e3a8a' }} />
                <h3>5. Development Timeline & Milestone Schedule</h3>
              </div>
            </div>

            <div className="milestone-grid-report">
              {milestones.map((m, idx) => (
                <div key={idx} className="milestone-report-item">
                  <div className="m-phase-tag">{m.phase}</div>
                  <div className="m-name">{m.name}</div>
                  <div className="m-timing">
                    <span>Month {m.start_month} → Month {m.end_month}</span>
                    <span className="m-duration">({m.duration_months} mo)</span>
                  </div>
                  <span className={`badge badge-${m.status === 'completed' ? 'active' : 'draft'}`} style={{ marginTop: '8px' }}>
                    {m.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 6: Executive Certification & Signature Sign-off */}
        {showSignoff && (
          <div className="report-signoff-card">
            <div className="signoff-columns">
              <div className="signoff-col">
                <div className="signoff-title">Report Prepared By:</div>
                <div className="signoff-name">{project_meta.generated_by_user || 'Development Director'}</div>
                <div className="signoff-role">Development & Financial Modeling Division</div>
                <div className="signoff-org">{project_meta.organization_name}</div>
                <div className="signoff-date">Date: {project_meta.report_generated_at}</div>
              </div>

              <div className="signoff-col signoff-right">
                <div className="signoff-title">Investment Committee Sign-off & Certification:</div>
                <div className="signature-line-block">
                  <div className="sig-line"></div>
                  <div className="sig-caption">Authorised Development Director / Investment Partner</div>
                </div>
                <div className="signoff-disclaimer">
                  This executive feasibility report has been prepared for financial evaluation purposes based on deterministic
                  cost, revenue, and capital stack assumptions. All forecasts are subject to market conditions and statutory approvals.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
