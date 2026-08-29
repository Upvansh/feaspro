from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.calculations.sensitivity import (
    generate_2d_sensitivity_matrix,
    calculate_interest_rate_sensitivity,
    calculate_timeline_delay_stress_test,
    calculate_breakeven_thresholds,
    calculate_tornado_elasticity_ranking,
)

def test_sensitivity_calculation_functions():
    base_grv = Decimal("50000000.00")
    base_nrv = Decimal("47500000.00")
    base_cost = Decimal("38000000.00")
    base_tdc_ex_land = Decimal("26000000.00")
    base_land = Decimal("12000000.00")

    # 1. 2D Matrix
    matrix = generate_2d_sensitivity_matrix(
        base_grv=base_grv,
        base_nrv=base_nrv,
        base_total_project_cost=base_cost,
        base_tdc_ex_land=base_tdc_ex_land,
        base_land_acquisition=base_land,
        base_irr_pct=22.5,
    )
    assert len(matrix["price_steps"]) == 9
    assert len(matrix["cost_steps"]) == 9
    assert len(matrix["rows"]) == 9

    # Baseline cell (0% / 0%) check
    base_row = next(r for r in matrix["rows"] if r["cost_shift_pct"] == 0.0)
    base_cell = next(c for c in base_row["cells"] if c["price_shift_pct"] == 0.0)
    assert base_cell["is_baseline"] is True
    assert base_cell["net_profit"] == Decimal("9500000.00")
    assert base_cell["dev_margin_on_cost_pct"] == Decimal("25.00")
    assert base_cell["status"] == "optimal"

    # Extreme stress cell (-20% price, +20% cost)
    bear_row = next(r for r in matrix["rows"] if r["cost_shift_pct"] == 20.0)
    bear_cell = next(c for c in bear_row["cells"] if c["price_shift_pct"] == -20.0)
    assert bear_cell["net_profit"] < 0
    assert bear_cell["status"] == "deficit"

    # 2. Interest Rate Sensitivity
    rates = calculate_interest_rate_sensitivity(
        base_cost=base_cost,
        base_grv=base_grv,
        base_nrv=base_nrv,
        base_debt_facility=Decimal("26000000.00"),
        base_interest_rate_pct=Decimal("8.50"),
        base_finance_cost=Decimal("2200000.00"),
        base_equity=Decimal("12000000.00"),
    )
    assert len(rates) >= 5
    base_rate_row = next(r for r in rates if r["is_baseline"])
    assert base_rate_row["interest_rate_pct"] == Decimal("8.50")
    hike_row = next(r for r in rates if r["rate_delta_pct"] == 2.0)
    assert hike_row["total_finance_cost"] > base_rate_row["total_finance_cost"]

    # 3. Timeline Delay Stress Test
    delays = calculate_timeline_delay_stress_test(
        base_duration_months=24,
        base_cost=base_cost,
        base_nrv=base_nrv,
        base_debt=Decimal("26000000.00"),
        base_finance_cost=Decimal("2200000.00"),
        base_irr_pct=22.5,
    )
    assert len(delays) >= 4
    d0 = next(d for d in delays if d["is_baseline"])
    d6 = next(d for d in delays if d["delay_months"] == 6)
    assert d6["total_duration_months"] == 30
    assert d6["adjusted_project_cost"] > d0["adjusted_project_cost"]
    assert d6["project_irr_pct"] < d0["project_irr_pct"]

    # 4. Breakeven Analysis
    be = calculate_breakeven_thresholds(
        base_grv=base_grv,
        base_nrv=base_nrv,
        base_total_project_cost=base_cost,
        base_land_cost=base_land,
        total_gfa_sqm=5000.0,
        total_units=40,
    )
    assert be["breakeven_grv"] < base_grv
    assert be["max_cost_overrun_dollar"] == Decimal("9500000.00")
    assert be["max_tolerable_cost"] == base_nrv

    # 5. Tornado Ranking
    tornado = calculate_tornado_elasticity_ranking(
        base_grv=base_grv,
        base_nrv=base_nrv,
        base_total_project_cost=base_cost,
        base_construction_cost=Decimal("18000000.00"),
        base_land_cost=base_land,
        base_finance_cost=Decimal("2200000.00"),
    )
    assert len(tornado) == 5
    assert tornado[0]["rank"] == 1
    assert tornado[0]["profit_swing"] >= tornado[1]["profit_swing"]


def test_sensitivity_api_endpoints(client: TestClient, auth_headers: dict):
    # 1. Create Project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Phase 4 Sensitivity Test Development",
        "development_type": "townhouses",
        "location": "Gold Coast, QLD"
    }, headers=auth_headers)
    assert proj_res.status_code == 201
    proj = proj_res.json()
    project_id = proj["id"]
    scenario_id = proj["scenarios"][0]["id"]

    # 2. Get Sensitivity Dashboard
    sens_res = client.get(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/sensitivity",
        headers=auth_headers
    )
    assert sens_res.status_code == 200
    sens_data = sens_res.json()

    assert sens_data["scenario_id"] == scenario_id
    assert "baseline_kpis" in sens_data
    assert "matrix_2d" in sens_data
    assert len(sens_data["matrix_2d"]["rows"]) == 9
    assert "interest_rate_matrix" in sens_data
    assert "delay_stress_test" in sens_data
    assert "breakeven" in sens_data
    assert "tornado_ranking" in sens_data

    # 3. Simulate What-If
    sim_res = client.post(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/sensitivity/simulate",
        json={
            "price_shift_pct": -10.0,
            "cost_shift_pct": 10.0,
            "interest_rate_delta_pct": 1.5,
            "delay_months": 3
        },
        headers=auth_headers
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["price_shift_pct"] == -10.0
    assert sim_data["cost_shift_pct"] == 10.0
    assert "simulated_net_profit" in sim_data
    assert "simulated_margin_on_cost_pct" in sim_data
    assert "simulated_project_irr_pct" in sim_data
    assert "status" in sim_data


def test_sensitivity_multi_tenant_isolation(
    client: TestClient,
    auth_headers: dict,
    secondary_auth_headers: dict,
):
    # Create project in Org 1
    proj_res = client.post("/api/v1/projects", json={
        "name": "Org 1 Sensitivity Boundary Project",
        "development_type": "industrial"
    }, headers=auth_headers)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # Attempt access from Org 2 (Must return 404)
    bad_get = client.get(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/sensitivity",
        headers=secondary_auth_headers
    )
    assert bad_get.status_code == 404

    # Attempt simulate from Org 2 (Must return 404)
    bad_sim = client.post(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/sensitivity/simulate",
        json={"price_shift_pct": 5.0},
        headers=secondary_auth_headers
    )
    assert bad_sim.status_code == 404
