import json
import h3
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.geo import H3Cell
from backend.app.models.ingestion import IngestionRun
from backend.app.services.osm_client import CHENNAI_LOCALITIES

def build_h3_grid():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Load existing cells into set to avoid duplicate inserts
        existing_indices = set(r[0] for r in db.query(H3Cell.h3_index).all())
        total_cells = 0

        for loc in CHENNAI_LOCALITIES:
            center_cell = h3.latlng_to_cell(loc["lat"], loc["lon"], 9)
            disk = list(h3.grid_disk(center_cell, loc["radius_cells"]))
            for cell in disk:
                if cell in existing_indices:
                    continue
                
                existing_indices.add(cell)
                lat, lon = h3.cell_to_latlng(cell)
                seed_val = abs(hash(cell)) % 100
                res = int(40 + (seed_val % 50))
                com = int(20 + (seed_val % 35))
                trans = int(4 + (seed_val % 8))
                comp = int(2 + (seed_val % 7))

                cell_obj = H3Cell(
                    h3_index=cell,
                    resolution=9,
                    centroid_lat=round(lat, 5),
                    centroid_lon=round(lon, 5),
                    pincode=loc["pincode"],
                    residential_count=res,
                    commercial_count=com,
                    transit_count=trans,
                    competitor_count=comp
                )
                db.add(cell_obj)
                total_cells += 1

        run = IngestionRun(
            source="h3_grid_generator",
            version="resolution_9",
            records_count=total_cells,
            status="success",
            metadata_json=json.dumps({"resolution": 9, "cells_built": total_cells})
        )
        db.add(run)
        db.commit()
        print(f"Successfully populated {total_cells} distinct H3 resolution 9 cells across Chennai.")
    finally:
        db.close()

if __name__ == "__main__":
    build_h3_grid()
