from decimal import Decimal
from fastapi.testclient import TestClient

def test_executive_report_api(client: TestClient, auth_headers: dict):
    # 1. Create a Project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Pacific Executive Tower Feasibility",
        "description": "Premium 36-unit multi-residential feasibility test",
        "location": "Broadbeach, QLD",
        "development_type": "multi_unit_residential",
        "start_date": "2026-06-01",
        "target_completion_date": "2028-06-01"
    }, headers=auth_headers)
    assert proj_res.status_code == 201
    project_data = proj_res.json()
    project_id = project_data["id"]
    scenario_id = project_data["scenarios"][0]["id"]

    # 2. Update Land Inputs
    land_res = client.put(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land", json={
        "purchase_price": "8500000.00",
        "deposit_amount": "850000.00",
        "site_area_sqm": "2500.00",
        "allowable_gfa_sqm": "6000.00",
        "zoning_code": "High Density Residential",
        "state": "QLD",
        "is_foreign_purchaser": False
    }, headers=auth_headers)
    assert land_res.status_code == 200

    # 3. Fetch Executive Report JSON
    report_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/report", headers=auth_headers)
    assert report_res.status_code == 200
    report_data = report_res.json()

    # Verify Project Meta
    meta = report_data["project_meta"]
    assert meta["project_id"] == project_id
    assert meta["project_name"] == "Pacific Executive Tower Feasibility"
    assert "Baseline" in meta["scenario_name"]
    assert meta["is_baseline"] is True
    assert "report_generated_at" in meta

    # Verify Financial Scorecard
    kpis = report_data["financial_kpis"]
    assert float(kpis["gross_realisation_value"]) > 0
    assert float(kpis["net_realisation_value"]) > 0
    assert float(kpis["total_project_cost"]) > 0
    assert float(kpis["land_acquisition_cost"]) >= 8500000.00
    assert "dev_margin_on_cost_pct" in kpis
    assert "project_irr_pct" in kpis
    assert "equity_multiple" in kpis

    # Verify Capital Stack
    cs = report_data["capital_stack"]
    assert float(cs["senior_debt_facility"]) > 0
    assert float(cs["required_equity"]) > 0
    assert float(cs["loan_to_cost_pct"]) <= 70.01

    # Verify Cost Breakdown
    costs = report_data["cost_breakdown"]
    assert len(costs) > 0
    assert any(c["category"] == "land" for c in costs)

    # Verify Sales Mix
    sales = report_data["sales_mix"]
    assert len(sales) > 0
    assert report_data["total_units"] > 0
    assert report_data["total_gfa_sqm"] > 0

    # Verify Cash Flow Summary
    cfs = report_data["cashflow_summary"]
    assert len(cfs) > 0

    # Verify Executive Notes
    notes = report_data["executive_summary_notes"]
    assert len(notes) >= 3

    # 4. Fetch HTML Standalone Report
    html_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/report/html", headers=auth_headers)
    assert html_res.status_code == 200
    assert "text/html" in html_res.headers["content-type"]
    assert "Pacific Executive Tower Feasibility" in html_res.text
    assert "BANK-READY FEASIBILITY SUMMARY" in html_res.text


def test_executive_report_multi_tenant_isolation(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    # Create project in Org 1
    proj_res = client.post("/api/v1/projects", json={
        "name": "Org 1 Confidential Feasibility",
        "development_type": "commercial_mixed_use"
    }, headers=auth_headers)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # Attempt to access from Org 2 (Must return 404)
    bad_res = client.get(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/report",
        headers=other_auth_headers
    )
    assert bad_res.status_code == 404

    # HTML endpoint from Org 2 (Must also return 404)
    bad_html_res = client.get(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/report/html",
        headers=other_auth_headers
    )
    assert bad_html_res.status_code == 404
