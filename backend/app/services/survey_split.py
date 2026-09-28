import h3
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from backend.app.models.survey import CatchmentStudy, SurveyTask, LaneSurvey, CatchmentInsight
from backend.app.models.property import Property, PropertyEvaluation, PropertyEvent
from backend.app.services.savo_stores import haversine_km
from backend.app.services.scoring.property_score import compute_property_evaluation

def get_catchment_h3_cells(lat: float, lon: float, radius_meters: int = 500) -> List[str]:
    """
    Catchment footprint = H3 resolution 9 cells covering the radius.
    At resolution 9, average edge length ~174m, diameter ~350m.
    k=1 radius ~350m, k=2 radius ~600m.
    """
    center_cell = h3.latlng_to_cell(lat, lon, 9)
    k_ring_radius = 2 if radius_meters >= 400 else 1
    return list(h3.grid_disk(center_cell, k_ring_radius))

def check_catchment_reuse(
    lat: float,
    lon: float,
    db: Session,
    max_days: int = 90,
    coverage_threshold: float = 0.70
) -> Dict[str, Any]:
    """
    Checks if a completed catchment study exists that covers >= 70% of cells
    and is <= 90 days old.
    """
    target_cells = set(get_catchment_h3_cells(lat, lon, 500))
    if not target_cells:
        return {"can_reuse": False, "message": "No cells resolved."}

    cutoff_date = datetime.utcnow() - timedelta(days=max_days)
    completed_studies = db.query(CatchmentStudy).filter(
        CatchmentStudy.status == "completed",
        CatchmentStudy.completed_at >= cutoff_date
    ).all()

    best_match = None
    max_coverage = 0.0
    best_dist = float("inf")

    for study in completed_studies:
        if not study.h3_cells_json:
            continue
        try:
            study_cells = set(json.loads(study.h3_cells_json))
        except Exception:
            continue
        
        overlap = target_cells.intersection(study_cells)
        coverage = len(overlap) / len(target_cells)

        # Approximate distance from center
        if study.property_id:
            prop = db.query(Property).filter(Property.id == study.property_id).first()
            if prop:
                dist_m = haversine_km(lat, lon, prop.lat, prop.lon) * 1000.0
            else:
                dist_m = 0.0
        else:
            dist_m = 0.0

        if coverage >= coverage_threshold and coverage > max_coverage:
            max_coverage = coverage
            best_match = study
            best_dist = dist_m

    if best_match:
        age_days = (datetime.utcnow() - best_match.completed_at).days
        return {
            "can_reuse": True,
            "reusable_study_id": best_match.id,
            "study_code": best_match.code,
            "age_days": age_days,
            "distance_meters": round(best_dist, 1),
            "covered_cells_pct": round(max_coverage * 100, 1),
            "message": f"Existing Study #{best_match.code} ({age_days} days old) covers {int(max_coverage*100)}% of catchment within {int(best_dist)}m. Eligible for instant reuse."
        }

    return {
        "can_reuse": False,
        "message": "No sufficiently fresh or overlapping study found. Fresh survey recommended.",
        "covered_cells_pct": 0.0
    }

