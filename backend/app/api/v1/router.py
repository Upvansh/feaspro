from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.projects import router as projects_router
from backend.app.api.v1.scenarios import router as scenarios_router
from backend.app.api.v1.land import router as land_router
from backend.app.api.v1.costs import router as costs_router
from backend.app.api.v1.sales import router as sales_router
from backend.app.api.v1.cashflow import router as cashflow_router
from backend.app.api.v1.funding import router as funding_router
from backend.app.api.v1.schedule import router as schedule_router
from backend.app.api.v1.feasibility import router as feasibility_router
from backend.app.api.v1.reports import router as reports_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(scenarios_router)
api_router.include_router(land_router)
api_router.include_router(costs_router)
api_router.include_router(sales_router)
api_router.include_router(cashflow_router)
api_router.include_router(funding_router)
api_router.include_router(schedule_router)
api_router.include_router(feasibility_router)
api_router.include_router(reports_router)

