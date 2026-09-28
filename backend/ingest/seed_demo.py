import json
import uuid
from datetime import datetime, timedelta
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.user import User
from backend.app.models.property import Property, PropertyEvaluation, PropertyEvent
from backend.app.models.area import AreaAnalysis, ScoutingAssignment
from backend.app.models.survey import CatchmentStudy, SurveyTask, LaneSurvey, CatchmentInsight
from backend.app.models.ingestion import IngestionRun
from backend.app.services.scoring.property_score import compute_property_evaluation

# Seed Demo Users for the 4 personas
DEMO_USERS = [
    {
        "id": "user-bd-manager",
        "name": "Karthik Ramanathan",
        "email": "karthik.mgr@savomart.in",
        "role": "bd_manager",
        "phone": "+91 98401 23456",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Karthik"
    },
    {
        "id": "user-bd-executive",
        "name": "Priya Sundaram",
        "email": "priya.exec@savomart.in",
        "role": "bd_executive",
        "phone": "+91 98402 34567",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Priya"
    },
    {
        "id": "user-survey-manager",
        "name": "Dinesh Kumar",
        "email": "dinesh.mgr@savomart.in",
        "role": "survey_manager",
        "phone": "+91 98403 45678",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Dinesh"
    },
    {
        "id": "user-survey-executive",
        "name": "Arun Prasath",
        "email": "arun.exec@savomart.in",
        "role": "survey_executive",
        "phone": "+91 98404 56789",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Arun"
    }
]