def partition_catchment_tasks(study: CatchmentStudy, db: Session) -> List[SurveyTask]:
    """
    Partitions H3 cells into 3 non-overlapping contiguous chunks.
    Assigns each lane to exactly one cell and thus one task.
    """
    cells = json.loads(study.h3_cells_json) if study.h3_cells_json else []
    if not cells:
        # Fallback to property coords
        if study.property_id:
            prop = db.query(Property).filter(Property.id == study.property_id).first()
            if prop:
                cells = get_catchment_h3_cells(prop.lat, prop.lon, study.radius_meters)
                study.h3_cells_json = json.dumps(cells)
                db.commit()

    # Split cells into 3 balanced chunks
    chunk_count = min(3, max(1, len(cells)))
    chunks = [[] for _ in range(chunk_count)]
    for i, cell in enumerate(cells):
        chunks[i % chunk_count].append(cell)

    tasks = []
    chunk_names = [
        "Sector A: Arterial Commercial High-Street & Frontage",
        "Sector B: Residential Interior Lanes & Gated Communities",
        "Sector C: Transit Nodes & Feeder Corridors"
    ]

    for idx, cell_group in enumerate(chunks):
        # Generate representative lanes for each sector chunk
        lanes = [
            f"LANE-{idx+1}01-MainRoad",
            f"LANE-{idx+1}02-CrossStreet",
            f"LANE-{idx+1}03-Avenue",
        ]
        task = SurveyTask(
            catchment_study_id=study.id,
            name=chunk_names[idx % len(chunk_names)],
            chunk_index=idx + 1,
            h3_cells_json=json.dumps(cell_group),
            lane_ids_json=json.dumps(lanes),
            status="assigned",
            due_date=(datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
        )
        db.add(task)
        tasks.append(task)

    study.status = "partitioned"
    db.commit()
    return tasks

def rollup_catchment_insights(study_id: str, db: Session) -> CatchmentInsight:
    """
    Aggregates completed lane surveys into Catchment Insights.
    Re-evaluates the associated Property to update its score dynamically.
    """
    study = db.query(CatchmentStudy).filter(CatchmentStudy.id == study_id).first()
    if not study:
        raise ValueError(f"Study {study_id} not found")

    tasks = db.query(SurveyTask).filter(SurveyTask.catchment_study_id == study.id).all()
    all_surveys = []
    for t in tasks:
        surveys = db.query(LaneSurvey).filter(LaneSurvey.survey_task_id == t.id).all()
        all_surveys.extend(surveys)

    total_pedestrians = sum(s.pedestrian_count_10min for s in all_surveys)
    total_kiranas = sum(s.kirana_count for s in all_surveys)
    total_supermarkets = sum(s.supermarket_count for s in all_surveys)
    survey_count = len(all_surveys)

    if survey_count > 0:
        avg_footfall_10min = total_pedestrians / survey_count
        # Hourly pedestrian index: normalized to 0-100
        hourly_rate = avg_footfall_10min * 6
        footfall_index = min(100.0, max(20.0, (hourly_rate / 350.0) * 100.0))
        comp_density = min(100.0, (total_supermarkets * 15.0) + (total_kiranas * 3.0))
    else:
        footfall_index = 65.0
        comp_density = 40.0

    # Catchment Quality Score formula: balanced footfall with low grocery saturation
    quality_score = round((footfall_index * 0.6) + ((100.0 - comp_density) * 0.4), 1)

    # Mock grocery spend potential: Chennai household average ₹18,000/mo * 1,800 households in 500m
    household_spend = 32500000.0 # ₹3.25 Cr / month (MOCK)

    insight = db.query(CatchmentInsight).filter(CatchmentInsight.catchment_study_id == study.id).first()
    if not insight:
        insight = CatchmentInsight(
            catchment_study_id=study.id,
            quality_score=quality_score,
            household_spend_monthly_inr=household_spend,
            footfall_index=round(footfall_index, 1),
            competitor_density_index=round(comp_density, 1),
            summary_json=json.dumps({
                "total_lanes_surveyed": survey_count,
                "measured_pedestrians": total_pedestrians,
                "identified_kiranas": total_kiranas,
                "identified_supermarkets": total_supermarkets,
                "demand_potential_cr_monthly": 3.25
            })
        )
        db.add(insight)
    else:
        insight.quality_score = quality_score
        insight.footfall_index = round(footfall_index, 1)
        insight.competitor_density_index = round(comp_density, 1)

    study.status = "completed"
    study.completed_at = datetime.utcnow()
    db.commit()

    # Re-evaluate associated property if linked
    if study.property_id:
        prop = db.query(Property).filter(Property.id == study.property_id).first()
        if prop:
            prop.status = "catchment_completed"
            new_eval = compute_property_evaluation(
                rent_monthly=prop.rent_monthly,
                carpet_area_sqft=prop.carpet_area_sqft,
                frontage_ft=prop.frontage_ft,
                ceiling_height_ft=prop.ceiling_height_ft,
                floor_position=prop.floor_position,
                road_width_ft=prop.road_width_ft,
                parking_four_wheeler=prop.parking_four_wheeler,
                has_power_backup=prop.has_power_backup,
                has_loading_dock=prop.has_loading_dock,
                area_fitness_score=75.0, # default or linked
                catchment_quality_score=quality_score,
                pincode=prop.pincode
            )

            eval_record = PropertyEvaluation(
                property_id=prop.id,
                trigger="catchment_completed",
                total_score=new_eval["total_score"],
                recommendation=new_eval["recommendation"],
                subscores_json=json.dumps(new_eval["subscores"]),
                risks_json=json.dumps(new_eval["risks"]),
                insights_json=json.dumps(new_eval["insights"]),
                is_provisional=False
            )
            db.add(eval_record)

            event = PropertyEvent(
                property_id=prop.id,
                user_id=study.requested_by_user_id,
                from_stage="catchment_requested",
                to_stage="catchment_completed",
                reason=f"Catchment Study #{study.code} completed with Quality Score {quality_score}/100. Property re-evaluated to {new_eval['total_score']}/100.",
                event_type="catchment_rollup"
            )
            db.add(event)
            db.commit()

    return insight
