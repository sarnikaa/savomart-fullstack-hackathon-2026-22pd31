import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
import backend.app.models # Registers all SQLAlchemy models
from backend.app.api import (
    users,
    stores,
    areas,
    properties,
    surveys,
    opportunity,
    analyst
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("savo_sitescout")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Savo SiteScout API",
    description="Savomart Expansion Intelligence Platform for Chennai Region",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(users.router)
app.include_router(stores.router)
app.include_router(areas.router)
app.include_router(properties.router)
app.include_router(surveys.router)
app.include_router(opportunity.router)
app.include_router(analyst.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Savo SiteScout - Savomart Expansion Intelligence",
        "region": "Chennai (Greater Chennai / CMA)",
        "brand_colors": {"primary": "#782B90", "secondary": "#FFF200"},
        "version": "1.0.0"
    }
