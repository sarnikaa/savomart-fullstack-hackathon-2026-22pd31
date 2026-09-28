import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from backend.app.database import Base

class Property(Base):
    __tablename__ = "properties"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=False)
    pincode = Column(String(10), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    h3_index = Column(String(20), nullable=True)
    scouted_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assignment_id = Column(String(36), ForeignKey("scouting_assignments.id"), nullable=True)
    status = Column(
        String(30), 
        default="sighted"
    ) # sighted, bd_review, catchment_requested, catchment_completed, negotiation, approved, rejected
    rent_monthly = Column(Float, nullable=True)
    deposit_amount = Column(Float, nullable=True)
    lock_in_months = Column(Integer, default=36)
    carpet_area_sqft = Column(Float, nullable=False)
    frontage_ft = Column(Float, nullable=False)
    ceiling_height_ft = Column(Float, default=11.0)
    floor_position = Column(String(30), default="ground_floor") # ground_floor, first_floor, basement_gf
    road_width_ft = Column(Float, default=30.0)
    parking_two_wheeler = Column(Integer, default=10)
    parking_four_wheeler = Column(Integer, default=3)
    has_power_backup = Column(Boolean, default=True)
    has_loading_dock = Column(Boolean, default=True)
    photos_json = Column(Text, nullable=True)
    contact_name = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    is_incomplete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PropertyEvaluation(Base):
    __tablename__ = "property_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    trigger = Column(String(30), nullable=False) # initial_onboarding, catchment_completed, manual_recalc
    total_score = Column(Float, nullable=False)
    recommendation = Column(String(30), nullable=False) # strong_go, conditional_go, high_risk, reject
    subscores_json = Column(Text, nullable=False)
    risks_json = Column(Text, nullable=False)
    insights_json = Column(Text, nullable=False)
    is_provisional = Column(Boolean, default=True)
    benchmark_version = Column(String(20), default="chennai_retail_v1")
    created_at = Column(DateTime, default=datetime.utcnow)

class PropertyEvent(Base):
    __tablename__ = "property_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    from_stage = Column(String(30), nullable=True)
    to_stage = Column(String(30), nullable=False)
    reason = Column(Text, nullable=False)
    event_type = Column(String(30), default="stage_transition")
    created_at = Column(DateTime, default=datetime.utcnow)
