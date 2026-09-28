import json
from backend.app.database import SessionLocal
from backend.app.services.survey_split import (
    get_catchment_h3_cells,
    check_catchment_reuse
)

def test_catchment_cells_resolution():
    lat, lon = 12.9750, 80.2212 # Velachery
    cells = get_catchment_h3_cells(lat, lon, 500)
    assert len(cells) > 0
    # Every cell should be a valid H3 string
    for c in cells:
        assert isinstance(c, str)
        assert len(c) == 15

def test_catchment_reuse_check():
    db = SessionLocal()
    try:
        # Check against existing Velachery coords
        reuse_info = check_catchment_reuse(12.9772, 80.2198, db)
        assert "can_reuse" in reuse_info
        assert "message" in reuse_info
    finally:
        db.close()
