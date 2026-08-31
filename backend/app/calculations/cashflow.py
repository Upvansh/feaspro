"""
Monthly Cash Flow & S-Curve Schedule Feasibility Engine.
Calculates monthly deterministic cash flow phasing, construction S-curves, cumulative cash flow, peak debt, and IRR.
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional
import math

def calculate_s_curve_weights(duration: int) -> List[float]:
    """
    Generate S-Curve weights using a standard quintic polynomial smoothstep function:
    f(t) = 10*t^3 - 15*t^4 + 6*t^5, where t in [0, 1].
    Monthly increment is the difference F(t_i) - F(t_{i-1}).
    """
    if duration <= 0:
        return []
    if duration == 1:
        return [1.0]

    weights = []
    prev_f = 0.0
    for i in range(1, duration + 1):
        t = i / duration
        # Smoothstep S-curve
        f = 10.0 * (t ** 3) - 15.0 * (t ** 4) + 6.0 * (t ** 5)
        weight = f - prev_f
        weights.append(weight)
        prev_f = f

    total_weight = sum(weights)
    if total_weight > 0:
        weights = [w / total_weight for w in weights]
    return weights

def calculate_irr_from_cashflows(cashflows: List[float], max_iter: int = 1000, tol: float = 1e-6) -> float:
    """
    Calculate annualized Project Internal Rate of Return (IRR) from monthly cash flows.
    Uses bisection method combined with Newton-Raphson.
    """
    if not cashflows or len(cashflows) < 2:
        return 0.0

    has_positive = any(cf > 0 for cf in cashflows)
    has_negative = any(cf < 0 for cf in cashflows)
    if not (has_positive and has_negative):
        return 0.0

    def npv(r: float) -> float:
        val = 0.0
        for m, cf in enumerate(cashflows):
            val += cf / ((1.0 + r) ** m)
        return val

    # Search range for monthly rate: -0.5 to 1.0 (-50% to +100% per month)
    low = -0.49
    high = 1.0

    npv_low = npv(low)
    npv_high = npv(high)

    if npv_low * npv_high > 0:
        # Try wider range
        high = 3.0
        npv_high = npv(high)
        if npv_low * npv_high > 0:
            return 0.0

    # Bisection
    r = 0.0
    for _ in range(max_iter):
        mid = (low + high) / 2.0
        val = npv(mid)
        if abs(val) < tol or (high - low) / 2.0 < tol:
            r = mid
            break
        if (npv(low) > 0 and val > 0) or (npv(low) < 0 and val < 0):
            low = mid
        else:
            high = mid
    else:
        r = (low + high) / 2.0

    # Convert monthly rate to annualized percentage: (1 + r)^12 - 1
    try:
        if r <= -0.999:
            return -100.0
        annual_irr = ((1.0 + r) ** 12 - 1.0) * 100.0
        if math.isnan(annual_irr) or math.isinf(annual_irr):
            return 0.0
        return round(float(annual_irr), 2)
    except (OverflowError, ValueError, Exception):
        return 0.0

def generate_cash_flow_schedule(
    land_purchase_price: float,
    land_acquisition_costs: float,
    cost_items: List[Dict[str, Any]],
    sales_items: List[Dict[str, Any]],
    project_duration_months: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generate a full deterministic monthly cash flow schedule.
    """
    # 1. Determine timeline duration
    max_month = project_duration_months if project_duration_months and project_duration_months > 0 else 24

    for item in cost_items:
        end_m = item.get("end_month") or 12
        if end_m > max_month:
            max_month = end_m

    for item in sales_items:
        settle_m = item.get("settlement_month") or 18
        if settle_m > max_month:
            max_month = settle_m

    # Initialize monthly buckets (1-indexed, size = max_month + 1)
    monthly_land = [0.0] * (max_month + 1)
    monthly_construction = [0.0] * (max_month + 1)
    monthly_consultants = [0.0] * (max_month + 1)
    monthly_statutory_holding = [0.0] * (max_month + 1)
    monthly_other_costs = [0.0] * (max_month + 1)
    monthly_revenue = [0.0] * (max_month + 1)

    # 2. Phase Land Acquisition
    # Month 1: 10% deposit + acquisition fees; Month 2: remaining purchase price
    deposit_approx = land_purchase_price * 0.10
    remaining_purchase = land_purchase_price - deposit_approx
    monthly_land[1] += deposit_approx + land_acquisition_costs
    if max_month >= 2:
        monthly_land[2] += remaining_purchase
    else:
        monthly_land[1] += remaining_purchase

    # 3. Phase Development Costs
    for item in cost_items:
        cat = item.get("category", "construction")
        amt = float(item.get("amount") or 0.0)
        start_m = max(1, min(max_month, int(item.get("start_month") or 1)))
        end_m = max(start_m, min(max_month, int(item.get("end_month") or 12)))
        duration = end_m - start_m + 1
        phasing = item.get("phasing_curve", "s_curve")

        if amt <= 0:
            continue

        if phasing == "s_curve" and duration > 1:
            weights = calculate_s_curve_weights(duration)
            for idx, w in enumerate(weights):
                m = start_m + idx
                if m <= max_month:
                    cost_val = amt * w
                    if cat == "construction":
                        monthly_construction[m] += cost_val
                    elif cat == "consultants":
                        monthly_consultants[m] += cost_val
                    elif cat in ("statutory", "holding", "contingency"):
                        monthly_statutory_holding[m] += cost_val
                    else:
                        monthly_other_costs[m] += cost_val
        elif phasing == "upfront" or duration == 1:
            if cat == "construction":
                monthly_construction[start_m] += amt
            elif cat == "consultants":
                monthly_consultants[start_m] += amt
            elif cat in ("statutory", "holding", "contingency"):
                monthly_statutory_holding[start_m] += amt
            else:
                monthly_other_costs[start_m] += amt
        elif phasing == "end":
            if cat == "construction":
                monthly_construction[end_m] += amt
            elif cat == "consultants":
                monthly_consultants[end_m] += amt
            elif cat in ("statutory", "holding", "contingency"):
                monthly_statutory_holding[end_m] += amt
            else:
                monthly_other_costs[end_m] += amt
        else:
            # Linear distribution
            per_month = amt / duration
            for m in range(start_m, end_m + 1):
                if cat == "construction":
                    monthly_construction[m] += per_month
                elif cat == "consultants":
                    monthly_consultants[m] += per_month
                elif cat in ("statutory", "holding", "contingency"):
                    monthly_statutory_holding[m] += per_month
                else:
                    monthly_other_costs[m] += per_month

    # 4. Phase Sales & Revenue
    for item in sales_items:
        units = int(item.get("total_units") or 1)
        unit_price = float(item.get("unit_sale_price") or 0.0)
        line_rev = float(item.get("total_revenue") or (unit_price * units))
        
        # Deduct sales commission & marketing to get net cash inflow
        comm_pct = float(item.get("sales_commission_pct") or 2.0) / 100.0
        mktg_pct = float(item.get("marketing_cost_pct") or 1.5) / 100.0
        net_rev = line_rev * (1.0 - comm_pct - mktg_pct)

        sales_start = max(1, min(max_month, int(item.get("sales_start_month") or 1)))
        sales_end = max(sales_start, min(max_month, int(item.get("sales_end_month") or 12)))
        settlement_m = max(sales_end, min(max_month, int(item.get("settlement_month") or 18)))

        # 10% buyer deposits phased linearly across sales campaign
        deposit_portion = net_rev * 0.10
        sales_duration = sales_end - sales_start + 1
        dep_per_month = deposit_portion / sales_duration
        for m in range(sales_start, sales_end + 1):
            monthly_revenue[m] += dep_per_month

        # 90% settlement balance received at settlement month
        settlement_portion = net_rev * 0.90
        monthly_revenue[settlement_m] += settlement_portion

    # 5. Assemble Monthly Period Grid & Calculate Metrics
    monthly_data = []
    cumulative_cf = 0.0
    peak_debt = 0.0
    net_cashflow_series = []

    for m in range(1, max_month + 1):
        land = monthly_land[m]
        con = monthly_construction[m]
        cons = monthly_consultants[m]
        st_hold = monthly_statutory_holding[m] + monthly_other_costs[m]
        total_outflow = land + con + cons + st_hold
        rev = monthly_revenue[m]
        net_cf = rev - total_outflow
        cumulative_cf += net_cf

        if cumulative_cf < 0 and abs(cumulative_cf) > peak_debt:
            peak_debt = abs(cumulative_cf)

        net_cashflow_series.append(net_cf)

        monthly_data.append({
            "month": m,
            "period_label": f"Month {m}",
            "land_cost": round(land, 2),
            "construction_cost": round(con, 2),
            "consultant_cost": round(cons, 2),
            "statutory_holding_cost": round(st_hold, 2),
            "acquisition_cost": round(land, 2),  # schema compatibility
            "total_outflow": round(total_outflow, 2),
            "revenue": round(rev, 2),
            "net_cashflow": round(net_cf, 2),
            "cumulative_cashflow": round(cumulative_cf, 2),
            "debt_drawdown": round(abs(min(0.0, net_cf)), 2),
            "cumulative_debt": round(abs(min(0.0, cumulative_cf)), 2)
        })

    total_rev = sum(d["revenue"] for d in monthly_data)
    total_costs = sum(d["total_outflow"] for d in monthly_data)
    net_profit = total_rev - total_costs
    project_irr = calculate_irr_from_cashflows(net_cashflow_series)

    return {
        "project_duration_months": max_month,
        "total_revenue": round(total_rev, 2),
        "total_costs": round(total_costs, 2),
        "net_profit": round(net_profit, 2),
        "peak_debt": round(peak_debt, 2),
        "project_irr": project_irr,
        "monthly_data": monthly_data
    }