def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Users
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.id == u["id"]).first()
            if not existing:
                user_obj = User(**u)
                db.add(user_obj)
        db.commit()

        # 2. Seed Initial Area Analysis for Velachery
        existing_analysis = db.query(AreaAnalysis).filter(AreaAnalysis.title.like("%Velachery%")).first()
        analysis_id = "analysis-velachery-demo"
        if not existing_analysis:
            analysis = AreaAnalysis(
                id=analysis_id,
                requested_by_user_id="user-bd-manager",
                title="Velachery Area Fitness",
                selection_type="pincode",
                selection_payload_json=json.dumps({"pincode": "600042", "locality_name": "Velachery"}),
                h3_indices_json=json.dumps(["89618c48847ffff", "89618c48843ffff", "89618c4884bffff"]),
                status="done",
                current_stage="done",
                progress_pct=100,
                fitness_score=84.5,
                subscores_json=json.dumps({
                    "residential_density": 88.0,
                    "commercial_vitality": 85.0,
                    "competitive_gap": 78.0,
                    "transit_accessibility": 82.0,
                    "cannibalisation_safety": 90.0
                }),
                raw_metrics_json=json.dumps({
                    "total_residential": 240,
                    "total_commercial": 135,
                    "total_transit": 22,
                    "total_competitors": 14,
                    "nearest_savomart": {
                        "store_code": "SAVO-CHN-003",
                        "name": "Savomart Adyar (LB Road)",
                        "distance_km": 4.8,
                        "source": "sample_fallback"
                    },
                    "cell_count": 7,
                    "weights_used": {
                        "residential_density": 0.3,
                        "commercial_vitality": 0.25,
                        "competitive_gap": 0.2,
                        "transit_accessibility": 0.15,
                        "cannibalisation_safety": 0.1
                    }
                }),
                hotspots_json=json.dumps([
                    {
                        "h3_index": "89618c48847ffff",
                        "name": "Velachery 100ft Bypass Road Corridor",
                        "lat": 12.9785,
                        "lon": 80.2205,
                        "score": 88.2,
                        "rationale": "High evening footfall with direct access to residential apartments and Vijaya Nagar junction.",
                        "key_signals": ["Commercial Activity: 42 hubs", "Residential: 78 buildings", "Competitor gap index: 88/100"]
                    },
                    {
                        "h3_index": "89618c48843ffff",
                        "name": "Taramani Link Road Junction",
                        "lat": 12.9710,
                        "lon": 80.2240,
                        "score": 82.4,
                        "rationale": "Strong commuter traffic from IT parks with underserved grocery retail.",
                        "key_signals": ["Commercial Activity: 30 hubs", "Residential: 65 buildings", "Competitor gap index: 82/100"]
                    }
                ]),
                narrative="### Area Fitness Report: Velachery\n\n**Overall Score:** 84.5/100\n\n**Executive Summary:**\nVelachery presents one of Greater Chennai's strongest expansion opportunities for Savomart. With 240 residential clusters and 135 commercial footfall generators, the micro-market exhibits dense daily consumer traffic with zero cannibalisation risk (nearest store in Adyar is 4.8 km away).\n\n**Scouting Recommendation:**\nDirect field teams toward the Velachery 100ft Bypass Road corridor.",
                is_llm_generated=False,
                scoring_version="v1.0.0",
                data_snapshot_json=json.dumps({
                    "scoring_version": "v1.0.0",
                    "ingested_osm_timestamp": "2026-09-28T09:00:00Z",
                    "savomart_store_source": "sample_fallback"
                }),
                completed_at=datetime.utcnow()
            )
            db.add(analysis)
            db.commit()

        # 3. Seed Scouting Assignment
        assign_id = "assign-velachery-01"
        existing_assign = db.query(ScoutingAssignment).filter(ScoutingAssignment.id == assign_id).first()
        if not existing_assign:
            assign = ScoutingAssignment(
                id=assign_id,
                created_by_user_id="user-bd-manager",
                assigned_to_user_id="user-bd-executive",
                area_analysis_id=analysis_id,
                target_h3_index="89618c48847ffff",
                target_name="Velachery 100ft Bypass Road Corridor",
                notes="Scout for ground-floor retail space (2,800 to 4,000 sq ft) with minimum 25 ft frontage and dedicated customer parking.",
                priority="high",
                status="in_progress"
            )
            db.add(assign)
            db.commit()

        # 4. Seed Properties across Pipeline Stages
        demo_props = [
            {
                "id": "prop-velachery-01",
                "code": "PROP-CHN-0001",
                "name": "Bypass Corner Retail Space (Velachery)",
                "address": "77, 100 Feet Bypass Road, Velachery, Chennai 600042",
                "pincode": "600042",
                "lat": 12.9772,
                "lon": 80.2198,
                "h3_index": "89618c48847ffff",
                "scouted_by_user_id": "user-bd-executive",
                "assignment_id": assign_id,
                "status": "catchment_requested",
                "rent_monthly": 240000.0,
                "deposit_amount": 1440000.0,
                "lock_in_months": 36,
                "carpet_area_sqft": 3200.0,
                "frontage_ft": 32.0,
                "ceiling_height_ft": 12.0,
                "floor_position": "ground_floor",
                "road_width_ft": 50.0,
                "parking_two_wheeler": 15,
                "parking_four_wheeler": 5,
                "has_power_backup": True,
                "has_loading_dock": True,
                "photos_json": json.dumps([
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
                    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600"
                ]),
                "contact_name": "R. Sundaram (Landlord)",
                "contact_phone": "+91 94440 11223"
            },
            {
                "id": "prop-annanagar-02",
                "code": "PROP-CHN-0002",
                "name": "2nd Avenue Prime Showroom (Anna Nagar)",
                "address": "14, 2nd Avenue, Anna Nagar West, Chennai 600040",
                "pincode": "600040",
                "lat": 13.0865,
                "lon": 80.2095,
                "h3_index": "89618c48847ffff",
                "scouted_by_user_id": "user-bd-executive",
                "status": "negotiation",
                "rent_monthly": 380000.0,
                "deposit_amount": 2280000.0,
                "lock_in_months": 48,
                "carpet_area_sqft": 2900.0,
                "frontage_ft": 38.0,
                "ceiling_height_ft": 11.5,
                "floor_position": "ground_floor",
                "road_width_ft": 60.0,
                "parking_two_wheeler": 20,
                "parking_four_wheeler": 6,
                "has_power_backup": True,
                "has_loading_dock": True,
                "photos_json": json.dumps([
                    "https://images.unsplash.com/photo-1580793241553-e9f1cce181af?w=600"
                ]),
                "contact_name": "V. Jayaraman",
                "contact_phone": "+91 98410 44556"
            },
            {
                "id": "prop-mylapore-03",
                "code": "PROP-CHN-0003",
                "name": "Luz Church Road Independent Building",
                "address": "52, Luz Church Road, Mylapore, Chennai 600004",
                "pincode": "600004",
                "lat": 13.0340,
                "lon": 80.2665,
                "h3_index": "89618c48847ffff",
                "scouted_by_user_id": "user-bd-executive",
                "status": "sighted",
                "rent_monthly": 280000.0,
                "deposit_amount": 1680000.0,
                "lock_in_months": 36,
                "carpet_area_sqft": 2400.0,
                "frontage_ft": 20.0,
                "ceiling_height_ft": 10.5,
                "floor_position": "ground_floor",
                "road_width_ft": 35.0,
                "parking_two_wheeler": 10,
                "parking_four_wheeler": 2,
                "has_power_backup": True,
                "has_loading_dock": False,
                "photos_json": json.dumps([]),
                "contact_name": "M. Natarajan",
                "contact_phone": "+91 98840 77889"
            }
        ]

        for p_data in demo_props:
            existing_p = db.query(Property).filter(Property.id == p_data["id"]).first()
            if not existing_p:
                prop_obj = Property(**p_data)
                db.add(prop_obj)
                db.commit()

                # Add automated evaluation
                eval_res = compute_property_evaluation(
                    rent_monthly=prop_obj.rent_monthly,
                    carpet_area_sqft=prop_obj.carpet_area_sqft,
                    frontage_ft=prop_obj.frontage_ft,
                    ceiling_height_ft=prop_obj.ceiling_height_ft,
                    floor_position=prop_obj.floor_position,
                    road_width_ft=prop_obj.road_width_ft,
                    parking_four_wheeler=prop_obj.parking_four_wheeler,
                    has_power_backup=prop_obj.has_power_backup,
                    has_loading_dock=prop_obj.has_loading_dock,
                    area_fitness_score=84.5 if "velachery" in prop_obj.name.lower() else 75.0,
                    pincode=prop_obj.pincode
                )

                eval_record = PropertyEvaluation(
                    property_id=prop_obj.id,
                    trigger="initial_onboarding",
                    total_score=eval_res["total_score"],
                    recommendation=eval_res["recommendation"],
                    subscores_json=json.dumps(eval_res["subscores"]),
                    risks_json=json.dumps(eval_res["risks"]),
                    insights_json=json.dumps(eval_res["insights"]),
                    is_provisional=True
                )
                db.add(eval_record)

                event = PropertyEvent(
                    property_id=prop_obj.id,
                    user_id="user-bd-executive",
                    from_stage=None,
                    to_stage=prop_obj.status,
                    reason=f"Seeded property initialized in stage '{prop_obj.status}'",
                    event_type="onboarding"
                )
                db.add(event)
                db.commit()

        # 5. Seed Catchment Study for PROP-CHN-0001
        study_id = "study-velachery-01"
        existing_study = db.query(CatchmentStudy).filter(CatchmentStudy.id == study_id).first()
        if not existing_study:
            study = CatchmentStudy(
                id=study_id,
                code="CATCH-CHN-0001",
                property_id="prop-velachery-01",
                area_analysis_id=analysis_id,
                requested_by_user_id="user-bd-manager",
                status="in_progress",
                radius_meters=500,
                h3_cells_json=json.dumps(["89618c48847ffff", "89618c48843ffff", "89618c4884bffff"])
            )
            db.add(study)
            db.commit()

            # Tasks
            task1 = SurveyTask(
                id="task-velachery-chunk-1",
                catchment_study_id=study.id,
                assigned_to_user_id="user-survey-executive",
                name="Sector A: Arterial Commercial High-Street & Frontage",
                chunk_index=1,
                h3_cells_json=json.dumps(["89618c48847ffff"]),
                lane_ids_json=json.dumps(["LANE-101-BypassMain", "LANE-102-VijayaNagarJunction"]),
                status="completed",
                due_date=(datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
            )
            task2 = SurveyTask(
                id="task-velachery-chunk-2",
                catchment_study_id=study.id,
                assigned_to_user_id="user-survey-executive",
                name="Sector B: Residential Interior Lanes & Gated Communities",
                chunk_index=2,
                h3_cells_json=json.dumps(["89618c48843ffff"]),
                lane_ids_json=json.dumps(["LANE-201-LakeViewRoad", "LANE-202-VGPLayout"]),
                status="assigned",
                due_date=(datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
            )
            db.add(task1)
            db.add(task2)
            db.commit()

            # Seed 1 completed lane survey
            survey_item = LaneSurvey(
                survey_task_id=task1.id,
                lane_id="LANE-101-BypassMain",
                surveyor_user_id="user-survey-executive",
                client_uuid="uuid-survey-seed-01",
                lane_name="Velachery 100ft Bypass Main Road",
                measured_width_ft=52.0,
                pedestrian_count_10min=78,
                measurement_time_slot="evening_peak",
                kirana_count=2,
                supermarket_count=1,
                household_tags_json=json.dumps(["high_density_apartments", "upper_middle_class"]),
                obstacle_flags_json=json.dumps([])
            )
            db.add(survey_item)
            db.commit()

        run = IngestionRun(
            source="seed_demo_orchestrator",
            version="1.0.0",
            records_count=len(DEMO_USERS) + len(demo_props),
            status="success",
            metadata_json=json.dumps({"seeded_personas": 4, "seeded_properties": len(demo_props)})
        )
        db.add(run)
        db.commit()
        print("Demo database seeding complete: 4 personas, demo properties, and catchment tasks created.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
