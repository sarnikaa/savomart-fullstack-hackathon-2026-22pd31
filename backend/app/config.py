import os
from pydantic import BaseModel
from typing import Optional

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sitescout.db")
    SAVO_STORES_API_URL: str = os.getenv(
        "SAVO_STORES_API_URL", 
        "https://internal-service.savomart.in/bridge/api/store/list?is_operational=True"
    )
    SAVO_CRON_TOKEN: str = os.getenv("SAVO_CRON_TOKEN", "savo-bridge-cron-secret")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "local")  # gemini, openai, local, none
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    CHENNAI_CENTER_LAT: float = 13.0827
    CHENNAI_CENTER_LON: float = 80.2707
    CHENNAI_BOUNDS: dict = {
        "min_lat": 12.8000,
        "max_lat": 13.3500,
        "min_lon": 79.9500,
        "max_lon": 80.3800
    }
    CATCHMENT_REUSE_DISTANCE_METERS: float = 500.0
    CATCHMENT_REUSE_MAX_DAYS: int = 90
    CATCHMENT_REUSE_COVERAGE_THRESHOLD: float = 0.70

settings = Settings()
