import os
import datetime
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings
from backend.app.models.base import Base

# Database engine configuration - compatible with PostgreSQL (Supabase) and SQLite
db_url = settings.DATABASE_URL

# Normalize legacy postgres:// or standard postgresql:// to postgresql+psycopg://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not any(drv in db_url for drv in ["+psycopg", "+asyncpg", "+psycopg2"]):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
}

if db_url.startswith("postgresql"):
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    })
elif db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db(db: Session) -> None:
    """Idempotently seed default demo organization, users, and baseline feasibility project."""
    from backend.app.models.organization import Organization
    from backend.app.models.user import User
    from backend.app.models.project import Project
    from backend.app.models.scenario import Scenario
    from backend.app.models.land import LandInput, AcquisitionCostItem
    from backend.app.models.cost import CostItem
    from backend.app.models.sales import SalesProductItem
    from backend.app.models.funding import FundingAssumption, FundingTranche
    from backend.app.models.schedule import ScheduleMilestone
    from backend.app.core.security import get_password_hash

    # Check if demo organization exists
    demo_org = db.query(Organization).filter(Organization.slug == "apex-developments").first()
    if not demo_org:
        demo_org = Organization(
            name="Apex Property Group",
            slug="apex-developments",
            is_active=True
        )
        db.add(demo_org)
        db.commit()
        db.refresh(demo_org)

    # Seed demo users
    seed_users = [
        ("developer@apexdev.com.au", "FeasPro2026!", "Alex Mercer", "developer"),
        ("alex@apexproperty.com.au", "password123", "Alex Mercer", "admin"),
        ("mahi@gmail.com", "password123", "Mahi", "developer"),
    ]
    demo_user = None
    for email, pwd, name, role in seed_users:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                hashed_password=get_password_hash(pwd),
                full_name=name,
                role=role,
                organization_id=demo_org.id,
                is_active=True,
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        if not demo_user:
            demo_user = u

    # Check if sample demo project exists
    existing_project = db.query(Project).filter(
        Project.organization_id == demo_org.id,
        Project.name == "Pacific Horizon Residences"
    ).first()

    if not existing_project:
        sample_project = Project(
            organization_id=demo_org.id,
            created_by_id=demo_user.id,
            name="Pacific Horizon Residences",
            description="Proposed premium 48-unit medium-density residential apartment complex featuring ground-floor retail, basement parking, and rooftop amenities.",
            location="142 Ocean Parade, Burleigh Heads QLD 4220",
            development_type="multi_unit_residential",
            status="active",
            start_date=datetime.date(2026, 9, 1),
            target_completion_date=datetime.date(2028, 6, 30),
            is_archived=False
        )
        db.add(sample_project)
        db.commit()
        db.refresh(sample_project)

        # Baseline Scenario
        baseline_scenario = Scenario(
            project_id=sample_project.id,
            name="Baseline Feasibility (48 Units)",
            description="Standard development scheme with 48 two- and three-bedroom apartments and 2 retail suites.",
            is_baseline=True,
            status="active"
        )
        # Alternate Scenario
        alternate_scenario = Scenario(
            project_id=sample_project.id,
            name="Higher Density Scheme (56 Units)",
            description="Alternate planning approval scenario with additional penthouse floor level.",
            is_baseline=False,
            status="draft"
        )
        db.add_all([baseline_scenario, alternate_scenario])
        db.flush()

        from decimal import Decimal
        from backend.app.models.land import LandInput, AcquisitionCostItem

        # Baseline Land Data ($4,200,000 purchase price)
        baseline_land = LandInput(
            scenario_id=baseline_scenario.id,
            purchase_price=Decimal("4200000.00"),
            deposit_amount=Decimal("420000.00"),
            contract_date=datetime.date(2026, 9, 1),
            deposit_due_date=datetime.date(2026, 9, 15),
            settlement_date=datetime.date(2026, 12, 1),
            site_area=Decimal("1850.00"),
            site_area_unit="m²",
            current_zoning="Medium Density Residential (R3)",
            existing_improvements="Two vacant residential dwellings and asphalt hardstand.",
            planning_notes="Zoned for up to 6 storeys with ground retail permissible.",
            development_potential_notes="Target 48 residential units across 5 levels."
        )
        db.add(baseline_land)
        db.flush()

        baseline_costs = [
            AcquisitionCostItem(land_id=baseline_land.id, category="stamp_duty", name="Transfer Stamp Duty", amount=Decimal("231000.00"), notes="QLD State property transfer duty"),
            AcquisitionCostItem(land_id=baseline_land.id, category="legal_fees", name="Legal & Conveyancing", amount=Decimal("18500.00"), notes="Contract review, title searches, conveyancing"),
            AcquisitionCostItem(land_id=baseline_land.id, category="due_diligence", name="Environmental & Geotechnical Due Diligence", amount=Decimal("24000.00"), notes="Phase 1 environmental & soil bore tests"),
            AcquisitionCostItem(land_id=baseline_land.id, category="valuation_fees", name="Independent Site Valuation", amount=Decimal("12500.00"), notes="Market appraisal for senior debt lender"),
            AcquisitionCostItem(land_id=baseline_land.id, category="agent_fees", name="Buyer's Agent Retainer", amount=Decimal("35000.00"), notes="Off-market acquisition advisory retainer"),
            AcquisitionCostItem(land_id=baseline_land.id, category="other", name="Council Search & Rates Adjustment", amount=Decimal("4500.00"), notes="Statutory title registration & council adjustments"),
        ]
        db.add_all(baseline_costs)

        # Higher Density Land Data ($4,500,000 purchase price reflecting option fee / site assembly premium)
        alternate_land = LandInput(
            scenario_id=alternate_scenario.id,
            purchase_price=Decimal("4500000.00"),
            deposit_amount=Decimal("450000.00"),
            contract_date=datetime.date(2026, 9, 1),
            deposit_due_date=datetime.date(2026, 9, 15),
            settlement_date=datetime.date(2027, 2, 1),
            site_area=Decimal("1850.00"),
            site_area_unit="m²",
            current_zoning="Medium Density Residential (R3)",
            existing_improvements="Two vacant residential dwellings.",
            planning_notes="DA variation for 7 storeys under code assessment.",
            development_potential_notes="Target 56 residential units with increased penthouse yield."
        )
        db.add(alternate_land)
        db.flush()

        alternate_costs = [
            AcquisitionCostItem(land_id=alternate_land.id, category="stamp_duty", name="Transfer Stamp Duty", amount=Decimal("247500.00"), notes="Calculated on $4.5M purchase price"),
            AcquisitionCostItem(land_id=alternate_land.id, category="legal_fees", name="Legal & Planning Legal Review", amount=Decimal("25000.00"), notes="Extended settlement agreement legal fees"),
            AcquisitionCostItem(land_id=alternate_land.id, category="due_diligence", name="Geotech & Planning Due Diligence", amount=Decimal("28000.00"), notes="Deep piling & basement assessment"),
            AcquisitionCostItem(land_id=alternate_land.id, category="valuation_fees", name="Independent Site Valuation", amount=Decimal("14000.00")),
            AcquisitionCostItem(land_id=alternate_land.id, category="agent_fees", name="Acquisition Advisory Fee", amount=Decimal("40000.00")),
            AcquisitionCostItem(land_id=alternate_land.id, category="other", name="Option Holding & Settlement Extension Fee", amount=Decimal("15000.00")),
        ]
        db.add_all(alternate_costs)
        db.commit()
