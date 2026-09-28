import React, { useState } from 'react';
import { CatchmentStudy, SurveyTask, User } from '../../types';
import { api } from '../../services/api';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Share2, 
  DollarSign, 
  TrendingUp, 
  MapPin, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface CatchmentManagerProps {
  studies: CatchmentStudy[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
  onSelectMapLocation: (lat: number, lon: number) => void;
}

export const CatchmentManager: React.FC<CatchmentManagerProps> = ({
  studies,
  users,
  currentUser,
  onRefresh,
  onSelectMapLocation
}) => {
  const [selectedStudy, setSelectedStudy] = useState<CatchmentStudy | null>(
    studies.length > 0 ? studies[0] : null
  );
  const [assigningTask, setAssigningTask] = useState<SurveyTask | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('user-survey-executive');

  const surveyExecutives = users.filter(u => u.role === 'survey_executive');

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTask) return;

    try {
      await api.assignSurveyTask(assigningTask.id, selectedExecutiveId);
      setAssigningTask(null);
      onRefresh();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleTriggerRollup = async (studyId: string) => {
    try {
      await api.getCatchmentStudy(studyId);
      onRefresh();
    } catch (err: any) {
      alert(`Rollup failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Layers className="w-5 h-5 text-savo-purple" />
            <span>Catchment Study Operations & Smart Partitioning</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            500m walking catchments automatically partitioned into balanced, non-overlapping lane sectors.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-600">Total Studies: {studies.length}</span>
        </div>
      </div>

      {/* Studies Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {studies.map(study => (
          <div
            key={study.id}
            onClick={() => setSelectedStudy(study)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedStudy?.id === study.id
                ? 'bg-purple-50/80 border-savo-purple shadow-md'
                : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400">{study.code}</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                study.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {study.status.toUpperCase()}
              </span>
            </div>

            <h4 className="font-bold text-xs text-slate-900 mt-2 line-clamp-1">
              {study.property_name || 'Area Catchment Study'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{study.radius_meters}m Walking Radius</p>

            {/* Progress */}
            <div className="mt-3 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                <span>Progress</span>
                <span>{study.progress_pct}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-savo-purple h-full rounded-full transition-all"
                  style={{ width: `${study.progress_pct}%` }}
                />
              </div>
            </div>

            {/* Reuse Tag */}
            {study.reused_from_study_id && (
              <div className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-bold">
                ♻️ Reused from prior study (70% coverage rule)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Study Deep-Dive */}
      {selectedStudy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Partitioned Tasks List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Partitioned Work Units ({selectedStudy.tasks?.length || 0} Chunks)
                </h3>
                <p className="text-xs text-slate-500">
                  Non-overlapping street corridors assigned to field survey executives
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(selectedStudy.tasks || []).map(task => (
                <div key={task.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-savo-purple">Chunk #{task.chunk_index}:</span>
                      <h4 className="text-xs font-bold text-slate-900">{task.name}</h4>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                      <span>Lanes assigned: <strong>{task.lane_ids?.length || 0}</strong></span>
                      <span>Assigned to: <strong>{task.assigned_to_name}</strong></span>
                      <span>Due: <strong>{task.due_date || 'Standard'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      task.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {task.surveys_count} / {task.lane_ids?.length || 3} lanes surveyed
                    </span>

                    {currentUser.role === 'survey_manager' && (
                      <button
                        onClick={() => setAssigningTask(task)}
                        className="px-3 py-1 bg-savo-purple hover:bg-savo-purple-dark text-white rounded-lg text-xs font-bold transition"
                      >
                        Assign Exec
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rollup Insights Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Catchment Insights Rollup
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-savo-yellow/40 text-amber-900 font-bold border border-savo-yellow">
                  Ground Truth
                </span>
              </div>

              {selectedStudy.insight ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                    <div className="text-xs font-bold text-slate-500">Catchment Quality Index</div>
                    <div className="text-4xl font-black text-savo-purple mt-1">
                      {selectedStudy.insight.quality_score}
                      <span className="text-sm font-normal text-slate-400">/100</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Pedestrian Footfall Index:</span>
                      <strong className="text-slate-800">{selectedStudy.insight.footfall_index}/100</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Competitor Saturation:</span>
                      <strong className="text-slate-800">{selectedStudy.insight.competitor_density_index}/100</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Monthly Grocery Demand (MOCK):</span>
                      <strong className="text-emerald-700 font-bold">₹3.25 Cr / month</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    ✓ Ground survey data automatically rolled up and linked into parent property evaluation.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
                  <p>Awaiting survey executive lane completion to synthesize rollup insights.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment Modal */}
      {assigningTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">
              Assign Survey Sector Chunk
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Delegating <strong>{assigningTask.name}</strong>
            </p>

            <form onSubmit={handleAssignTask} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Select Field Survey Executive *</label>
                <select
                  value={selectedExecutiveId}
                  onChange={e => setSelectedExecutiveId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  {surveyExecutives.map(exec => (
                    <option key={exec.id} value={exec.id}>{exec.name} ({exec.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningTask(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-savo-purple text-white font-bold rounded-lg hover:bg-savo-purple-dark"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
