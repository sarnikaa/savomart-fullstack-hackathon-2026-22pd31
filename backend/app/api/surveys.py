import json
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.deps import get_current_user, require_role
from backend.app.models.user import User
from backend.app.models.property import Property
from backend.app.models.survey import CatchmentStudy, SurveyTask, LaneSurvey, CatchmentInsight
from backend.app.schemas.survey_schemas import (
    CatchmentStudyCreateRequest,
    CatchmentStudyResponse,
    CatchmentReuseCheckResponse,
    SurveyTaskResponse,
    LaneSurveyBatchSyncRequest,
    LaneSurveyResponse,
    CatchmentInsightResponse
)
from backend.app.services.survey_split import (
    get_catchment_h3_cells,
    check_catchment_reuse,
    partition_catchment_tasks,
    rollup_catchment_insights
)

router = APIRouter(prefix="/api/surveys", tags=["M3: Catchment Study & Field Operations"])

@router.get("/catchments/check-reuse", response_model=CatchmentReuseCheckResponse)
def evaluate_catchment_reuse(
    lat: float = Query(...),
    lon: float = Query(...),
    db: Session = Depends(get_db)
):
    """
    Checks if a completed catchment study exists within 500m
    that covers >= 70% of cells and is <= 90 days old.
    """
    result = check_catchment_reuse(lat, lon, db)
    return CatchmentReuseCheckResponse(**result)

