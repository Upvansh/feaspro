"""
FeasPro Sensitivity Analysis & Stress Testing Engine.
Calculates multi-variable 2D heatmaps, interest rate shocks, timeline delays, breakeven thresholds, and Tornado elasticity rankings.
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional
import math
from backend.app.calculations.cashflow import calculate_irr_from_cashflows
from backend.app.calculations.valuation import calculate_residual_land_value

def generate_2d_sensitivity_matrix(
    base_grv: Decimal,
    base_nrv: Decimal,
    base_total_project_cost: Decimal,
    base_tdc_ex_land: Decimal,
    base_land_acquisition: Decimal,
    base_finance_cost: Decimal = Decimal("0.00"),
    base_irr_pct: float = 0.0,
    price_steps: Optional[List[float]] = None,
    cost_steps: Optional[List[float]] = None,
    target_margin_pct: Decimal = Decimal("20.00"),
) -> Dict[str, Any]:
    """
    Generate a 2D multi-variable matrix of Price shifts vs Cost shifts.
    """
    p_steps = price_steps or [-20.0, -15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0, 20.0]
    c_steps = cost_steps or [-20.0, -15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0, 20.0]

    matrix_rows = []

    for c_shift in c_steps:
        row_cells = []
        cost_mult = Decimal(str(1.0 + (c_shift / 100.0)))
        shifted_cost = (base_total_project_cost * cost_mult).quantize(Decimal("0.01"))
        shifted_tdc_ex_land = (base_tdc_ex_land * cost_mult).quantize(Decimal("0.01"))

        for p_shift in p_steps:
            price_mult = Decimal(str(1.0 + (p_shift / 100.0)))
            shifted_grv = (base_grv * price_mult).quantize(Decimal("0.01"))
            shifted_nrv = (base_nrv * price_mult).quantize(Decimal("0.01"))

            net_profit = shifted_nrv - shifted_cost
            margin_on_cost = (
                (net_profit / shifted_cost * Decimal("100.0")).quantize(Decimal("0.01"))
                if shifted_cost > 0
                else Decimal("0.00")
            )
            margin_on_grv = (
                (net_profit / shifted_grv * Decimal("100.0")).quantize(Decimal("0.01"))
                if shifted_grv > 0
                else Decimal("0.00")
            )

            # Approximated shifted IRR: scale base IRR proportionally to margin shifts
            if base_total_project_cost > 0:
                profit_ratio = float(net_profit / (base_nrv - base_total_project_cost)) if (base_nrv - base_total_project_cost) != 0 else 1.0
                shifted_irr = round(max(-50.0, min(150.0, base_irr_pct * (0.4 + 0.6 * profit_ratio))), 1)
            else:
                shifted_irr = base_irr_pct

            # Residual Land Value at target margin
            rlv_res = calculate_residual_land_value(
                net_realisation_value=shifted_nrv,
                total_development_cost_ex_land=shifted_tdc_ex_land,
                target_margin_on_cost_pct=target_margin_pct,
                gross_realisation_value=shifted_grv,
            )
            rlv_val = rlv_res["residual_land_value_cost_target"]

            # Status flag
            if margin_on_cost >= Decimal("20.0"):
                status_flag = "optimal"
            elif margin_on_cost >= Decimal("15.0"):
                status_flag = "acceptable"
            elif margin_on_cost >= Decimal("0.0"):
                status_flag = "marginal"
            else:
                status_flag = "deficit"

            row_cells.append({
                "price_shift_pct": p_shift,
                "cost_shift_pct": c_shift,
                "gross_realisation_value": shifted_grv,
                "net_realisation_value": shifted_nrv,
                "total_project_cost": shifted_cost,
                "net_profit": net_profit,
                "dev_margin_on_cost_pct": margin_on_cost,
                "margin_on_grv_pct": margin_on_grv,
                "project_irr_pct": shifted_irr,
                "residual_land_value": rlv_val,
                "status": status_flag,
                "is_baseline": (p_shift == 0.0 and c_shift == 0.0),
            })

        matrix_rows.append({
            "cost_shift_pct": c_shift,
            "cells": row_cells,
        })

    return {
        "price_steps": p_steps,
        "cost_steps": c_steps,
        "rows": matrix_rows,
    }


def calculate_interest_rate_sensitivity(
    base_cost: Decimal,
    base_grv: Decimal,
    base_nrv: Decimal,
    base_debt_facility: Decimal,
    base_interest_rate_pct: Decimal = Decimal("8.50"),
    base_finance_cost: Decimal = Decimal("2000000.00"),
    base_equity: Decimal = Decimal("5000000.00"),
    project_duration_months: int = 24,
    rate_deltas: Optional[List[float]] = None,
) -> List[Dict[str, Any]]:
    """
    Calculate interest rate shock scenarios (-3.0% to +4.0%).
    """
    deltas = rate_deltas or [-3.0, -2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0, 3.0, 4.0]
    results = []

    base_net_profit = base_nrv - base_cost

    for delta in deltas:
        new_rate = max(Decimal("1.00"), base_interest_rate_pct + Decimal(str(delta)))
        
        # Scaling finance costs proportional to rate shift
        if base_interest_rate_pct > 0:
            rate_ratio = new_rate / base_interest_rate_pct
            shifted_finance_cost = (base_finance_cost * rate_ratio).quantize(Decimal("0.01"))
        else:
            shifted_finance_cost = Decimal("0.00")

        finance_delta = shifted_finance_cost - base_finance_cost
        profit_after_finance = base_net_profit - finance_delta
        
        effective_cost = base_cost + finance_delta
        margin_on_cost = (
            (profit_after_finance / effective_cost * Decimal("100.0")).quantize(Decimal("0.01"))
            if effective_cost > 0
            else Decimal("0.00")
        )

        roe = (
            (profit_after_finance / base_equity * Decimal("100.0")).quantize(Decimal("0.01"))
            if base_equity > 0
            else Decimal("0.00")
        )

        results.append({
            "rate_delta_pct": delta,
            "interest_rate_pct": new_rate,
            "total_finance_cost": shifted_finance_cost,
            "finance_cost_increase": finance_delta,
            "net_profit_after_finance": profit_after_finance,
            "dev_margin_on_cost_pct": margin_on_cost,
            "return_on_equity_pct": roe,
            "is_baseline": (delta == 0.0),
        })

    return results


def calculate_timeline_delay_stress_test(
    base_duration_months: int,
    base_cost: Decimal,
    base_nrv: Decimal,
    base_debt: Decimal,
    base_finance_cost: Decimal,
    base_irr_pct: float = 24.0,
    monthly_holding_cost_rate: Decimal = Decimal("25000.00"),
    delay_increments: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    """
    Model construction delay and program slippage (+1 to +12 months).
    """
    delays = delay_increments or [0, 1, 2, 3, 6, 9, 12]
    results = []

    base_net_profit = base_nrv - base_cost

    for delay in delays:
        total_months = base_duration_months + delay
        
        # Monthly holding and extra interest
        extra_holding = monthly_holding_cost_rate * Decimal(str(delay))
        monthly_interest_approx = (base_finance_cost / Decimal(str(base_duration_months))) if base_duration_months > 0 else Decimal("0.00")
        extra_interest = monthly_interest_approx * Decimal(str(delay)) * Decimal("1.10")  # slight compounding premium
        
        total_extra_cost = extra_holding + extra_interest
        shifted_cost = base_cost + total_extra_cost
        shifted_profit = base_nrv - shifted_cost
        
        margin_on_cost = (
            (shifted_profit / shifted_cost * Decimal("100.0")).quantize(Decimal("0.01"))
            if shifted_cost > 0
            else Decimal("0.00")
        )

        # Timeline delay degrades annualized IRR significantly:
        # Time-value degradation factor = (base_duration / total_duration)
        if total_months > 0 and base_duration_months > 0:
            irr_factor = (base_duration_months / total_months) ** 1.35
            profit_scale = float(shifted_profit / base_net_profit) if base_net_profit > 0 else 0.5
            degraded_irr = round(max(-20.0, base_irr_pct * irr_factor * profit_scale), 1)
        else:
            degraded_irr = base_irr_pct

        results.append({
            "delay_months": delay,
            "total_duration_months": total_months,
            "additional_holding_cost": extra_holding,
            "additional_interest_cost": extra_interest,
            "total_delay_cost": total_extra_cost,
            "adjusted_project_cost": shifted_cost,
            "adjusted_net_profit": shifted_profit,
            "dev_margin_on_cost_pct": margin_on_cost,
            "project_irr_pct": degraded_irr,
            "is_baseline": (delay == 0),
        })

    return results


def calculate_breakeven_thresholds(
    base_grv: Decimal,
    base_nrv: Decimal,
    base_total_project_cost: Decimal,
    base_land_cost: Decimal,
    total_gfa_sqm: float = 0.0,
    total_units: int = 0,
) -> Dict[str, Any]:
    """
    Calculate breakeven revenue, $/m², max tolerable land price, and cost overrun allowance.
    """
    net_profit = base_nrv - base_total_project_cost
    
    # Breakeven NRV = Total Project Cost
    breakeven_nrv = base_total_project_cost
    # Scaling to Gross GRV (approx ratio base_grv / base_nrv)
    grv_to_nrv_ratio = (base_grv / base_nrv) if base_nrv > 0 else Decimal("1.05")
    breakeven_grv = (breakeven_nrv * grv_to_nrv_ratio).quantize(Decimal("0.01"))

    # Breakeven $/m²
    breakeven_rate_per_sqm = (breakeven_grv / Decimal(str(total_gfa_sqm))).quantize(Decimal("0.01")) if total_gfa_sqm > 0 else Decimal("0.00")
    current_rate_per_sqm = (base_grv / Decimal(str(total_gfa_sqm))).quantize(Decimal("0.01")) if total_gfa_sqm > 0 else Decimal("0.00")

    # Maximum tolerable cost overrun before 0% profit
    max_cost_overrun_dollar = max(Decimal("0.00"), net_profit)
    max_cost_overrun_pct = (
        (max_cost_overrun_dollar / base_total_project_cost * Decimal("100.0")).quantize(Decimal("0.01"))
        if base_total_project_cost > 0
        else Decimal("0.00")
    )

    # Maximum tolerable land price before 0% profit
    max_land_purchase_price = base_land_cost + net_profit

    # Revenue safety buffer % (how much can sales drop before 0% profit)
    revenue_safety_buffer_pct = (
        (net_profit / base_grv * Decimal("100.0")).quantize(Decimal("0.01"))
        if base_grv > 0
        else Decimal("0.00")
    )

    return {
        "current_grv": base_grv,
        "breakeven_grv": breakeven_grv,
        "revenue_safety_buffer_dollar": net_profit,
        "revenue_safety_buffer_pct": revenue_safety_buffer_pct,
        "current_rate_per_sqm": current_rate_per_sqm,
        "breakeven_rate_per_sqm": breakeven_rate_per_sqm,
        "current_total_cost": base_total_project_cost,
        "max_tolerable_cost": base_nrv,
        "max_cost_overrun_dollar": max_cost_overrun_dollar,
        "max_cost_overrun_pct": max_cost_overrun_pct,
        "current_land_cost": base_land_cost,
        "max_tolerable_land_price": max_land_purchase_price,
    }


def calculate_tornado_elasticity_ranking(
    base_grv: Decimal,
    base_nrv: Decimal,
    base_total_project_cost: Decimal,
    base_construction_cost: Decimal,
    base_land_cost: Decimal,
    base_finance_cost: Decimal,
    base_duration_months: int = 24,
) -> List[Dict[str, Any]]:
    """
    Quantifies the relative impact of ±10% shocks on Net Profit to rank risk elasticity.
    """
    base_profit = base_nrv - base_total_project_cost
    shock = Decimal("0.10")  # 10% shock

    drivers = [
        {
            "driver": "Sales Realisation (GRV)",
            "category": "revenue",
            "low_shock_profit": (base_nrv * (Decimal("1.0") - shock)) - base_total_project_cost,
            "high_shock_profit": (base_nrv * (Decimal("1.0") + shock)) - base_total_project_cost,
        },
        {
            "driver": "Direct Construction Costs",
            "category": "costs",
            "low_shock_profit": base_nrv - (base_total_project_cost + (base_construction_cost * shock)),
            "high_shock_profit": base_nrv - (base_total_project_cost - (base_construction_cost * shock)),
        },
        {
            "driver": "Land Acquisition Purchase Price",
            "category": "land",
            "low_shock_profit": base_nrv - (base_total_project_cost + (base_land_cost * shock)),
            "high_shock_profit": base_nrv - (base_total_project_cost - (base_land_cost * shock)),
        },
        {
            "driver": "Financing & Interest Rate",
            "category": "finance",
            "low_shock_profit": base_nrv - (base_total_project_cost + (base_finance_cost * shock * Decimal("1.5"))),
            "high_shock_profit": base_nrv - (base_total_project_cost - (base_finance_cost * shock * Decimal("1.5"))),
        },
        {
            "driver": "Project Timeline (Holding Costs)",
            "category": "schedule",
            "low_shock_profit": base_profit - (Decimal("35000") * Decimal(str(round(base_duration_months * 0.1)))),
            "high_shock_profit": base_profit + (Decimal("35000") * Decimal(str(round(base_duration_months * 0.1)))),
        },
    ]

    ranked = []
    for d in drivers:
        swing = abs(d["high_shock_profit"] - d["low_shock_profit"])
        ranked.append({
            "driver": d["driver"],
            "category": d["category"],
            "low_shock_profit": d["low_shock_profit"].quantize(Decimal("0.01")),
            "high_shock_profit": d["high_shock_profit"].quantize(Decimal("0.01")),
            "profit_swing": swing.quantize(Decimal("0.01")),
            "elasticity_pct": ((swing / base_profit) * Decimal("100.0")).quantize(Decimal("0.1")) if base_profit > 0 else Decimal("0.0"),
        })

    # Sort descending by profit swing
    ranked.sort(key=lambda x: x["profit_swing"], reverse=True)
    for idx, item in enumerate(ranked, 1):
        item["rank"] = idx

    return ranked
