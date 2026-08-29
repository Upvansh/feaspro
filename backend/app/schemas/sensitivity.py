from decimal import Decimal
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class SensitivityMatrixCell(BaseModel):
    price_shift_pct: float
    cost_shift_pct: float
    gross_realisation_value: Decimal
    net_realisation_value: Decimal
    total_project_cost: Decimal
    net_profit: Decimal
    dev_margin_on_cost_pct: Decimal
    margin_on_grv_pct: Decimal
    project_irr_pct: float
    residual_land_value: Decimal
    status: str
    is_baseline: bool

class SensitivityMatrixRow(BaseModel):
    cost_shift_pct: float
    cells: List[SensitivityMatrixCell]

class Sensitivity2DMatrix(BaseModel):
    price_steps: List[float]
    cost_steps: List[float]
    rows: List[SensitivityMatrixRow]

class InterestRateSensitivityRow(BaseModel):
    rate_delta_pct: float
    interest_rate_pct: Decimal
    total_finance_cost: Decimal
    finance_cost_increase: Decimal
    net_profit_after_finance: Decimal
    dev_margin_on_cost_pct: Decimal
    return_on_equity_pct: Decimal
    is_baseline: bool

class DelayStressTestRow(BaseModel):
    delay_months: int
    total_duration_months: int
    additional_holding_cost: Decimal
    additional_interest_cost: Decimal
    total_delay_cost: Decimal
    adjusted_project_cost: Decimal
    adjusted_net_profit: Decimal
    dev_margin_on_cost_pct: Decimal
    project_irr_pct: float
    is_baseline: bool

class BreakevenAnalysis(BaseModel):
    current_grv: Decimal
    breakeven_grv: Decimal
    revenue_safety_buffer_dollar: Decimal
    revenue_safety_buffer_pct: Decimal
    current_rate_per_sqm: Decimal
    breakeven_rate_per_sqm: Decimal
    current_total_cost: Decimal
    max_tolerable_cost: Decimal
    max_cost_overrun_dollar: Decimal
    max_cost_overrun_pct: Decimal
    current_land_cost: Decimal
    max_tolerable_land_price: Decimal

class TornadoRankingItem(BaseModel):
    rank: int
    driver: str
    category: str
    low_shock_profit: Decimal
    high_shock_profit: Decimal
    profit_swing: Decimal
    elasticity_pct: Decimal

class BaselineKPIs(BaseModel):
    gross_realisation_value: Decimal
    net_realisation_value: Decimal
    total_project_cost: Decimal
    land_cost: Decimal
    construction_cost: Decimal
    finance_cost: Decimal
    net_profit: Decimal
    dev_margin_on_cost_pct: Decimal
    project_irr_pct: float
    equity_amount: Decimal
    interest_rate_pct: Decimal
    duration_months: int

class SensitivityDashboardResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    is_baseline: bool
    baseline_kpis: BaselineKPIs
    matrix_2d: Sensitivity2DMatrix
    interest_rate_matrix: List[InterestRateSensitivityRow]
    delay_stress_test: List[DelayStressTestRow]
    breakeven: BreakevenAnalysis
    tornado_ranking: List[TornadoRankingItem]

class SensitivitySimulateInput(BaseModel):
    price_shift_pct: float = Field(0.0, ge=-50.0, le=50.0)
    cost_shift_pct: float = Field(0.0, ge=-50.0, le=50.0)
    interest_rate_delta_pct: float = Field(0.0, ge=-10.0, le=10.0)
    delay_months: int = Field(0, ge=0, le=36)

class SensitivitySimulateResponse(BaseModel):
    price_shift_pct: float
    cost_shift_pct: float
    interest_rate_delta_pct: float
    delay_months: int
    simulated_grv: Decimal
    simulated_nrv: Decimal
    simulated_total_cost: Decimal
    simulated_finance_cost: Decimal
    simulated_net_profit: Decimal
    simulated_margin_on_cost_pct: Decimal
    simulated_project_irr_pct: float
    simulated_return_on_equity_pct: Decimal
    simulated_residual_land_value: Decimal
    status: str
