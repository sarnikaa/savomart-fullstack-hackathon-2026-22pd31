import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class AreaAnalysis(Base):
    __tablename__ = "area_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requested_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(150), nullable=False)
    selection_type = Column(String(30), nullable=False) # pincode, locality, h3_cells
    selection_payload_json = Column(Text, nullable=False)
    h3_indices_json = Column(Text, nullable=False)
    status = Column(String(20), default="queued") # queued, running, done, failed
    current_stage = Column(String(50), nullable=True)
    progress_pct = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    fitness_score = Column(Float, nullable=True)
    subscores_json = Column(Text, nullable=True)
    raw_metrics_json = Column(Text, nullable=True)
    hotspots_json = Column(Text, nullable=True)
    narrative = Column(Text, nullable=True)
    is_llm_generated = Column(Boolean, default=False)
    scoring_version = Column(String(20), default="v1.0.0")
    data_snapshot_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class ScoutingAssignment(Base):
    __tablename__ = "scouting_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assigned_to_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    area_analysis_id = Column(String(36), ForeignKey("area_analyses.id"), nullable=True)
    target_h3_index = Column(String(20), nullable=True)
    target_name = Column(String(150), nullable=False)
    notes = Column(Text, nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="pending") # pending, in_progress, completed
    created_at = Column(DateTime, default=datetime.utcnow)
