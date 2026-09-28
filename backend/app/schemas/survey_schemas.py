from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class CatchmentStudyCreateRequest(BaseModel):
    property_id: Optional[str] = None
    area_analysis_id: Optional[str] = None
    radius_meters: Optional[int] = 500
    force_fresh: Optional[bool] = False # If true, skip reuse even if available

class CatchmentReuseCheckResponse(BaseModel):
    can_reuse: bool
    reusable_study_id: Optional[str] = None
    study_code: Optional[str] = None
    age_days: Optional[int] = None
    distance_meters: Optional[float] = None
    covered_cells_pct: float = 0.0
    message: str

class LaneSurveyItem(BaseModel):
    client_uuid: str
    survey_task_id: str
    lane_id: str
    lane_name: str
    measured_width_ft: float
    pedestrian_count_10min: int
    measurement_time_slot: str # morning_peak, afternoon_regular, evening_peak
    kirana_count: Optional[int] = 0
    supermarket_count: Optional[int] = 0
    household_tags: Optional[List[str]] = []
    obstacle_flags: Optional[List[str]] = []
    offline_created_at: Optional[datetime] = None

class LaneSurveyBatchSyncRequest(BaseModel):
    surveys: List[LaneSurveyItem]

class LaneSurveyResponse(BaseModel):
    id: str
    survey_task_id: str
    lane_id: str
    client_uuid: str
    lane_name: str
    measured_width_ft: float
    pedestrian_count_10min: int
    measurement_time_slot: str
    kirana_count: int
    supermarket_count: int
    household_tags: List[str] = []
    obstacle_flags: List[str] = []
    synced_at: datetime

    class Config:
        from_attributes = True

class SurveyTaskResponse(BaseModel):
    id: str
    catchment_study_id: str
    assigned_to_user_id: Optional[str]
    assigned_to_name: Optional[str] = None
    name: str
    chunk_index: int
    h3_cells: List[str]
    lane_ids: List[str]
    status: str
    due_date: Optional[str]
    surveys_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class CatchmentInsightResponse(BaseModel):
    id: str
    catchment_study_id: str
    quality_score: float
    household_spend_monthly_inr: Optional[float] # MOCK
    footfall_index: float
    competitor_density_index: float
    summary: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CatchmentStudyResponse(BaseModel):
    id: str
    code: str
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    area_analysis_id: Optional[str] = None
    requested_by_user_id: Optional[str] = None
    status: str
    radius_meters: int
    h3_cells: List[str] = []
    reused_from_study_id: Optional[str] = None
    tasks: Optional[List[SurveyTaskResponse]] = None
    insight: Optional[CatchmentInsightResponse] = None
    progress_pct: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
