from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class AreaAnalyzeRequest(BaseModel):
    title: Optional[str] = None
    selection_type: str  # 'pincode', 'locality', 'h3_cells'
    pincode: Optional[str] = None
    locality_name: Optional[str] = None
    h3_cells: Optional[List[str]] = None

class HotspotItem(BaseModel):
    h3_index: str
    name: str
    lat: float
    lon: float
    score: float
    rationale: str
    key_signals: List[str]

class SubscoresDetail(BaseModel):
    residential_density: float
    commercial_vitality: float
    competitive_gap: float
    transit_accessibility: float
    cannibalisation_safety: float
    weights_used: Dict[str, float]

class AreaAnalysisResponse(BaseModel):
    id: str
    title: str
    selection_type: str
    status: str # queued, running, done, failed
    current_stage: Optional[str] = None
    progress_pct: int = 0
    error_message: Optional[str] = None
    fitness_score: Optional[float] = None
    subscores: Optional[Dict[str, Any]] = None
    raw_metrics: Optional[Dict[str, Any]] = None
    hotspots: Optional[List[Dict[str, Any]]] = None
    narrative: Optional[str] = None
    is_llm_generated: bool = False
    scoring_version: str = "v1.0.0"
    data_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ScoutingAssignmentCreateRequest(BaseModel):
    area_analysis_id: Optional[str] = None
    assigned_to_user_id: str
    target_h3_index: Optional[str] = None
    target_name: str
    notes: Optional[str] = None
    priority: Optional[str] = "medium"

class ScoutingAssignmentResponse(BaseModel):
    id: str
    created_by_user_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    area_analysis_id: Optional[str] = None
    target_h3_index: Optional[str] = None
    target_name: str
    notes: Optional[str] = None
    priority: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
