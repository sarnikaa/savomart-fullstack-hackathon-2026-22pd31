import {
  User,
  SavomartStore,
  ChennaiLocality,
  AreaAnalysis,
  ScoutingAssignment,
  Property,
  CatchmentStudy,
  SurveyTask,
  LaneSurvey,
  OpportunityPocket
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Current active user ID holder (set by role switcher)
let activeUserId = 'user-bd-manager';

export function setActiveUserHeader(userId: string) {
  activeUserId = userId;
}

export function getActiveUserId(): string {
  return activeUserId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': activeUserId,
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Users & Personas
  getUsers: () => request<User[]>('/users'),

  // Savomart Stores
  getStores: () => request<{ source: string; is_sample_fallback: boolean; stores_count: number; stores: SavomartStore[] }>('/stores'),
  syncStores: () => request<{ status: string; source: string; is_sample_fallback: boolean; synced_count: number }>('/stores/sync', { method: 'POST' }),

  // M1: Area Intelligence
  getLocalities: () => request<ChennaiLocality[]>('/areas/pincodes'),
  analyzeArea: (payload: { selection_type: string; pincode?: string; locality_name?: string; h3_cells?: string[]; title?: string }) =>
    request<{ analysis_id: string; status: string; title: string; message: string }>('/areas/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAnalysis: (id: string) => request<AreaAnalysis>(`/areas/analyses/${id}`),
  retryAnalysis: (id: string) => request<{ status: string; message: string }>(`/areas/analyses/${id}/retry`, { method: 'POST' }),
  getSavedAnalyses: () => request<AreaAnalysis[]>('/areas/analyses'),
  compareAnalyses: (ids: string[]) => request<{ comparison: AreaAnalysis[] }>(`/areas/compare?ids=${ids.join(',')}`),
  createScoutingAssignment: (payload: { area_analysis_id?: string; assigned_to_user_id: string; target_h3_index?: string; target_name: string; notes?: string; priority?: string }) =>
    request<ScoutingAssignment>('/areas/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getScoutingAssignments: (assignedTo?: string) =>
    request<ScoutingAssignment[]>(`/areas/assignments${assignedTo ? `?assigned_to=${assignedTo}` : ''}`),

  // M2: Property Scouting & Pipeline
  onboardProperty: (payload: Partial<Property> & { photos?: string[] }) =>
    request<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProperties: (statusFilter?: string, pincode?: string) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (pincode) params.append('pincode', pincode);
    const qs = params.toString();
    return request<Property[]>(`/properties${qs ? `?${qs}` : ''}`);
  },
  getProperty: (id: string) => request<Property>(`/properties/${id}`),
  updatePropertyStage: (id: string, to_stage: string, reason: string) =>
    request<Property>(`/properties/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ to_stage, reason }),
    }),

  // M3: Catchment Study & Field Operations
  checkCatchmentReuse: (lat: number, lon: number) =>
    request<{ can_reuse: boolean; reusable_study_id?: string; study_code?: string; age_days?: number; distance_meters?: number; covered_cells_pct: number; message: string }>(
      `/surveys/catchments/check-reuse?lat=${lat}&lon=${lon}`
    ),
  requestCatchmentStudy: (payload: { property_id?: string; area_analysis_id?: string; radius_meters?: number; force_fresh?: boolean }) =>
    request<CatchmentStudy>('/surveys/catchments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCatchmentStudy: (id: string) => request<CatchmentStudy>(`/surveys/catchments/${id}`),
  getCatchmentStudies: () => request<CatchmentStudy[]>('/surveys/catchments'),
  getSurveyTasks: (assignedTo?: string) =>
    request<SurveyTask[]>(`/surveys/tasks${assignedTo ? `?assigned_to=${assignedTo}` : ''}`),
  assignSurveyTask: (taskId: string, userId: string, dueDate?: string) =>
    request<{ message: string; task_id: string }>(`/surveys/tasks/${taskId}/assign?assigned_to_user_id=${userId}${dueDate ? `&due_date=${dueDate}` : ''}`, {
      method: 'POST',
    }),
  syncLaneSurveys: (surveys: LaneSurvey[]) =>
    request<{ status: string; synced_count: number; synced_ids: string[] }>('/surveys/sync', {
      method: 'POST',
      body: JSON.stringify({ surveys }),
    }),

  // Bonus: Opportunity Scanner & Conversational Analyst
  getCityOpportunities: () => request<{ scan_timestamp: string; total_zones_scanned: number; top_opportunities: OpportunityPocket[] }>('/opportunity/city-scan'),
  askAnalyst: (query: string) =>
    request<{ query: string; response: string; is_grounded: boolean; citations: string[] }>('/analyst/ask', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
};
