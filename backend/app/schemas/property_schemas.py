from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PropertyCreateRequest(BaseModel):
    name: str
    address: str
    pincode: str
    lat: float
    lon: float
    assignment_id: Optional[str] = None
    rent_monthly: Optional[float] = None
    deposit_amount: Optional[float] = None
    lock_in_months: Optional[int] = 36
    carpet_area_sqft: float
    frontage_ft: float
    ceiling_height_ft: Optional[float] = 11.0
    floor_position: Optional[str] = "ground_floor"
    road_width_ft: Optional[float] = 30.0
    parking_two_wheeler: Optional[int] = 10
    parking_four_wheeler: Optional[int] = 3
    has_power_backup: Optional[bool] = True
    has_loading_dock: Optional[bool] = True
    photos: Optional[List[str]] = []
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None

class PropertyEvaluationResponse(BaseModel):
    id: str
    property_id: str
    trigger: str
    total_score: float
    recommendation: str # strong_go, conditional_go, high_risk, reject
    subscores: Dict[str, Any]
    risks: List[str]
    insights: List[str]
    is_provisional: bool
    benchmark_version: str
    created_at: datetime

    class Config:
        from_attributes = True

class PropertyEventResponse(BaseModel):
    id: str
    property_id: str
    user_id: Optional[str]
    from_stage: Optional[str]
    to_stage: str
    reason: str
    event_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class PropertyResponse(BaseModel):
    id: str
    code: str
    name: str
    address: str
    pincode: str
    lat: float
    lon: float
    h3_index: Optional[str] = None
    scouted_by_user_id: Optional[str] = None
    assignment_id: Optional[str] = None
    status: str
    rent_monthly: Optional[float] = None
    deposit_amount: Optional[float] = None
    lock_in_months: int
    carpet_area_sqft: float
    frontage_ft: float
    ceiling_height_ft: float
    floor_position: str
    road_width_ft: float
    parking_two_wheeler: int
    parking_four_wheeler: int
    has_power_backup: bool
    has_loading_dock: bool
    photos: List[str] = []
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    is_incomplete: bool
    created_at: datetime
    updated_at: datetime
    latest_evaluation: Optional[PropertyEvaluationResponse] = None
    events: Optional[List[PropertyEventResponse]] = None

    class Config:
        from_attributes = True

class PropertyStageUpdateRequest(BaseModel):
    to_stage: str
    reason: str = Field(..., min_length=3, description="Mandatory rationale for stage transition")
