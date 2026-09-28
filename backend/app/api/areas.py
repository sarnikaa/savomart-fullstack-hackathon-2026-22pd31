import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.deps import get_current_user, require_role
from backend.app.models.user import User
from backend.app.models.geo import Pincode
from backend.app.models.area import AreaAnalysis, ScoutingAssignment
from backend.app.schemas.area_schemas import (
    AreaAnalyzeRequest,
    AreaAnalysisResponse,
    ScoutingAssignmentCreateRequest,
    ScoutingAssignmentResponse
)
from backend.app.services.analysis_job import run_area_analysis_job
from backend.app.services.osm_client import CHENNAI_LOCALITIES

router = APIRouter(prefix="/api/areas", tags=["M1: Area Intelligence"])

@router.get("/pincodes")
def list_chennai_localities(db: Session = Depends(get_db)):
    """Returns Chennai localities and pincodes for search and map selection."""
    pincodes = db.query(Pincode).all()
    if pincodes:
        return [
            {
                "pincode": p.pincode,
                "locality_name": p.locality_name,
                "lat": p.centroid_lat,
                "lon": p.centroid_lon,
                "district": p.district
            }
            for p in pincodes
        ]
    return CHENNAI_LOCALITIES

@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
def start_area_analysis(
    request: AreaAnalyzeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role("bd_manager")),
    db: Session = Depends(get_db)
):
    """
    Triggers an asynchronous Area Fitness Analysis.
    Returns 202 with analysis job ID for frontend polling.
    Enforces BD Manager role.
    """
    title = request.title
    if not title:
        if request.locality_name:
            title = f"{request.locality_name} Area Fitness"
        elif request.pincode:
            title = f"Pincode {request.pincode} Area Fitness"
        elif request.h3_cells:
            title = f"Selected Cluster ({len(request.h3_cells)} cells)"
        else:
            title = "Chennai Area Fitness Analysis"

    analysis = AreaAnalysis(
        requested_by_user_id=current_user.id,
        title=title,
        selection_type=request.selection_type,
        selection_payload_json=json.dumps(request.dict()),
        h3_indices_json="[]",
        status="queued",
        current_stage="queued",
        progress_pct=5
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Launch staged background worker
    background_tasks.add_task(run_area_analysis_job, analysis.id)

    return {
        "analysis_id": analysis.id,
        "status": "queued",
        "title": analysis.title,
        "message": "Area analysis job queued successfully."
    }

@router.get("/analyses/{analysis_id}")
def get_analysis_status_or_report(
    analysis_id: str,
    db: Session = Depends(get_db)
):
    """
    Polls the status of an ongoing analysis or retrieves completed report.
    Returns current stage, progress, or full report if done.
    """
    analysis = db.query(AreaAnalysis).filter(AreaAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis job {analysis_id} not found"
        )

    res = {
        "id": analysis.id,
        "title": analysis.title,
        "selection_type": analysis.selection_type,
        "status": analysis.status,
        "current_stage": analysis.current_stage,
        "progress_pct": analysis.progress_pct,
        "error_message": analysis.error_message,
        "fitness_score": analysis.fitness_score,
        "is_llm_generated": analysis.is_llm_generated,
        "scoring_version": analysis.scoring_version,
        "narrative": analysis.narrative,
        "created_at": analysis.created_at,
        "completed_at": analysis.completed_at,
    }

    if analysis.status == "done":
        res["subscores"] = json.loads(analysis.subscores_json) if analysis.subscores_json else {}
        res["raw_metrics"] = json.loads(analysis.raw_metrics_json) if analysis.raw_metrics_json else {}
        res["hotspots"] = json.loads(analysis.hotspots_json) if analysis.hotspots_json else []
        res["data_snapshot"] = json.loads(analysis.data_snapshot_json) if analysis.data_snapshot_json else {}
        res["h3_cells"] = json.loads(analysis.h3_indices_json) if analysis.h3_indices_json else []

    return res

@router.post("/analyses/{analysis_id}/retry")
def retry_area_analysis(
    analysis_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role("bd_manager")),
    db: Session = Depends(get_db)
):
    """Retries a failed analysis job."""
    analysis = db.query(AreaAnalysis).filter(AreaAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    analysis.status = "queued"
    analysis.current_stage = "queued"
    analysis.error_message = None
    analysis.progress_pct = 5
    db.commit()

    background_tasks.add_task(run_area_analysis_job, analysis.id)
    return {"message": "Job re-queued successfully", "status": "queued"}

@router.get("/analyses")
def list_saved_analyses(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Returns saved area analyses for review and comparison."""
    analyses = db.query(AreaAnalysis).order_by(AreaAnalysis.created_at.desc()).limit(limit).all()
    results = []
    for a in analyses:
        results.append({
            "id": a.id,
            "title": a.title,
            "status": a.status,
            "fitness_score": a.fitness_score,
            "created_at": a.created_at,
            "completed_at": a.completed_at,
            "subscores": json.loads(a.subscores_json) if a.subscores_json else None,
            "hotspots_count": len(json.loads(a.hotspots_json)) if a.hotspots_json else 0
        })
    return results

@router.get("/compare")
def compare_area_analyses(
    ids: str = Query(..., description="Comma-separated analysis IDs, e.g. id1,id2"),
    db: Session = Depends(get_db)
):
    """Compares 2 or more saved area analyses side-by-side."""
    analysis_ids = [i.strip() for i in ids.split(",") if i.strip()]
    if len(analysis_ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 analysis IDs to compare.")

    records = db.query(AreaAnalysis).filter(AreaAnalysis.id.in_(analysis_ids)).all()
    items = []
    for a in records:
        items.append({
            "id": a.id,
            "title": a.title,
            "fitness_score": a.fitness_score,
            "subscores": json.loads(a.subscores_json) if a.subscores_json else {},
            "raw_metrics": json.loads(a.raw_metrics_json) if a.raw_metrics_json else {},
            "hotspots": json.loads(a.hotspots_json) if a.hotspots_json else [],
            "created_at": a.created_at,
        })
    return {"comparison": items}

@router.post("/assignments", response_model=ScoutingAssignmentResponse)
def create_scouting_assignment(
    request: ScoutingAssignmentCreateRequest,
    current_user: User = Depends(require_role("bd_manager")),
    db: Session = Depends(get_db)
):
    """BD Manager assigns scouting mission to a BD Executive for a specific hotspot/area."""
    assignment = ScoutingAssignment(
        created_by_user_id=current_user.id,
        assigned_to_user_id=request.assigned_to_user_id,
        area_analysis_id=request.area_analysis_id,
        target_h3_index=request.target_h3_index,
        target_name=request.target_name,
        notes=request.notes,
        priority=request.priority or "medium",
        status="pending"
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("/assignments")
def list_scouting_assignments(
    assigned_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists scouting missions (filtered by assigned executive or all)."""
    q = db.query(ScoutingAssignment)
    if assigned_to:
        q = q.filter(ScoutingAssignment.assigned_to_user_id == assigned_to)
    return q.order_by(ScoutingAssignment.created_at.desc()).all()
