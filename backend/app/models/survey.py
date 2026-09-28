import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from backend.app.database import Base

class CatchmentStudy(Base):
    __tablename__ = "catchment_studies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(20), unique=True, nullable=False)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=True)
    area_analysis_id = Column(String(36), ForeignKey("area_analyses.id"), nullable=True)
    requested_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default="requested") # requested, partitioned, in_progress, completed
    radius_meters = Column(Integer, default=500)
    h3_cells_json = Column(Text, nullable=True)
    reused_from_study_id = Column(String(36), ForeignKey("catchment_studies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class SurveyTask(Base):
    __tablename__ = "survey_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    catchment_study_id = Column(String(36), ForeignKey("catchment_studies.id"), nullable=False)
    assigned_to_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    name = Column(String(150), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    h3_cells_json = Column(Text, nullable=False)
    lane_ids_json = Column(Text, nullable=False)
    status = Column(String(30), default="assigned") # assigned, in_progress, completed
    due_date = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LaneSurvey(Base):
    __tablename__ = "lane_surveys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    survey_task_id = Column(String(36), ForeignKey("survey_tasks.id"), nullable=False)
    lane_id = Column(String(50), nullable=False)
    surveyor_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    client_uuid = Column(String(50), unique=True, nullable=False)
    lane_name = Column(String(150), nullable=False)
    measured_width_ft = Column(Float, nullable=False)
    pedestrian_count_10min = Column(Integer, nullable=False)
    measurement_time_slot = Column(String(50), nullable=False) # morning_peak, afternoon_regular, evening_peak
    kirana_count = Column(Integer, default=0)
    supermarket_count = Column(Integer, default=0)
    household_tags_json = Column(Text, nullable=True) # e.g. ["high_density_apartments", "upper_middle_class"]
    obstacle_flags_json = Column(Text, nullable=True) # e.g. ["waterlogging_prone", "narrow_entry"]
    offline_created_at = Column(DateTime, nullable=True)
    synced_at = Column(DateTime, default=datetime.utcnow)

class CatchmentInsight(Base):
    __tablename__ = "catchment_insights"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    catchment_study_id = Column(String(36), ForeignKey("catchment_studies.id"), unique=True, nullable=False)
    quality_score = Column(Float, nullable=False)
    household_spend_monthly_inr = Column(Float, nullable=True) # MOCK
    footfall_index = Column(Float, nullable=False)
    competitor_density_index = Column(Float, nullable=False)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
