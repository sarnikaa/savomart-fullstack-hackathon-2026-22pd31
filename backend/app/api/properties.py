import json
import uuid
import h3
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.deps import get_current_user, require_role
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.property import Property, PropertyEvaluation, PropertyEvent
from backend.app.schemas.property_schemas import (
    PropertyCreateRequest,
    PropertyResponse,
    PropertyStageUpdateRequest,
    PropertyEvaluationResponse,
    PropertyEventResponse
)
from backend.app.services.savo_stores import haversine_km
from backend.app.services.scoring.property_score import compute_property_evaluation
from backend.app.services.pipeline import transition_property_stage

router = APIRouter(prefix="/api/properties", tags=["M2: Property Pipeline & Scouting"])

def check_chennai_bounds(lat: float, lon: float):
    b = settings.CHENNAI_BOUNDS
    if not (b["min_lat"] <= lat <= b["max_lat"] and b["min_lon"] <= lon <= b["max_lon"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location ({lat}, {lon}) is outside the Greater Chennai / CMA boundary. Properties must be within Chennai region."
        )

@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def onboard_property(
    request: PropertyCreateRequest,
    current_user: User = Depends(require_role("bd_executive", "bd_manager")),
    db: Session = Depends(get_db)
):
    """
    Onboard a field property with GPS coordinates, photos, and physical/commercial terms.
    Enforces Chennai boundary check and alerts on duplicates within 50m.
    Runs automated multi-factor evaluation.
    """
    # 1. Boundary check
    check_chennai_bounds(request.lat, request.lon)

    # 2. Duplicate detection (within 50 meters)
    existing_props = db.query(Property).all()
    for ep in existing_props:
        dist_m = haversine_km(request.lat, request.lon, ep.lat, ep.lon) * 1000.0
        if dist_m <= 50.0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Potential duplicate property: '{ep.name}' ({ep.code}) is located only {int(dist_m)}m away at {ep.address}."
            )

    # 3. Resolve H3 cell
    cell = h3.latlng_to_cell(request.lat, request.lon, 9)

    # 4. Generate unique property code
    count = db.query(Property).count() + 1
    code = f"PROP-CHN-{count:04d}"

    is_incomplete = request.rent_monthly is None or request.rent_monthly <= 0

    prop = Property(
        code=code,
        name=request.name,
        address=request.address,
        pincode=request.pincode,
        lat=request.lat,
        lon=request.lon,
        h3_index=cell,
        scouted_by_user_id=current_user.id,
        assignment_id=request.assignment_id,
        status="sighted",
        rent_monthly=request.rent_monthly,
        deposit_amount=request.deposit_amount,
        lock_in_months=request.lock_in_months or 36,
        carpet_area_sqft=request.carpet_area_sqft,
        frontage_ft=request.frontage_ft,
        ceiling_height_ft=request.ceiling_height_ft or 11.0,
        floor_position=request.floor_position or "ground_floor",
        road_width_ft=request.road_width_ft or 30.0,
        parking_two_wheeler=request.parking_two_wheeler or 10,
        parking_four_wheeler=request.parking_four_wheeler or 3,
        has_power_backup=request.has_power_backup if request.has_power_backup is not None else True,
        has_loading_dock=request.has_loading_dock if request.has_loading_dock is not None else True,
        photos_json=json.dumps(request.photos or []),
        contact_name=request.contact_name,
        contact_phone=request.contact_phone,
        is_incomplete=is_incomplete
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)

    # 5. Automated Evaluation Engine
    eval_result = compute_property_evaluation(
        rent_monthly=request.rent_monthly,
        carpet_area_sqft=request.carpet_area_sqft,
        frontage_ft=request.frontage_ft,
        ceiling_height_ft=request.ceiling_height_ft or 11.0,
        floor_position=request.floor_position or "ground_floor",
        road_width_ft=request.road_width_ft or 30.0,
        parking_four_wheeler=request.parking_four_wheeler or 3,
        has_power_backup=request.has_power_backup if request.has_power_backup is not None else True,
        has_loading_dock=request.has_loading_dock if request.has_loading_dock is not None else True,
        area_fitness_score=75.0, # default baseline for locality
        pincode=request.pincode
    )

    eval_record = PropertyEvaluation(
        property_id=prop.id,
        trigger="initial_onboarding",
        total_score=eval_result["total_score"],
        recommendation=eval_result["recommendation"],
        subscores_json=json.dumps(eval_result["subscores"]),
        risks_json=json.dumps(eval_result["risks"]),
        insights_json=json.dumps(eval_result["insights"]),
        is_provisional=True
    )
    db.add(eval_record)

    # 6. Audit Event
    initial_event = PropertyEvent(
        property_id=prop.id,
        user_id=current_user.id,
        from_stage=None,
        to_stage="sighted",
        reason="Field onboarding by BD Executive. Initial evaluation generated.",
        event_type="onboarding"
    )
    db.add(initial_event)
    db.commit()
    db.refresh(prop)

    return get_property_detail(prop.id, db)

