import sys
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app  # noqa: E402
from backend.app.core.database import SessionLocal, init_db  # noqa: E402

# Ensure database tables are created on cold start
try:
    _db = SessionLocal()
    init_db(_db)
    _db.close()
except Exception as _e:
    print("Cold start database init notice:", _e)