@router.post("/catchments", response_model=CatchmentStudyResponse, status_code=status.HTTP_201_CREATED)
def request_catchment_study(
    request: CatchmentStudyCreateRequest,
    current_user: User = Depends(require_role("bd_manager")),
    db: Session = Depends(get_db)
):
    """
    BD Manager requests a Catchment Study for a property or area.
    If valid existing study is found and force_fresh=False, instantly reuses data.
    Otherwise, automatically partitions the 500m catchment into 3 balanced, non-overlapping tasks.
    """
    prop = None
    lat, lon = 13.0827, 80.2707

    if request.property_id:
        prop = db.query(Property).filter(Property.id == request.property_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        lat, lon = prop.lat, prop.lon

    # Check for reuse eligibility
    reuse_check = check_catchment_reuse(lat, lon, db)
    reused_id = None
    if reuse_check["can_reuse"] and not request.force_fresh:
        reused_id = reuse_check["reusable_study_id"]

    count = db.query(CatchmentStudy).count() + 1
    code = f"CATCH-CHN-{count:04d}"

    cells = get_catchment_h3_cells(lat, lon, request.radius_meters or 500)

    study = CatchmentStudy(
        code=code,
        property_id=request.property_id,
        area_analysis_id=request.area_analysis_id,
        requested_by_user_id=current_user.id,
        status="requested",
        radius_meters=request.radius_meters or 500,
        h3_cells_json=json.dumps(cells),
        reused_from_study_id=reused_id
    )
    db.add(study)
    db.commit()
    db.refresh(study)

    if reused_id:
        # Clone insights from reused study
        reused_insight = db.query(CatchmentInsight).filter(
            CatchmentInsight.catchment_study_id == reused_id
        ).first()
        if reused_insight:
            cloned_insight = CatchmentInsight(
                catchment_study_id=study.id,
                quality_score=reused_insight.quality_score,
                household_spend_monthly_inr=reused_insight.household_spend_monthly_inr,
                footfall_index=reused_insight.footfall_index,
                competitor_density_index=reused_insight.competitor_density_index,
                summary_json=json.dumps({
                    "note": f"Reused from Study #{reuse_check['study_code']} ({reuse_check['age_days']} days old)",
                    "coverage_pct": reuse_check["covered_cells_pct"]
                })
            )
            db.add(cloned_insight)
        study.status = "completed"
        study.completed_at = datetime.utcnow()
        db.commit()
    else:
        # Partition into 3 non-overlapping lane tasks
        partition_catchment_tasks(study, db)

    # If linked to a property, update property pipeline stage
    if prop:
        prop.status = "catchment_requested"
        db.commit()

    return get_catchment_detail(study.id, db)

@router.get("/catchments/{study_id}", response_model=CatchmentStudyResponse)
def get_catchment_detail(study_id: str, db: Session = Depends(get_db)):
    """Retrieves catchment study with tasks, completion progress, and rollup insights."""
    study = db.query(CatchmentStudy).filter(CatchmentStudy.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Catchment study not found")

    tasks = db.query(SurveyTask).filter(SurveyTask.catchment_study_id == study.id).all()
    tasks_resp = []
    total_tasks = len(tasks)
    completed_tasks = 0

    for t in tasks:
        surveys_count = db.query(LaneSurvey).filter(LaneSurvey.survey_task_id == t.id).count()
        if t.status == "completed" or surveys_count >= 3:
            completed_tasks += 1
        
        assigned_user = db.query(User).filter(User.id == t.assigned_to_user_id).first() if t.assigned_to_user_id else None

        tasks_resp.append(SurveyTaskResponse(
            id=t.id,
            catchment_study_id=t.catchment_study_id,
            assigned_to_user_id=t.assigned_to_user_id,
            assigned_to_name=assigned_user.name if assigned_user else "Unassigned",
            name=t.name,
            chunk_index=t.chunk_index,
            h3_cells=json.loads(t.h3_cells_json) if t.h3_cells_json else [],
            lane_ids=json.loads(t.lane_ids_json) if t.lane_ids_json else [],
            status=t.status,
            due_date=t.due_date,
            surveys_count=surveys_count,
            created_at=t.created_at
        ))

    progress_pct = int((completed_tasks / max(1, total_tasks)) * 100) if total_tasks > 0 else 100

    insight_resp = None
    insight = db.query(CatchmentInsight).filter(CatchmentInsight.catchment_study_id == study.id).first()
    if insight:
        insight_resp = CatchmentInsightResponse(
            id=insight.id,
            catchment_study_id=insight.catchment_study_id,
            quality_score=insight.quality_score,
            household_spend_monthly_inr=insight.household_spend_monthly_inr,
            footfall_index=insight.footfall_index,
            competitor_density_index=insight.competitor_density_index,
            summary=json.loads(insight.summary_json) if insight.summary_json else {},
            created_at=insight.created_at
        )

    prop = db.query(Property).filter(Property.id == study.property_id).first() if study.property_id else None

    return CatchmentStudyResponse(
        id=study.id,
        code=study.code,
        property_id=study.property_id,
        property_name=prop.name if prop else None,
        area_analysis_id=study.area_analysis_id,
        requested_by_user_id=study.requested_by_user_id,
        status=study.status,
        radius_meters=study.radius_meters,
        h3_cells=json.loads(study.h3_cells_json) if study.h3_cells_json else [],
        reused_from_study_id=study.reused_from_study_id,
        tasks=tasks_resp,
        insight=insight_resp,
        progress_pct=progress_pct,
        created_at=study.created_at,
        completed_at=study.completed_at
    )

@router.get("/catchments", response_model=List[CatchmentStudyResponse])
def list_catchment_studies(db: Session = Depends(get_db)):
    """Lists all catchment studies."""
    studies = db.query(CatchmentStudy).order_by(CatchmentStudy.created_at.desc()).all()
    return [get_catchment_detail(s.id, db) for s in studies]

@router.post("/tasks/{task_id}/assign")
def assign_survey_task(
    task_id: str,
    assigned_to_user_id: str = Query(...),
    due_date: Optional[str] = None,
    current_user: User = Depends(require_role("survey_manager")),
    db: Session = Depends(get_db)
):
    """Survey Manager delegates a survey chunk to a Survey Executive."""
    task = db.query(SurveyTask).filter(SurveyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Survey task not found")

    task.assigned_to_user_id = assigned_to_user_id
    if due_date:
        task.due_date = due_date
    task.status = "assigned"
    db.commit()
    return {"message": "Task assigned successfully", "task_id": task.id}

@router.get("/tasks", response_model=List[SurveyTaskResponse])
def list_survey_tasks(
    assigned_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists survey tasks (filtered by assigned executive for mobile view)."""
    q = db.query(SurveyTask)
    if assigned_to:
        q = q.filter(SurveyTask.assigned_to_user_id == assigned_to)
    tasks = q.order_by(SurveyTask.created_at.desc()).all()
    
    res = []
    for t in tasks:
        surveys_count = db.query(LaneSurvey).filter(LaneSurvey.survey_task_id == t.id).count()
        assigned_user = db.query(User).filter(User.id == t.assigned_to_user_id).first() if t.assigned_to_user_id else None
        res.append(SurveyTaskResponse(
            id=t.id,
            catchment_study_id=t.catchment_study_id,
            assigned_to_user_id=t.assigned_to_user_id,
            assigned_to_name=assigned_user.name if assigned_user else "Unassigned",
            name=t.name,
            chunk_index=t.chunk_index,
            h3_cells=json.loads(t.h3_cells_json) if t.h3_cells_json else [],
            lane_ids=json.loads(t.lane_ids_json) if t.lane_ids_json else [],
            status=t.status,
            due_date=t.due_date,
            surveys_count=surveys_count,
            created_at=t.created_at
        ))
    return res

@router.post("/sync")
def sync_lane_surveys(
    batch: LaneSurveyBatchSyncRequest,
    current_user: User = Depends(require_role("survey_executive", "survey_manager")),
    db: Session = Depends(get_db)
):
    """
    Offline-first sync endpoint for Survey Executives.
    Idempotent: deduplicates by client_uuid.
    Triggers automatic catchment rollup when task or study lanes are complete.
    """
    synced_ids = []
    affected_task_ids = set()

    for item in batch.surveys:
        # Deduplication check by client_uuid
        existing = db.query(LaneSurvey).filter(LaneSurvey.client_uuid == item.client_uuid).first()
        if existing:
            synced_ids.append(existing.id)
            continue

        survey = LaneSurvey(
            survey_task_id=item.survey_task_id,
            lane_id=item.lane_id,
            surveyor_user_id=current_user.id,
            client_uuid=item.client_uuid,
            lane_name=item.lane_name,
            measured_width_ft=item.measured_width_ft,
            pedestrian_count_10min=item.pedestrian_count_10min,
            measurement_time_slot=item.measurement_time_slot,
            kirana_count=item.kirana_count or 0,
            supermarket_count=item.supermarket_count or 0,
            household_tags_json=json.dumps(item.household_tags or []),
            obstacle_flags_json=json.dumps(item.obstacle_flags or []),
            offline_created_at=item.offline_created_at
        )
        db.add(survey)
        synced_ids.append(survey.id)
        affected_task_ids.add(item.survey_task_id)

    db.commit()

    # Update task statuses and check for study completion
    for task_id in affected_task_ids:
        task = db.query(SurveyTask).filter(SurveyTask.id == task_id).first()
        if task:
            task.status = "completed"
            db.commit()
            # Trigger rollup for parent study
            rollup_catchment_insights(task.catchment_study_id, db)

    return {
        "status": "success",
        "synced_count": len(synced_ids),
        "synced_ids": synced_ids
    }

@router.post("/catchments/{study_id}/rollup")
def trigger_study_rollup(
    study_id: str,
    db: Session = Depends(get_db)
):
    """Synthesizes all submitted lane surveys into Catchment Quality Score and Insights."""
    insight = rollup_catchment_insights(study_id, db)
    return {
        "status": "completed",
        "quality_score": insight.quality_score,
        "footfall_index": insight.footfall_index,
        "competitor_density_index": insight.competitor_density_index,
        "household_spend_monthly_inr": insight.household_spend_monthly_inr
    }
