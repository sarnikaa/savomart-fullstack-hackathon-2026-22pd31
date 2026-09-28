import json
import asyncio
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.ingestion import IngestionRun
from backend.app.services.savo_stores import sync_savomart_stores

def load_stores():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stores_list, source = loop.run_until_complete(sync_savomart_stores(db))
        loop.close()

        run = IngestionRun(
            source=f"savomart_stores_{source}",
            version="1.0.0",
            records_count=len(stores_list),
            status="success",
            metadata_json=json.dumps({
                "source": source,
                "is_fallback": source == "sample_fallback",
                "synced_count": len(stores_list)
            })
        )
        db.add(run)
        db.commit()
        print(f"Successfully processed Savomart operational stores. Source: {source}, count: {len(stores_list)}")
    finally:
        db.close()

if __name__ == "__main__":
    load_stores()
