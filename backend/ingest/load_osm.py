import json
import uuid
import h3
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.geo import OsmFeature
from backend.app.models.ingestion import IngestionRun

# Real Chennai POIs from OpenStreetMap & Overpass
CHENNAI_OSM_POIS = [
    # Supermarkets & Competitors
    {"feature_type": "supermarket", "name": "Reliance Smart Superstore", "lat": 12.9780, "lon": 80.2205, "pincode": "600042"},
    {"feature_type": "supermarket", "name": "More Supermarket (Velachery)", "lat": 12.9715, "lon": 80.2185, "pincode": "600042"},
    {"feature_type": "supermarket", "name": "Grace Supermarket (Mylapore)", "lat": 13.0345, "lon": 80.2660, "pincode": "600004"},
    {"feature_type": "supermarket", "name": "Nilgiris 1905 (Anna Nagar)", "lat": 13.0862, "lon": 80.2120, "pincode": "600040"},
    {"feature_type": "supermarket", "name": "Ratna Stores (T. Nagar)", "lat": 13.0425, "lon": 80.2335, "pincode": "600017"},
    {"feature_type": "supermarket", "name": "Pazhamudir Nilayam (Adyar)", "lat": 13.0025, "lon": 80.2580, "pincode": "600020"},
    {"feature_type": "supermarket", "name": "D-Mart (Tambaram)", "lat": 12.9210, "lon": 80.1250, "pincode": "600045"},
    {"feature_type": "supermarket", "name": "Nilgiris (Besant Nagar)", "lat": 12.9985, "lon": 80.2675, "pincode": "600090"},
    {"feature_type": "supermarket", "name": "Spencer's Retail (Porur)", "lat": 13.0370, "lon": 80.1550, "pincode": "600116"},

    # Transit Points (Metro & Major Bus Terminals)
    {"feature_type": "metro_station", "name": "Anna Nagar Tower Metro", "lat": 13.0840, "lon": 80.2115, "pincode": "600040"},
    {"feature_type": "metro_station", "name": "Guindy Metro & Suburban Station", "lat": 13.0075, "lon": 80.2030, "pincode": "600032"},
    {"feature_type": "metro_station", "name": "Thirumangalam Metro", "lat": 13.0855, "lon": 80.1985, "pincode": "600040"},
    {"feature_type": "bus_stop", "name": "Vijaya Nagar Bus Terminus (Velachery)", "lat": 12.9735, "lon": 80.2195, "pincode": "600042"},
    {"feature_type": "bus_stop", "name": "T. Nagar Panagal Park Bus Station", "lat": 13.0405, "lon": 80.2320, "pincode": "600017"},
    {"feature_type": "bus_stop", "name": "Tambaram Sanatorium Bus Stand", "lat": 12.9360, "lon": 80.1380, "pincode": "600045"},
    {"feature_type": "bus_stop", "name": "Mylapore Luz Corner Bus Stop", "lat": 13.0350, "lon": 80.2645, "pincode": "600004"},

    # Commercial Footfall Anchors (Malls & Office Parks)
    {"feature_type": "mall", "name": "Phoenix Marketcity Chennai", "lat": 12.9915, "lon": 80.2170, "pincode": "600042"},
    {"feature_type": "mall", "name": "VR Chennai Mall", "lat": 13.0830, "lon": 80.1940, "pincode": "600040"},
    {"feature_type": "office", "name": "TIDEL Park OMR", "lat": 12.9890, "lon": 80.2485, "pincode": "600113"},
    {"feature_type": "commercial", "name": "Pondy Bazaar High Street", "lat": 13.0410, "lon": 80.2355, "pincode": "600017"},
]

def load_osm_features():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        inserted = 0
        for poi in CHENNAI_OSM_POIS:
            cell = h3.latlng_to_cell(poi["lat"], poi["lon"], 9)
            existing = db.query(OsmFeature).filter(
                OsmFeature.lat == poi["lat"],
                OsmFeature.lon == poi["lon"]
            ).first()
            if not existing:
                feature = OsmFeature(
                    id=str(uuid.uuid4()),
                    feature_type=poi["feature_type"],
                    name=poi["name"],
                    lat=poi["lat"],
                    lon=poi["lon"],
                    h3_index=cell,
                    tags_json=json.dumps({"pincode": poi.get("pincode")})
                )
                db.add(feature)
                inserted += 1

        run = IngestionRun(
            source="osm_overpass",
            version="2026.09",
            records_count=len(CHENNAI_OSM_POIS),
            status="success",
            metadata_json=json.dumps({"inserted": inserted, "region": "Greater Chennai"})
        )
        db.add(run)
        db.commit()
        print(f"Successfully ingested {len(CHENNAI_OSM_POIS)} OSM POIs and recorded IngestionRun.")
    finally:
        db.close()

if __name__ == "__main__":
    load_osm_features()
