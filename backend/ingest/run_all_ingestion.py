import sys
import os

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.ingest.load_pincodes import load_pincodes
from backend.ingest.load_stores import load_stores
from backend.ingest.load_osm import load_osm_features
from backend.ingest.build_h3_grid import build_h3_grid
from backend.ingest.seed_demo import seed_demo_data

def run_all():
    print("=== Savo SiteScout: Starting Master Data Ingestion ===")
    print("1/5 Ingesting Chennai Pincodes...")
    load_pincodes()
    print("2/5 Ingesting Savomart Stores (Live API / Fallback)...")
    load_stores()
    print("3/5 Ingesting OSM Features and Competitors...")
    load_osm_features()
    print("4/5 Generating H3 Spatial Hexagon Grid (Res 9)...")
    build_h3_grid()
    print("5/5 Seeding 4 Demo Personas & Initial Pipeline...")
    seed_demo_data()
    print("=== Master Data Ingestion Completed Successfully! ===")

if __name__ == "__main__":
    run_all()
