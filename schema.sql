-- Savo SiteScout Schema (Savomart Expansion Intelligence Platform)
-- PostgreSQL / PostGIS and SQLite compatible standard DDL

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL, -- bd_manager, bd_executive, survey_manager, survey_executive
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id VARCHAR(36) PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- osm, ogd_pincodes, savomart_stores, mock_benchmarks
    version VARCHAR(20) NOT NULL,
    records_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success',
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pincodes (
    pincode VARCHAR(10) PRIMARY KEY,
    locality_name VARCHAR(100) NOT NULL,
    district VARCHAR(50) DEFAULT 'Chennai',
    state VARCHAR(50) DEFAULT 'Tamil Nadu',
    centroid_lat REAL NOT NULL,
    centroid_lon REAL NOT NULL,
    polygon_geojson TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index VARCHAR(20) PRIMARY KEY,
    resolution INTEGER NOT NULL DEFAULT 9,
    centroid_lat REAL NOT NULL,
    centroid_lon REAL NOT NULL,
    pincode VARCHAR(10),
    residential_count INTEGER DEFAULT 0,
    commercial_count INTEGER DEFAULT 0,
    transit_count INTEGER DEFAULT 0,
    competitor_count INTEGER DEFAULT 0,
    score_percentiles_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS osm_features (
    id VARCHAR(50) PRIMARY KEY,
    osm_id VARCHAR(50),
    feature_type VARCHAR(50) NOT NULL, -- supermarket, kirana, metro_station, bus_stop, bank, school, hospital
    name VARCHAR(150),
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    h3_index VARCHAR(20),
    tags_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS osm_lanes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150),
    highway_type VARCHAR(50),
    width_meters REAL,
    length_meters REAL,
    h3_index VARCHAR(20),
    midpoint_lat REAL NOT NULL,
    midpoint_lon REAL NOT NULL,
    geometry_geojson TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savomart_stores (
    id VARCHAR(50) PRIMARY KEY,
    store_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    is_operational BOOLEAN DEFAULT 1,
    opened_at VARCHAR(30),
    source VARCHAR(30) DEFAULT 'live_api', -- live_api or sample_fallback
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS area_analyses (
    id VARCHAR(36) PRIMARY KEY,
    requested_by_user_id VARCHAR(36) REFERENCES users(id),
    title VARCHAR(150) NOT NULL,
    selection_type VARCHAR(30) NOT NULL, -- pincode, locality, h3_cells
    selection_payload_json TEXT NOT NULL,
    h3_indices_json TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'queued', -- queued, running, done, failed
    current_stage VARCHAR(50),
    progress_pct INTEGER DEFAULT 0,
    error_message TEXT,
    fitness_score REAL,
    subscores_json TEXT,
    raw_metrics_json TEXT,
    hotspots_json TEXT,
    narrative TEXT,
    is_llm_generated BOOLEAN DEFAULT 0,
    scoring_version VARCHAR(20) DEFAULT 'v1.0.0',
    data_snapshot_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scouting_assignments (
    id VARCHAR(36) PRIMARY KEY,
    created_by_user_id VARCHAR(36) REFERENCES users(id),
    assigned_to_user_id VARCHAR(36) REFERENCES users(id),
    area_analysis_id VARCHAR(36) REFERENCES area_analyses(id),
    target_h3_index VARCHAR(20),
    target_name VARCHAR(150) NOT NULL,
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    h3_index VARCHAR(20),
    scouted_by_user_id VARCHAR(36) REFERENCES users(id),
    assignment_id VARCHAR(36) REFERENCES scouting_assignments(id),
    status VARCHAR(30) DEFAULT 'sighted', -- sighted, bd_review, catchment_requested, catchment_completed, negotiation, approved, rejected
    rent_monthly REAL,
    deposit_amount REAL,
    lock_in_months INTEGER DEFAULT 36,
    carpet_area_sqft REAL NOT NULL,
    frontage_ft REAL NOT NULL,
    ceiling_height_ft REAL DEFAULT 11.0,
    floor_position VARCHAR(30) DEFAULT 'ground_floor',
    road_width_ft REAL DEFAULT 30.0,
    parking_two_wheeler INTEGER DEFAULT 10,
    parking_four_wheeler INTEGER DEFAULT 3,
    has_power_backup BOOLEAN DEFAULT 1,
    has_loading_dock BOOLEAN DEFAULT 1,
    photos_json TEXT,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    is_incomplete BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_evaluations (
    id VARCHAR(36) PRIMARY KEY,
    property_id VARCHAR(36) REFERENCES properties(id),
    trigger VARCHAR(30) NOT NULL, -- initial_onboarding, catchment_completed, manual_recalc
    total_score REAL NOT NULL,
    recommendation VARCHAR(30) NOT NULL, -- strong_go, conditional_go, high_risk, reject
    subscores_json TEXT NOT NULL,
    risks_json TEXT NOT NULL,
    insights_json TEXT NOT NULL,
    is_provisional BOOLEAN DEFAULT 1,
    benchmark_version VARCHAR(20) DEFAULT 'chennai_retail_v1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_events (
    id VARCHAR(36) PRIMARY KEY,
    property_id VARCHAR(36) REFERENCES properties(id),
    user_id VARCHAR(36) REFERENCES users(id),
    from_stage VARCHAR(30),
    to_stage VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    event_type VARCHAR(30) DEFAULT 'stage_transition',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catchment_studies (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    property_id VARCHAR(36) REFERENCES properties(id),
    area_analysis_id VARCHAR(36) REFERENCES area_analyses(id),
    requested_by_user_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'requested', -- requested, partitioned, in_progress, completed
    radius_meters INTEGER DEFAULT 500,
    h3_cells_json TEXT,
    reused_from_study_id VARCHAR(36) REFERENCES catchment_studies(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_tasks (
    id VARCHAR(36) PRIMARY KEY,
    catchment_study_id VARCHAR(36) REFERENCES catchment_studies(id),
    assigned_to_user_id VARCHAR(36) REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    chunk_index INTEGER NOT NULL,
    h3_cells_json TEXT NOT NULL,
    lane_ids_json TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'assigned', -- assigned, in_progress, completed
    due_date VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lane_surveys (
    id VARCHAR(36) PRIMARY KEY,
    survey_task_id VARCHAR(36) REFERENCES survey_tasks(id),
    lane_id VARCHAR(50) NOT NULL,
    surveyor_user_id VARCHAR(36) REFERENCES users(id),
    client_uuid VARCHAR(50) UNIQUE NOT NULL,
    lane_name VARCHAR(150) NOT NULL,
    measured_width_ft REAL NOT NULL,
    pedestrian_count_10min INTEGER NOT NULL,
    measurement_time_slot VARCHAR(50) NOT NULL, -- morning_peak, afternoon_regular, evening_peak
    kirana_count INTEGER DEFAULT 0,
    supermarket_count INTEGER DEFAULT 0,
    household_tags_json TEXT,
    obstacle_flags_json TEXT,
    offline_created_at TIMESTAMP,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catchment_insights (
    id VARCHAR(36) PRIMARY KEY,
    catchment_study_id VARCHAR(36) UNIQUE REFERENCES catchment_studies(id),
    quality_score REAL NOT NULL,
    household_spend_monthly_inr REAL,
    footfall_index REAL NOT NULL,
    competitor_density_index REAL NOT NULL,
    summary_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
