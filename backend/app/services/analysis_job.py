import json
import logging
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models.area import AreaAnalysis
from backend.app.services.osm_client import resolve_h3_cells, aggregate_cell_features
from backend.app.services.savo_stores import find_nearest_savomart_store
from backend.app.services.scoring.area_score import compute_area_fitness_score
from backend.app.services.llm.generator import generate_area_narrative

logger = logging.getLogger(__name__)

STAGES = [
    "resolving_spatial_cells",
    "fetching_pois_and_demographics",
    "evaluating_savomart_proximity",
    "computing_grounded_scores",
    "generating_grounded_narrative",
    "done"
]

def run_area_analysis_job(analysis_id: str):
    """
    Executes the multi-stage Area Intelligence analysis.
    Updates the database row at every stage for live polling by the frontend.
    """
    db: Session = SessionLocal()
    analysis = db.query(AreaAnalysis).filter(AreaAnalysis.id == analysis_id).first()
    if not analysis:
        db.close()
        return

    try:
        # Stage 1: Resolving spatial cells
        analysis.status = "running"
        analysis.current_stage = "resolving_spatial_cells"
        analysis.progress_pct = 15
        db.commit()

        payload = json.loads(analysis.selection_payload_json)
        h3_cells = resolve_h3_cells(analysis.selection_type, payload, db)
        if not h3_cells:
            raise ValueError("No spatial H3 cells could be resolved for this selection.")
        
        analysis.h3_indices_json = json.dumps(h3_cells)
        db.commit()

        # Stage 2: Fetching POIs & demographics
        analysis.current_stage = "fetching_pois_and_demographics"
        analysis.progress_pct = 35
        db.commit()

        aggregated_res = 0
        aggregated_com = 0
        aggregated_trans = 0
        aggregated_comp = 0
        cell_metrics_list = []

        # Find centroid of cells
        total_lat = 0.0
        total_lon = 0.0

        for cell in h3_cells:
            c_data = aggregate_cell_features(cell, db)
            aggregated_res += c_data["residential"]
            aggregated_com += c_data["commercial"]
            aggregated_trans += c_data["transit"]
            aggregated_comp += c_data["competitors"]
            total_lat += c_data["centroid_lat"]
            total_lon += c_data["centroid_lon"]
            cell_metrics_list.append(c_data)

        centroid_lat = total_lat / len(h3_cells)
        centroid_lon = total_lon / len(h3_cells)

        # Stage 3: Evaluating Savomart proximity & cannibalisation
        analysis.current_stage = "evaluating_savomart_proximity"
        analysis.progress_pct = 55
        db.commit()

        nearest_km, nearest_store_info = find_nearest_savomart_store(centroid_lat, centroid_lon, db)

        # Stage 4: Computing Grounded Scores & Hotspots
        analysis.current_stage = "computing_grounded_scores"
        analysis.progress_pct = 75
        db.commit()

        # Normalize metrics per cell count to compare fairly
        cell_count = max(1, len(h3_cells))
        avg_res = int(aggregated_res / cell_count)
        avg_com = int(aggregated_com / cell_count)
        avg_trans = int(aggregated_trans / cell_count)
        avg_comp = int(aggregated_comp / cell_count)

        scoring_result = compute_area_fitness_score(
            residential_count=avg_res,
            commercial_count=avg_com,
            transit_count=avg_trans,
            competitor_count=avg_comp,
            nearest_savomart_km=nearest_km
        )

        # Compute per-cell scores to identify top hotspots
        cell_scores = []
        for c in cell_metrics_list:
            c_score_res = compute_area_fitness_score(
                residential_count=c["residential"],
                commercial_count=c["commercial"],
                transit_count=c["transit"],
                competitor_count=c["competitors"],
                nearest_savomart_km=nearest_km
            )
            cell_scores.append({
                "h3_index": c["h3_index"],
                "lat": c["centroid_lat"],
                "lon": c["centroid_lon"],
                "fitness_score": c_score_res["fitness_score"],
                "residential": c["residential"],
                "commercial": c["commercial"],
                "competitors": c["competitors"],
            })

        # Sort to find top 3 hotspots
        cell_scores.sort(key=lambda x: x["fitness_score"], reverse=True)
        top_cells = cell_scores[:3]
        hotspots = []
        for i, tc in enumerate(top_cells, 1):
            hotspots.append({
                "h3_index": tc["h3_index"],
                "name": f"Hotspot Pocket #{i} (Cell {tc['h3_index'][-6:]})",
                "lat": tc["lat"],
                "lon": tc["lon"],
                "score": tc["fitness_score"],
                "rationale": f"High commercial vitality ({tc['commercial']} POIs) with strong residential backing ({tc['residential']} homes) and manageable competitor density ({tc['competitors']} stores).",
                "key_signals": [
                    f"Commercial Activity: {tc['commercial']} hubs",
                    f"Residential: {tc['residential']} buildings",
                    f"Competitor gap index: {tc['fitness_score']:.0f}/100"
                ]
            })

        # Stage 5: Generating Grounded Narrative
        analysis.current_stage = "generating_grounded_narrative"
        analysis.progress_pct = 90
        db.commit()

        metrics_for_narrative = {
            "title": analysis.title,
            "fitness_score": scoring_result["fitness_score"],
            "subscores": scoring_result["subscores"],
            "raw_counts": {
                "residential_units": aggregated_res,
                "commercial_points": aggregated_com,
                "transit_points": aggregated_trans,
                "competitors": aggregated_comp,
                "nearest_savomart_km": nearest_km or 9.9
            },
            "is_cannibalisation_risk": scoring_result["is_cannibalisation_risk"]
        }

        # Run async narrative generator safely
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            narrative, is_llm = loop.run_until_complete(
                generate_area_narrative(analysis.title, metrics_for_narrative)
            )
            loop.close()
        except Exception as e:
            logger.warning(f"Narrative generation exception: {e}")
            from backend.app.services.llm.validator import generate_grounded_template_narrative
            narrative = generate_grounded_template_narrative(analysis.title, metrics_for_narrative)
            is_llm = False

        # Stage 6: Complete & persist report
        analysis.fitness_score = scoring_result["fitness_score"]
        analysis.subscores_json = json.dumps(scoring_result["subscores"])
        analysis.raw_metrics_json = json.dumps({
            "total_residential": aggregated_res,
            "total_commercial": aggregated_com,
            "total_transit": aggregated_trans,
            "total_competitors": aggregated_comp,
            "nearest_savomart": nearest_store_info,
            "cell_count": len(h3_cells),
            "weights_used": scoring_result["weights_used"]
        })
        analysis.hotspots_json = json.dumps(hotspots)
        analysis.narrative = narrative
        analysis.is_llm_generated = is_llm
        analysis.data_snapshot_json = json.dumps({
            "scoring_version": "v1.0.0",
            "ingested_osm_timestamp": "2026-09-28T09:00:00Z",
            "savomart_store_source": nearest_store_info.get("source") if nearest_store_info else "sample_fallback",
            "benchmarks_used": "chennai_urban_v1_p90"
        })
        analysis.status = "done"
        analysis.current_stage = "done"
        analysis.progress_pct = 100
        analysis.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        logger.error(f"Analysis job {analysis_id} failed at stage {analysis.current_stage}: {e}")
        analysis.status = "failed"
        analysis.error_message = str(e)
        db.commit()
    finally:
        db.close()
