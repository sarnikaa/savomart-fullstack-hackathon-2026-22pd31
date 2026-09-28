import h3
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.osm_client import CHENNAI_LOCALITIES, aggregate_cell_features
from backend.app.services.savo_stores import find_nearest_savomart_store
from backend.app.services.scoring.area_score import compute_area_fitness_score

router = APIRouter(prefix="/api/opportunity", tags=["Bonus: Opportunity Scanner"])

@router.get("/city-scan")
def scan_city_opportunities(db: Session = Depends(get_db)):
    """
    Proactively scans Chennai's primary micro-markets, evaluates un-scouted potential,
    and returns ranked high-potential opportunity pockets.
    """
    opportunities = []

    for loc in CHENNAI_LOCALITIES:
        center_cell = h3.latlng_to_cell(loc["lat"], loc["lon"], 9)
        cell_data = aggregate_cell_features(center_cell, db)
        nearest_km, nearest_info = find_nearest_savomart_store(loc["lat"], loc["lon"], db)

        score_res = compute_area_fitness_score(
            residential_count=cell_data["residential"],
            commercial_count=cell_data["commercial"],
            transit_count=cell_data["transit"],
            competitor_count=cell_data["competitors"],
            nearest_savomart_km=nearest_km
        )

        opportunities.append({
            "locality_name": loc["locality_name"],
            "pincode": loc["pincode"],
            "lat": loc["lat"],
            "lon": loc["lon"],
            "h3_index": center_cell,
            "opportunity_score": score_res["fitness_score"],
            "is_cannibalisation_risk": score_res["is_cannibalisation_risk"],
            "subscores": score_res["subscores"],
            "nearest_savomart_km": nearest_km,
            "rationale": loc["description"],
            "recommendation_badge": "High Potential White Space" if score_res["fitness_score"] >= 75 and not score_res["is_cannibalisation_risk"] else "Selective Scouting"
        })

    # Sort descending by opportunity score
    opportunities.sort(key=lambda x: x["opportunity_score"], reverse=True)

    return {
        "scan_timestamp": "2026-09-28T09:00:00Z",
        "total_zones_scanned": len(opportunities),
        "top_opportunities": opportunities
    }
