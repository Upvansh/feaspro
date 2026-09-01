from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal, init_db, get_db
from backend.app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and seed demo project on startup gracefully
    try:
        db = SessionLocal()
        try:
            init_db(db)
        finally:
            db.close()
    except Exception as e:
        print(f"[Startup Warning] Database initialization deferred: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Property Development Feasibility and Financial Modelling Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root & Health check
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
@app.get("/v1/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "service": "feaspro-api",
        "version": settings.VERSION
    }

# Mount API v1 under both /api/v1 and /v1 for Vercel routing compatibility
app.include_router(api_router, prefix=settings.API_V1_STR)
if settings.API_V1_STR != "/v1":
    app.include_router(api_router, prefix="/v1")

# Serve Frontend Static Files (Vite SPA)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(os.path.dirname(current_dir))

candidate_paths = [
    os.path.join(base_dir, "frontend", "dist"),
    os.path.join(base_dir, "dist"),
    os.path.abspath("frontend/dist"),
    os.path.abspath("dist"),
    "/var/task/frontend/dist",
    "/var/task/dist"
]
frontend_dist = next((p for p in candidate_paths if os.path.exists(p)), None)

if frontend_dist and os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_root():
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file, media_type="text/html")
        return {"status": "ok", "service": "feaspro-api"}

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("_next/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        
        # Check if requested path is a real file inside dist
        clean_rel = os.path.normpath(full_path).replace("\\", "/").lstrip("/")
        target_file = os.path.join(frontend_dist, clean_rel)
        
        if os.path.isfile(target_file):
            media_type = None
            if target_file.endswith(".js"):
                media_type = "application/javascript"
            elif target_file.endswith(".css"):
                media_type = "text/css"
            elif target_file.endswith(".svg"):
                media_type = "image/svg+xml"
            return FileResponse(target_file, media_type=media_type)
            
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file, media_type="text/html")
        return {"detail": "Not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
