import React, { useState } from 'react';
import { Property, User, Role } from '../../types';
import { api } from '../../services/api';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Clock, 
  ChevronRight, 
  ShieldAlert, 
  Plus, 
  FileText,
  DollarSign,
  Maximize2
} from 'lucide-react';

interface PropertyPipelineProps {
  properties: Property[];
  currentUser: User;
  onRefresh: () => void;
  onRequestCatchment: (prop: Property) => void;
  onOpenOnboardModal: () => void;
  onSelectPropertyOnMap: (prop: Property) => void;
}

export const PropertyPipeline: React.FC<PropertyPipelineProps> = ({
  properties,
  currentUser,
  onRefresh,
  onRequestCatchment,
  onOpenOnboardModal,
  onSelectPropertyOnMap
}) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<{ prop: Property; toStage: string } | null>(null);
  const [transitionReason, setTransitionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const STAGES = [
    { key: 'sighted', label: '1. Sighted', color: 'border-blue-400 bg-blue-50/40 text-blue-900' },
    { key: 'bd_review', label: '2. BD Review', color: 'border-purple-400 bg-purple-50/40 text-purple-900' },
    { key: 'catchment_requested', label: '3. Catchment Requested', color: 'border-amber-400 bg-amber-50/40 text-amber-900' },
    { key: 'catchment_completed', label: '4. Catchment Done', color: 'border-cyan-400 bg-cyan-50/40 text-cyan-900' },
    { key: 'negotiation', label: '5. Negotiation', color: 'border-pink-400 bg-pink-50/40 text-pink-900' },
    { key: 'approved', label: '6. Approved', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-900' },
    { key: 'rejected', label: 'Dropped / Rejected', color: 'border-rose-400 bg-rose-50/40 text-rose-900' },
  ];

  const handleStageTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionTarget || !transitionReason.trim()) return;

    setIsSubmitting(true);
    try {
      await api.updatePropertyStage(
        transitionTarget.prop.id,
        transitionTarget.toStage,
        transitionReason.trim()
      );
      setTransitionTarget(null);
      setTransitionReason('');
      onRefresh();
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNextStage = (currentStage: string): string | null => {
    const sequence: Record<string, string> = {
      sighted: 'bd_review',
      bd_review: 'negotiation', // or catchment_requested
      catchment_requested: 'catchment_completed',
      catchment_completed: 'negotiation',
      negotiation: 'approved',
    };
    return sequence[currentStage] || null;
  };

  const filteredProperties = statusFilter === 'all'
    ? properties
    : properties.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Top Controls & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter Stage:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="all">All Pipeline Stages ({properties.length})</option>
            {STAGES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenOnboardModal}
          className="px-4 py-2 bg-savo-purple hover:bg-savo-purple-dark text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Property in Field</span>
        </button>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
        {STAGES.filter(s => s.key !== 'rejected').map(stage => {
          const stageProps = properties.filter(p => p.status === stage.key);
          return (
            <div key={stage.key} className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-w-[240px]">
              
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-800">{stage.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 text-[10px] font-black border border-slate-200">
                  {stageProps.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="space-y-3 flex-1">
                {stageProps.map(prop => {
                  const evalData = prop.latest_evaluation;
                  const nextStage = getNextStage(prop.status);

                  return (
                    <div
                      key={prop.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      {/* Card Header & 30-sec Decision Info */}
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{prop.code}</span>
                          {evalData && (
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                              evalData.recommendation === 'strong_go'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : evalData.recommendation === 'conditional_go'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}>
                              {evalData.total_score}/100 • {evalData.recommendation.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </div>

                        <h4
                          onClick={() => setSelectedProperty(prop)}
                          className="font-bold text-xs text-slate-900 mt-1 cursor-pointer hover:text-savo-purple line-clamp-1"
                        >
                          {prop.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prop.address}</p>

                        {/* Rent & Dimensions Pill */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">
                            {prop.rent_monthly ? `₹${(prop.rent_monthly / 100000).toFixed(2)}L/mo` : 'Rent Unset'}
                          </span>
                          <span className="text-slate-500">
                            {prop.carpet_area_sqft} sqft • {prop.frontage_ft}ft front
                          </span>
                        </div>

                        {/* Top Risk Flag */}
                        {evalData && evalData.risks && evalData.risks.length > 0 && (
                          <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200 line-clamp-2">
                            ⚠️ {evalData.risks[0]}
                          </div>
                        )}
                      </div>

                      {/* 1-Tap Action Toolbar for BD Manager */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => onSelectPropertyOnMap(prop)}
                          className="text-[10px] font-bold text-slate-500 hover:text-savo-purple"
                        >
                          Map
                        </button>

                        <div className="flex items-center space-x-1">
                          {/* Request Catchment Study button */}
                          {prop.status === 'bd_review' && (
                            <button
                              onClick={() => onRequestCatchment(prop)}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold shadow-sm"
                              title="Request Catchment Study (M3)"
                            >
                              + Catchment
                            </button>
                          )}

                          {/* Advance Next Stage */}
                          {nextStage && currentUser.role === 'bd_manager' && (
                            <button
                              onClick={() => setTransitionTarget({ prop, toStage: nextStage })}
                              className="px-2 py-0.5 bg-savo-purple hover:bg-savo-purple-dark text-white rounded text-[10px] font-bold shadow-sm"
                            >
                              Advance →
                            </button>
                          )}

                          {/* Reject Option */}
                          {prop.status !== 'approved' && prop.status !== 'rejected' && currentUser.role === 'bd_manager' && (
                            <button
                              onClick={() => setTransitionTarget({ prop, toStage: 'rejected' })}
                              className="px-1.5 py-0.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-bold"
                              title="Reject property"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mandatory Stage Transition Rationale Modal */}
      {transitionTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">
              Confirm Pipeline Transition
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Moving <strong>{transitionTarget.prop.name}</strong> from <code>{transitionTarget.prop.status}</code> to <code className="text-savo-purple font-bold">{transitionTarget.toStage}</code>.
            </p>

            <form onSubmit={handleStageTransitionSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">
                  Mandatory Transition Rationale (Who did what and why) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="e.g. Commercial terms renegotiated down to ₹75/sqft with 36 months lock-in. Frontage verified on-site."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-savo-purple focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransitionTarget(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || transitionReason.trim().length < 3}
                  className="px-4 py-1.5 bg-savo-purple text-white font-bold rounded-lg hover:bg-savo-purple-dark disabled:opacity-50"
                >
                  {isSubmitting ? 'Logging...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Full Dossier Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 font-bold">{selectedProperty.code}</span>
                <h3 className="text-lg font-black text-slate-900">{selectedProperty.name}</h3>
                <p className="text-xs text-slate-500">{selectedProperty.address}</p>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Score & Key Metrics */}
            {selectedProperty.latest_evaluation && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-bold">Property Evaluation Score</div>
                  <div className="text-3xl font-black text-slate-900">
                    {selectedProperty.latest_evaluation.total_score}
                    <span className="text-sm font-normal text-slate-400">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-savo-purple border border-purple-300">
                    {selectedProperty.latest_evaluation.recommendation.replace('_', ' ')}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {selectedProperty.latest_evaluation.is_provisional ? 'Provisional (No Catchment Study)' : 'Catchment Validated'}
                  </div>
                </div>
              </div>
            )}

            {/* Audit History Log */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Pipeline Audit Trail (Who did what and why):
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(selectedProperty.events || []).map((ev, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span>{new Date(ev.created_at).toLocaleString()}</span>
                      <span className="font-bold text-slate-700 uppercase">
                        {ev.from_stage ? `${ev.from_stage} → ${ev.to_stage}` : ev.to_stage}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium">{ev.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedProperty(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
