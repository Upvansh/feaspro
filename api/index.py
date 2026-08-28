import sys
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, "backend")

for p in [base_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app  # noqa: E402

# Ensure database tables exist
try:
    from backend.app.core.database import SessionLocal, init_db  # noqa: E402
    _db = SessionLocal()
    init_db(_db)
    _db.close()
except Exception as _e:
    print("Database init on cold start:", _e)
