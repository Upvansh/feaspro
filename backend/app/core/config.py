import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FeasPro - Property Development Feasibility Platform"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "feaspro_development_secret_key_change_in_production_2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # Database URL: defaults to sqlite for local dev, PostgreSQL in production
    # On Vercel serverless, SQLite must reside in writable /tmp directory
    DATABASE_URL: str = (
        "sqlite:////tmp/feaspro.db"
        if os.getenv("VERCEL") and (not os.getenv("DATABASE_URL") or os.getenv("DATABASE_URL", "").startswith("sqlite"))
        else os.getenv("DATABASE_URL", "sqlite:///./feaspro.db")
    )

    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
