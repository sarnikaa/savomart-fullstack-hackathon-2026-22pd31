export type Role = 'bd_manager' | 'bd_executive' | 'survey_manager' | 'survey_executive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar_url?: string;
}

export interface SavomartStore {
  id: string;
  store_code: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  is_operational: boolean;
  opened_at?: string;
  source: 'live_api' | 'sample_fallback';
}

export interface ChennaiLocality {
  pincode: string;
  locality_name: string;
  lat: number;
  lon: number;
  district?: string;
}

export interface Hotspot {
  h3_index: string;
  name: string;
  lat: number;
  lon: number;
  score: number;
  rationale: string;
  key_signals: string[];
}

export interface AreaAnalysis {
  id: string;
  title: string;
  selection_type: 'pincode' | 'locality' | 'h3_cells';
  status: 'queued' | 'running' | 'done' | 'failed';
  current_stage?: string;
  progress_pct: number;
  error_message?: string;
  fitness_score?: number;
  subscores?: {
    residential_density: number;
    commercial_vitality: number;
    competitive_gap: number;
    transit_accessibility: number;
    cannibalisation_safety: number;
  };
  raw_metrics?: {
    total_residential: number;
    total_commercial: number;
    total_transit: number;
    total_competitors: number;
    nearest_savomart?: {
      store_code: string;
      name: string;
      distance_km: number;
      source: string;
    };
    cell_count: number;
    weights_used?: Record<string, number>;
  };
  hotspots?: Hotspot[];
  h3_cells?: string[];
  narrative?: string;
  is_llm_generated?: boolean;
  scoring_version?: string;
  data_snapshot?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface ScoutingAssignment {
  id: string;
  created_by_user_id?: string;
  assigned_to_user_id?: string;
  area_analysis_id?: string;
  target_h3_index?: string;
  target_name: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface PropertyEvaluation {
  id: string;
  property_id: string;
  trigger: string;
  total_score: number;
  recommendation: 'strong_go' | 'conditional_go' | 'high_risk' | 'reject';
  subscores: {
    commercial_viability: number;
    physical_suitability: number;
    location_accessibility: number;
    catchment_score?: number | null;
  };
  risks: string[];
  insights: string[];
  is_provisional: boolean;
  benchmark_version: string;
  created_at: string;
}

export interface PropertyEvent {
  id: string;
  property_id: string;
  user_id?: string;
  from_stage?: string;
  to_stage: string;
  reason: string;
  event_type: string;
  created_at: string;
}

export interface Property {
  id: string;
  code: string;
  name: string;
  address: string;
  pincode: string;
  lat: number;
  lon: number;
  h3_index?: string;
  scouted_by_user_id?: string;
  assignment_id?: string;
  status: 'sighted' | 'bd_review' | 'catchment_requested' | 'catchment_completed' | 'negotiation' | 'approved' | 'rejected';
  rent_monthly?: number | null;
  deposit_amount?: number | null;
  lock_in_months: number;
  carpet_area_sqft: number;
  frontage_ft: number;
  ceiling_height_ft: number;
  floor_position: string;
  road_width_ft: number;
  parking_two_wheeler: number;
  parking_four_wheeler: number;
  has_power_backup: boolean;
  has_loading_dock: boolean;
  photos: string[];
  contact_name?: string;
  contact_phone?: string;
  is_incomplete: boolean;
  created_at: string;
  updated_at: string;
  latest_evaluation?: PropertyEvaluation;
  events?: PropertyEvent[];
}

export interface SurveyTask {
  id: string;
  catchment_study_id: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  name: string;
  chunk_index: number;
  h3_cells: string[];
  lane_ids: string[];
  status: 'assigned' | 'in_progress' | 'completed';
  due_date?: string;
  surveys_count: number;
  created_at: string;
}

export interface LaneSurvey {
  id?: string;
  client_uuid: string;
  survey_task_id: string;
  lane_id: string;
  lane_name: string;
  measured_width_ft: number;
  pedestrian_count_10min: number;
  measurement_time_slot: 'morning_peak' | 'afternoon_regular' | 'evening_peak';
  kirana_count: number;
  supermarket_count: number;
  household_tags: string[];
  obstacle_flags: string[];
  synced?: boolean;
  offline_created_at?: string;
}

export interface CatchmentInsight {
  id: string;
  catchment_study_id: string;
  quality_score: number;
  household_spend_monthly_inr?: number; // MOCK
  footfall_index: number;
  competitor_density_index: number;
  summary?: Record<string, any>;
  created_at: string;
}

export interface CatchmentStudy {
  id: string;
  code: string;
  property_id?: string;
  property_name?: string;
  area_analysis_id?: string;
  requested_by_user_id?: string;
  status: 'requested' | 'partitioned' | 'in_progress' | 'completed';
  radius_meters: number;
  h3_cells: string[];
  reused_from_study_id?: string;
  tasks?: SurveyTask[];
  insight?: CatchmentInsight;
  progress_pct: number;
  created_at: string;
  completed_at?: string;
}

export interface OpportunityPocket {
  locality_name: string;
  pincode: string;
  lat: number;
  lon: number;
  h3_index: string;
  opportunity_score: number;
  is_cannibalisation_risk: boolean;
  subscores: Record<string, number>;
  nearest_savomart_km?: number;
  rationale: string;
  recommendation_badge: string;
}
