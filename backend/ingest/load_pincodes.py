import json
import logging
from datetime import datetime
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.geo import Pincode
from backend.app.models.ingestion import IngestionRun

logger = logging.getLogger("ingest_pincodes")

# Chennai Pincodes & Localities based on OGD India & Postal GIS
CHENNAI_PINCODES_DATA = [
    {"pincode": "600042", "locality_name": "Velachery", "district": "Chennai", "lat": 12.9750, "lon": 80.2212},
    {"pincode": "600004", "locality_name": "Mylapore", "district": "Chennai", "lat": 13.0336, "lon": 80.2678},
    {"pincode": "600040", "locality_name": "Anna Nagar", "district": "Chennai", "lat": 13.0850, "lon": 80.2101},
    {"pincode": "600017", "locality_name": "T. Nagar", "district": "Chennai", "lat": 13.0418, "lon": 80.2341},
    {"pincode": "600020", "locality_name": "Adyar", "district": "Chennai", "lat": 13.0012, "lon": 80.2565},
    {"pincode": "600045", "locality_name": "Tambaram", "district": "Chengalpattu", "lat": 12.9249, "lon": 80.1280},
    {"pincode": "600116", "locality_name": "Porur", "district": "Chennai", "lat": 13.0382, "lon": 80.1565},
    {"pincode": "600028", "locality_name": "R.A. Puram", "district": "Chennai", "lat": 13.0245, "lon": 80.2520},
    {"pincode": "600090", "locality_name": "Besant Nagar", "district": "Chennai", "lat": 12.9995, "lon": 80.2690},
    {"pincode": "600119", "locality_name": "Sholinganallur", "district": "Chennai", "lat": 12.9010, "lon": 80.2279},
    {"pincode": "600034", "locality_name": "Nungambakkam", "district": "Chennai", "lat": 13.0594, "lon": 80.2425},
    {"pincode": "600011", "locality_name": "Perambur", "district": "Chennai", "lat": 13.1098, "lon": 80.2443},
    {"pincode": "600018", "locality_name": "Alwarpet", "district": "Chennai", "lat": 13.0330, "lon": 80.2490},
    {"pincode": "600010", "locality_name": "Kilpauk", "district": "Chennai", "lat": 13.0845, "lon": 80.2410},
    {"pincode": "600032", "locality_name": "Guindy", "district": "Chennai", "lat": 13.0067, "lon": 80.2025},
    {"pincode": "600091", "locality_name": "Madipakkam", "district": "Chennai", "lat": 12.9642, "lon": 80.1963},
]

def load_pincodes():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    inserted = 0
    try:
        for p in CHENNAI_PINCODES_DATA:
            existing = db.query(Pincode).filter(Pincode.pincode == p["pincode"]).first()
            if not existing:
                pin_obj = Pincode(
                    pincode=p["pincode"],
                    locality_name=p["locality_name"],
                    district=p["district"],
                    state="Tamil Nadu",
                    centroid_lat=p["lat"],
                    centroid_lon=p["lon"]
                )
                db.add(pin_obj)
                inserted += 1
            else:
                existing.centroid_lat = p["lat"]
                existing.centroid_lon = p["lon"]

        run = IngestionRun(
            source="ogd_pincodes",
            version="2026.09",
            records_count=len(CHENNAI_PINCODES_DATA),
            status="success",
            metadata_json=json.dumps({"region": "Chennai", "records_inserted": inserted})
        )
        db.add(run)
        db.commit()
        print(f"Successfully ingested {len(CHENNAI_PINCODES_DATA)} Chennai pincodes and recorded IngestionRun.")
    finally:
        db.close()

if __name__ == "__main__":
    load_pincodes()
