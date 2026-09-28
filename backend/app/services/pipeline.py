from typing import Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.property import Property, PropertyEvent
from backend.app.models.user import User

# Allowed pipeline forward and branch transitions
ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "sighted": ["bd_review", "rejected"],
    "bd_review": ["catchment_requested", "negotiation", "rejected"],
    "catchment_requested": ["catchment_completed", "rejected"], # catchment_completed usually via M3
    "catchment_completed": ["negotiation", "rejected"],
    "negotiation": ["approved", "rejected"],
    "approved": [], # terminal success
    "rejected": ["sighted"] # allow reactivation if required with justification
}

def transition_property_stage(
    property_id: str,
    to_stage: str,
    reason: str,
    user: User,
    db: Session,
    is_system_event: bool = False
) -> Property:
    """
    Strict state-machine stage transition engine.
    Validates legal transitions and logs immutable audit event.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property {property_id} not found"
        )

    current_stage = prop.status.lower()
    target_stage = to_stage.lower()

    if target_stage not in ALLOWED_TRANSITIONS.get(current_stage, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage transition from '{current_stage}' to '{target_stage}'. Allowed: {ALLOWED_TRANSITIONS.get(current_stage, [])}"
        )

    # Catchment completed should not be manually set without a reason indicating survey completion
    if target_stage == "catchment_completed" and not is_system_event and "survey" not in reason.lower() and "catchment" not in reason.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage 'catchment_completed' must be triggered via Catchment Study completion."
        )

    # Perform transition
    prop.status = target_stage
    event = PropertyEvent(
        property_id=prop.id,
        user_id=user.id,
        from_stage=current_stage,
        to_stage=target_stage,
        reason=reason.strip(),
        event_type="stage_transition"
    )
    db.add(event)
    db.commit()
    db.refresh(prop)
    return prop