@router.get("", response_model=List[PropertyResponse])
def list_properties(
    status_filter: Optional[str] = None,
    pincode: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists properties with their latest evaluation and history."""
    q = db.query(Property)
    if status_filter:
        q = q.filter(Property.status == status_filter)
    if pincode:
        q = q.filter(Property.pincode == pincode)
    
    properties = q.order_by(Property.created_at.desc()).all()
    return [get_property_detail(p.id, db) for p in properties]

@router.get("/{property_id}", response_model=PropertyResponse)
def get_property_detail(property_id: str, db: Session = Depends(get_db)):
    """Retrieves full property record, latest evaluation, and audit events."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    latest_eval = db.query(PropertyEvaluation).filter(
        PropertyEvaluation.property_id == prop.id
    ).order_by(PropertyEvaluation.created_at.desc()).first()

    eval_resp = None
    if latest_eval:
        eval_resp = PropertyEvaluationResponse(
            id=latest_eval.id,
            property_id=latest_eval.property_id,
            trigger=latest_eval.trigger,
            total_score=latest_eval.total_score,
            recommendation=latest_eval.recommendation,
            subscores=json.loads(latest_eval.subscores_json),
            risks=json.loads(latest_eval.risks_json),
            insights=json.loads(latest_eval.insights_json),
            is_provisional=latest_eval.is_provisional,
            benchmark_version=latest_eval.benchmark_version,
            created_at=latest_eval.created_at
        )

    events = db.query(PropertyEvent).filter(
        PropertyEvent.property_id == prop.id
    ).order_by(PropertyEvent.created_at.asc()).all()

    events_resp = [
        PropertyEventResponse(
            id=e.id,
            property_id=e.property_id,
            user_id=e.user_id,
            from_stage=e.from_stage,
            to_stage=e.to_stage,
            reason=e.reason,
            event_type=e.event_type,
            created_at=e.created_at
        )
        for e in events
    ]

    return PropertyResponse(
        id=prop.id,
        code=prop.code,
        name=prop.name,
        address=prop.address,
        pincode=prop.pincode,
        lat=prop.lat,
        lon=prop.lon,
        h3_index=prop.h3_index,
        scouted_by_user_id=prop.scouted_by_user_id,
        assignment_id=prop.assignment_id,
        status=prop.status,
        rent_monthly=prop.rent_monthly,
        deposit_amount=prop.deposit_amount,
        lock_in_months=prop.lock_in_months,
        carpet_area_sqft=prop.carpet_area_sqft,
        frontage_ft=prop.frontage_ft,
        ceiling_height_ft=prop.ceiling_height_ft,
        floor_position=prop.floor_position,
        road_width_ft=prop.road_width_ft,
        parking_two_wheeler=prop.parking_two_wheeler,
        parking_four_wheeler=prop.parking_four_wheeler,
        has_power_backup=prop.has_power_backup,
        has_loading_dock=prop.has_loading_dock,
        photos=json.loads(prop.photos_json) if prop.photos_json else [],
        contact_name=prop.contact_name,
        contact_phone=prop.contact_phone,
        is_incomplete=prop.is_incomplete,
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        latest_evaluation=eval_resp,
        events=events_resp
    )

@router.patch("/{property_id}/stage", response_model=PropertyResponse)
def update_property_stage(
    property_id: str,
    request: PropertyStageUpdateRequest,
    current_user: User = Depends(require_role("bd_manager")),
    db: Session = Depends(get_db)
):
    """
    Progresses property through the state-machine pipeline.
    Requires BD Manager role and mandatory transition reason.
    """
    updated_prop = transition_property_stage(
        property_id=property_id,
        to_stage=request.to_stage,
        reason=request.reason,
        user=current_user,
        db=db
    )
    return get_property_detail(updated_prop.id, db)
