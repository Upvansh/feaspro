"""
FeasPro — SQLite to Supabase PostgreSQL Data Migration Tool

Safely reads all records from local SQLite (feaspro.db) and inserts them into
the target Supabase PostgreSQL database while preserving:
- All Primary Key IDs (UUID strings)
- All Foreign Key relationships (Parent-first insertion order)
- All Timestamps, Decimals, Booleans, and JSON fields
- Idempotent execution (skips records that already exist in PostgreSQL)
"""

import sys
import os
import argparse
from typing import Dict, Any

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.core.config import settings
from backend.app.models.base import Base
from backend.app.models.organization import Organization
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput, AcquisitionCostItem
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.models.funding import FundingAssumption, FundingTranche
from backend.app.models.schedule import ScheduleMilestone

# Models in strict dependency order (parents before children)
MIGRATION_MODELS = [
    ("organizations", Organization),
    ("users", User),
    ("projects", Project),
    ("scenarios", Scenario),
    ("land_inputs", LandInput),
    ("acquisition_cost_items", AcquisitionCostItem),
    ("cost_items", CostItem),
    ("sales_products", SalesProductItem),
    ("funding_assumptions", FundingAssumption),
    ("funding_tranches", FundingTranche),
    ("schedule_milestones", ScheduleMilestone),
]

def migrate(sqlite_path: str, pg_url: str) -> None:
    print("=" * 70)
    print("🚀 FeasPro SQLite -> PostgreSQL Data Migration Tool")
    print("=" * 70)
    print(f"Source SQLite:     {sqlite_path}")
    print(f"Target PostgreSQL: {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")
    print("-" * 70)

    if not os.path.exists(sqlite_path):
        print(f"⚠️ Source SQLite database not found at {sqlite_path}. Nothing to migrate.")
        return

    # Normalize PostgreSQL URL if needed
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif pg_url.startswith("postgresql://") and not any(d in pg_url for d in ["+psycopg", "+asyncpg", "+psycopg2"]):
        pg_url = pg_url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Create source and target engines
    src_engine = create_engine(f"sqlite:///{sqlite_path}")
    src_session = sessionmaker(bind=src_engine)()

    dst_engine = create_engine(pg_url, pool_pre_ping=True)
    dst_session = sessionmaker(bind=dst_engine)()

    # Check that target tables exist
    inspector = inspect(dst_engine)
    existing_dst_tables = inspector.get_table_names()

    migration_summary: Dict[str, Dict[str, int]] = {}

    try:
        for table_name, model_class in MIGRATION_MODELS:
            print(f"📦 Processing table: {table_name}...")
            
            if table_name not in existing_dst_tables:
                print(f"  ⚠️ Table '{table_name}' does not exist in target database. Please run 'alembic upgrade head' first.")
                migration_summary[table_name] = {"source": 0, "inserted": 0, "skipped": 0}
                continue

            # Read source records
            try:
                src_records = src_session.query(model_class).all()
            except Exception as e:
                print(f"  ⚠️ Could not read '{table_name}' from SQLite: {e}")
                src_records = []

            src_count = len(src_records)
            inserted_count = 0
            skipped_count = 0

            for record in src_records:
                # Check if record already exists in destination
                existing = dst_session.query(model_class).filter(model_class.id == record.id).first()
                if existing:
                    skipped_count += 1
                    continue

                # Re-create / merge record into destination
                data = {col.name: getattr(record, col.name) for col in record.__table__.columns}
                new_record = model_class(**data)
                dst_session.add(new_record)
                inserted_count += 1

            if inserted_count > 0:
                dst_session.commit()

            migration_summary[table_name] = {
                "source": src_count,
                "inserted": inserted_count,
                "skipped": skipped_count,
            }
            print(f"  ✅ {table_name}: {src_count} found in SQLite, {inserted_count} imported, {skipped_count} skipped (already present).")

        print("-" * 70)
        print("🎉 Migration Completed Successfully!")
        print("=" * 70)
        print(f"{'Table Name':<30} {'Source':<10} {'Imported':<10} {'Skipped':<10}")
        print("-" * 70)
        for tbl, stats in migration_summary.items():
            print(f"{tbl:<30} {stats['source']:<10} {stats['inserted']:<10} {stats['skipped']:<10}")
        print("=" * 70)

    except Exception as err:
        dst_session.rollback()
        print(f"❌ Error during migration: {err}")
        raise err
    finally:
        src_session.close()
        dst_session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate FeasPro SQLite data to Supabase PostgreSQL")
    parser.add_argument("--sqlite", default="./feaspro.db", help="Path to source SQLite database file")
    parser.add_argument("--pg-url", default=settings.DATABASE_URL, help="Target PostgreSQL connection string")
    args = parser.parse_args()

    migrate(sqlite_path=args.sqlite, pg_url=args.pg_url)
