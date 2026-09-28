from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.geo import SavomartStore
from backend.app.services.savo_stores import sync_savomart_stores

router = APIRouter(prefix="/api/stores", tags=["Savomart Stores"])

@router.get("")
def get_stores(db: Session = Depends(get_db)):
    """
    Returns operational Savomart stores in Chennai with clear provenance tag
    ('live_api' or 'sample_fallback').
    """
    stores = db.query(SavomartStore).filter(SavomartStore.is_operational == True).all()
    if not stores:
        # Initial on-demand sync
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stores_list, src = loop.run_until_complete(sync_savomart_stores(db))
        loop.close()
        stores = db.query(SavomartStore).filter(SavomartStore.is_operational == True).all()

    source_tag = "live_api" if any(s.source == "live_api" for s in stores) else "sample_fallback"
    return {
        "source": source_tag,
        "is_sample_fallback": source_tag == "sample_fallback",
        "stores_count": len(stores),
        "stores": [
            {
                "id": s.id,
                "store_code": s.store_code,
                "name": s.name,
                "address": s.address,
                "lat": s.lat,
                "lon": s.lon,
                "is_operational": s.is_operational,
                "opened_at": s.opened_at,
                "source": s.source
            }
            for s in stores
        ]
    }

@router.post("/sync")
async def trigger_stores_sync(db: Session = Depends(get_db)):
    """Triggers an active fetch from the internal live stores API."""
    stores_list, source = await sync_savomart_stores(db)
    return {
        "status": "success",
        "source": source,
        "is_sample_fallback": source == "sample_fallback",
        "synced_count": len(stores_list)
    }
