import os
import json
import warnings
from typing import List, Union, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FeasPro - Property Development Feasibility Platform"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT
    SECRET_KEY: str = "feaspro_development_secret_key_change_in_production_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # Database URL (PostgreSQL / Supabase)
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"
    
    # CORS
    BACKEND_CORS_ORIGINS: Any = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://feaspro.vercel.app",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip().lstrip("\ufeff").strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        return [str(i).strip().lstrip("\ufeff").strip() for i in parsed]
                except Exception:
                    pass
            return [i.strip().lstrip("\ufeff").strip() for i in v_str.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip().lstrip("\ufeff").strip() for i in v]
        return ["*"]

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "backend/.env", "../.env"),
        extra="ignore"
    )

settings = Settings()

# Runtime security checks
_WEAK_SECRETS = {
    "feaspro_development_secret_key_change_in_production_2026",
    "your-super-secret-jwt-key-change-in-production",
}
if settings.SECRET_KEY in _WEAK_SECRETS:
    warnings.warn(
        "SECURITY WARNING: SECRET_KEY is set to a known development default. "
        "Generate a production key with: openssl rand -hex 32",
        stacklevel=1,
    )
