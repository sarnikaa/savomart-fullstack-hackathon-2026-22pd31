import pytest
from fastapi import HTTPException
from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.models.property import Property, PropertyEvent
from backend.app.services.pipeline import transition_property_stage

def test_pipeline_transitions():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == "bd_manager").first()
        prop = db.query(Property).filter(Property.status == "sighted").first()
        if not prop:
            pytest.skip("No sighted property found in demo DB")

        # Legal transition: sighted -> bd_review
        updated = transition_property_stage(
            property_id=prop.id,
            to_stage="bd_review",
            reason="BD review initiated based on strong frontage",
            user=user,
            db=db
        )
        assert updated.status == "bd_review"

        # Verify event was recorded
        event = db.query(PropertyEvent).filter(
            PropertyEvent.property_id == prop.id,
            PropertyEvent.to_stage == "bd_review"
        ).first()
        assert event is not None
        assert event.reason == "BD review initiated based on strong frontage"

        # Illegal transition: bd_review -> approved directly (must go through negotiation)
        with pytest.raises(HTTPException) as exc_info:
            transition_property_stage(
                property_id=prop.id,
                to_stage="approved",
                reason="Skipping straight to approval",
                user=user,
                db=db
            )
        assert exc_info.value.status_code == 400
    finally:
        db.close()
