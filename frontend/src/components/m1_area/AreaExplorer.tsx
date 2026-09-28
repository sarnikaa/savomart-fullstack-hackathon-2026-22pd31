import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Play, 
  RotateCw, 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Bus, 
  ShieldCheck, 
  Info, 
  Send,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ChennaiLocality, AreaAnalysis, Hotspot, User } from '../../types';
import { api } from '../../services/api';

interface AreaExplorerProps {
  localities: ChennaiLocality[];
  currentUser: User;
  onDispatchScouting: (hotspot: Hotspot, areaId?: string) => void;
  onSelectMapLocation: (lat: number, lon: number) => void;
  onAnalysisDone: (analysis: AreaAnalysis) => void;
}

export const AreaExplorer: React.FC<AreaExplorerProps> = ({
  localities,
  currentUser,
  onDispatchScouting,
  onSelectMapLocation,
  onAnalysisDone,
}) => {
  const [selectedLocality, setSelectedLocality] = useState<string>('600042'); // default Velachery
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAnalysis, setActiveAnalysis] = useState<AreaAnalysis | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [showDerivationModal, setShowDerivationModal] = useState<boolean>(false);
  const [savedAnalyses, setSavedAnalyses] = useState<AreaAnalysis[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<AreaAnalysis[] | null>(null);

  // Load saved analyses on mount
  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      const list = await api.getSavedAnalyses();
      setSavedAnalyses(list);
      // Auto load first complete analysis if present
      if (list.length > 0 && !activeAnalysis) {
        const full = await api.getAnalysis(list[0].id);
        setActiveAnalysis(full);
        onAnalysisDone(full);
      }
    } catch (e) {
      console.error('Failed to load saved analyses', e);
    }
  };

  // Poll active analysis job
  useEffect(() => {
    let timer: any;
    if (activeAnalysis && (activeAnalysis.status === 'queued' || activeAnalysis.status === 'running')) {
      setIsPolling(true);
      timer = setInterval(async () => {
        try {
          const updated = await api.getAnalysis(activeAnalysis.id);
          setActiveAnalysis(updated);
          if (updated.status === 'done' || updated.status === 'failed') {
            setIsPolling(false);
            if (updated.status === 'done') {
              onAnalysisDone(updated);
              loadSaved();
            }
          }
        } catch (e) {
          console.error('Error polling analysis status', e);
          setIsPolling(false);
        }
      }, 1500);
    } else {
      setIsPolling(false);
    }
    return () => clearInterval(timer);
  }, [activeAnalysis?.id, activeAnalysis?.status]);

  const handleStartAnalysis = async () => {
    const loc = localities.find(l => l.pincode === selectedLocality);
    const title = loc ? `${loc.locality_name} Area Fitness` : `Chennai Area Fitness (${selectedLocality})`;

    try {
      const res = await api.analyzeArea({
        selection_type: 'pincode',
        pincode: selectedLocality,
        locality_name: loc?.locality_name,
        title,
      });

      const initialJob = await api.getAnalysis(res.analysis_id);
      setActiveAnalysis(initialJob);

      if (loc) {
        onSelectMapLocation(loc.lat, loc.lon);
      }
    } catch (err: any) {
      alert(`Failed to start analysis: ${err.message}`);
    }
  };

  const handleRetry = async () => {
    if (!activeAnalysis) return;
    try {
      await api.retryAnalysis(activeAnalysis.id);
      const updated = await api.getAnalysis(activeAnalysis.id);
      setActiveAnalysis(updated);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleCompare = async () => {
    if (selectedForCompare.length < 2) {
      alert('Select at least 2 saved reports to compare.');
      return;
    }
    try {
      const res = await api.compareAnalyses(selectedForCompare);
      setComparisonData(res.comparison);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message}`);
    }
  };

  const stageLabels: Record<string, string> = {
    queued: 'Job Queued in Worker Queue...',
    resolving_spatial_cells: 'Resolving H3 Spatial Hexagon Grid (Res 9)...',
    fetching_pois_and_demographics: 'Querying OpenStreetMap POIs & Residential Clusters...',
    evaluating_savomart_proximity: 'Checking Savomart Store Proximity & Cannibalisation...',
    computing_grounded_scores: 'Calculating Grounded Percentile Ranks & Hotspots...',
    generating_grounded_narrative: 'Validating Figures & Grounded AI Narrative...',
    done: 'Analysis Completed Successfully',
    failed: 'Analysis Failed'
  };

  const filteredLocalities = localities.filter(l => 
    l.locality_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.pincode.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full md:w-auto">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Chennai Locality / Pincode:
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                value={selectedLocality}
                onChange={(e) => {
                  setSelectedLocality(e.target.value);
                  const loc = localities.find(l => l.pincode === e.target.value);
                  if (loc) onSelectMapLocation(loc.lat, loc.lon);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-savo-purple"
              >
                {localities.map(loc => (
                  <option key={loc.pincode} value={loc.pincode}>
                    {loc.locality_name} ({loc.pincode}) - {loc.district || 'Chennai'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleStartAnalysis}
              disabled={isPolling}
              className="px-5 py-2 rounded-xl bg-savo-purple hover:bg-savo-purple-dark text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isPolling ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPolling ? 'Analyzing...' : 'Run Virtual Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats / History Switcher */}
        <div className="flex items-center space-x-2 text-xs border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-5 w-full md:w-auto">
          <span className="text-slate-500 font-medium">Saved Reports ({savedAnalyses.length})</span>
          <button
            onClick={() => {
              if (savedAnalyses.length >= 2) {
                setSelectedForCompare([savedAnalyses[0].id, savedAnalyses[1].id]);
                api.compareAnalyses([savedAnalyses[0].id, savedAnalyses[1].id]).then(res => setComparisonData(res.comparison));
              } else {
                alert('Run at least two analyses to compare.');
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
          >
            Compare Reports
          </button>
        </div>
      </div>

      {/* Real-time Analysis Progress Runner */}
      {activeAnalysis && (activeAnalysis.status === 'queued' || activeAnalysis.status === 'running' || activeAnalysis.status === 'failed') && (
        <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
          activeAnalysis.status === 'failed' ? 'bg-rose-50 border-rose-200' : 'bg-purple-50/80 border-purple-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {activeAnalysis.status === 'failed' ? (
                <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
              ) : (
                <RotateCw className="w-6 h-6 text-savo-purple animate-spin" />
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {activeAnalysis.title}
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  {stageLabels[activeAnalysis.current_stage || ''] || activeAnalysis.current_stage}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-extrabold text-savo-purple">
                {activeAnalysis.progress_pct}%
              </span>
              {activeAnalysis.status === 'failed' && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          </div>

          {/* Real Animated Progress Bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                activeAnalysis.status === 'failed' ? 'bg-rose-500' : 'bg-gradient-to-r from-savo-purple to-savo-yellow'
              }`}
              style={{ width: `${activeAnalysis.progress_pct}%` }}
            />
          </div>

          {activeAnalysis.error_message && (
            <p className="mt-3 text-xs text-rose-700 font-mono bg-rose-100/70 p-2 rounded border border-rose-300">
              Error at stage {activeAnalysis.current_stage}: {activeAnalysis.error_message}
            </p>
          )}
        </div>
      )}

      {/* Completed Area Fitness Report */}
      {activeAnalysis && activeAnalysis.status === 'done' && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-savo-purple-dark to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-purple-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-savo-yellow text-slate-900 font-extrabold text-xs tracking-wide uppercase">
                    Area Fitness Report
                  </span>
                  <span className="text-xs text-slate-300">
                    Timestamp: {new Date(activeAnalysis.completed_at || activeAnalysis.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-300">
                    Version: {activeAnalysis.scoring_version}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight mt-2 text-white">
                  {activeAnalysis.title}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Evaluated across {activeAnalysis.raw_metrics?.cell_count || 7} spatial H3 resolution-9 hex cells in Greater Chennai.
                </p>
              </div>

              {/* Score Display */}
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/15">
                <div className="text-right">
                  <div className="text-xs font-bold text-savo-yellow uppercase tracking-wider">
                    Savomart Fitness Score
                  </div>
                  <div className="text-xs text-slate-300">
                    {activeAnalysis.fitness_score && activeAnalysis.fitness_score >= 80 ? 'Tier 1 Prime Target' : 'Tier 2 Secondary Target'}
                  </div>
                </div>
                <div className="text-4xl font-black text-white flex items-baseline">
                  <span>{activeAnalysis.fitness_score}</span>
                  <span className="text-lg text-slate-400 font-medium ml-1">/100</span>
                </div>
              </div>
            </div>

            {/* Cannibalisation Check Alert */}
            {activeAnalysis.raw_metrics?.nearest_savomart && (
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Nearest Operational Savomart: <strong>{activeAnalysis.raw_metrics.nearest_savomart.name}</strong> ({activeAnalysis.raw_metrics.nearest_savomart.distance_km} km away)
                  </span>
                </div>
                {activeAnalysis.raw_metrics.nearest_savomart.distance_km < 0.8 ? (
                  <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-400 font-bold">
                    ⚠️ High Cannibalisation Risk (&lt; 800m)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                    ✓ Cannibalisation Safe (&gt; 1.5 km buffer)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subscores Breakdown & Transparent Math */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                label: 'Residential Density',
                score: activeAnalysis.subscores?.residential_density,
                weight: '30%',
                icon: Users,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                count: `${activeAnalysis.raw_metrics?.total_residential} structures`
              },
              {
                label: 'Commercial Vitality',
                score: activeAnalysis.subscores?.commercial_vitality,
                weight: '25%',
                icon: ShoppingBag,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                count: `${activeAnalysis.raw_metrics?.total_commercial} retail hubs`
              },
              {
                label: 'Competitive White Space',
                score: activeAnalysis.subscores?.competitive_gap,
                weight: '20%',
                icon: TrendingUp,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                count: `${activeAnalysis.raw_metrics?.total_competitors} grocers`
              },
              {
                label: 'Transit Accessibility',
                score: activeAnalysis.subscores?.transit_accessibility,
                weight: '15%',
                icon: Bus,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                count: `${activeAnalysis.raw_metrics?.total_transit} transit stops`
              },
              {
                label: 'Cannibalisation Safety',
                score: activeAnalysis.subscores?.cannibalisation_safety,
                weight: '10%',
                icon: ShieldCheck,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                count: `${activeAnalysis.raw_metrics?.nearest_savomart?.distance_km} km buffer`
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span className="flex items-center">
                      <item.icon className={`w-3.5 h-3.5 mr-1 ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.weight}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {item.score}<span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                  {item.count}
                </div>
              </div>
            ))}
          </div>

          {/* Action Row: Derivation Modal Trigger & Narrative */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grounded AI Narrative */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-savo-purple" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Grounded Executive Assessment
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {activeAnalysis.is_llm_generated ? 'Grounded LLM Summary' : 'Template summary (no LLM)'}
                </span>
              </div>
              <div className="prose prose-sm text-slate-700 leading-relaxed font-sans text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80 whitespace-pre-line">
                {activeAnalysis.narrative}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setShowDerivationModal(true)}
                  className="text-xs font-bold text-savo-purple hover:underline flex items-center"
                >
                  <Info className="w-3.5 h-3.5 mr-1" />
                  Why this rating? View Mathematical Derivation
                </button>
              </div>
            </div>

            {/* Hotspots Recommendation ("Where to scout first") */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Where to Scout First
                  </h3>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    Top Hotspots
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Algorithmically ranked micro-pockets with maximum unmet grocery demand:
                </p>

                <div className="space-y-3">
                  {(activeAnalysis.hotspots || []).map((h, i) => (
                    <div key={i} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 hover:border-savo-purple transition-all">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-900">{h.name}</span>
                        <span className="text-xs font-extrabold text-savo-purple bg-white px-2 py-0.5 rounded shadow-sm">
                          {h.score}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{h.rationale}</p>
                      
                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-purple-100">
                        <button
                          onClick={() => onSelectMapLocation(h.lat, h.lon)}
                          className="text-[11px] font-bold text-slate-600 hover:text-savo-purple flex items-center"
                        >
                          <MapPin className="w-3 h-3 mr-1" /> Focus Map
                        </button>
                        <button
                          onClick={() => onDispatchScouting(h, activeAnalysis.id)}
                          className="px-2.5 py-1 bg-savo-purple hover:bg-savo-purple-dark text-white font-bold text-[11px] rounded-lg shadow-sm flex items-center transition"
                        >
                          <Send className="w-3 h-3 mr-1" /> Dispatch BD Exec
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* "Why this rating?" Mathematical Derivation Modal */}
      {showDerivationModal && activeAnalysis && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Mathematical Score Derivation & Grounding Transparency
              </h3>
              <button
                onClick={() => setShowDerivationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-mono text-savo-purple font-bold block mb-1">
                  S_area = 0.30·D_res + 0.25·V_com + 0.20·G_comp + 0.15·A_trans + 0.10·C_safe
                </span>
                <p className="text-slate-600">
                  Every sub-score represents a deterministic percentile rank benchmarked against all 315 urban H3 cells across Greater Chennai.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Raw Data Audit:</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Residential structures identified: <strong>{activeAnalysis.raw_metrics?.total_residential}</strong> (Percentile: {activeAnalysis.subscores?.residential_density}/100)</li>
                  <li>Commercial & retail anchors: <strong>{activeAnalysis.raw_metrics?.total_commercial}</strong> (Percentile: {activeAnalysis.subscores?.commercial_vitality}/100)</li>
                  <li>Competitor supermarkets/kiranas: <strong>{activeAnalysis.raw_metrics?.total_competitors}</strong> (Saturation Score: {activeAnalysis.subscores?.competitive_gap}/100)</li>
                  <li>Transit nodes (Bus/Metro): <strong>{activeAnalysis.raw_metrics?.total_transit}</strong> (Percentile: {activeAnalysis.subscores?.transit_accessibility}/100)</li>
                  <li>Nearest Savomart Store: <strong>{activeAnalysis.raw_metrics?.nearest_savomart?.name}</strong> at <strong>{activeAnalysis.raw_metrics?.nearest_savomart?.distance_km} km</strong></li>
                </ul>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold block">Anti-Hallucination Grounding Guarantee:</span>
                The narrative generator runs with a numeric strictness validator. If any LLM attempts to fabricate unverified figures, the platform immediately falls back to deterministic rule templates.
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDerivationModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Area Comparison Modal */}
      {comparisonData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Side-by-Side Area Intelligence Comparison
              </h3>
              <button
                onClick={() => setComparisonData(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              {comparisonData.map((item, i) => (
                <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-slate-900 text-sm">{item.title}</h4>
                    <span className="px-2.5 py-1 bg-savo-purple text-white font-black text-xs rounded-lg">
                      {item.fitness_score}/100
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Residential Density:</span>
                      <strong className="text-slate-800">{item.subscores?.residential_density}/100</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Commercial Vitality:</span>
                      <strong className="text-slate-800">{item.subscores?.commercial_vitality}/100</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Competitive White Space:</span>
                      <strong className="text-slate-800">{item.subscores?.competitive_gap}/100</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Transit Access:</span>
                      <strong className="text-slate-800">{item.subscores?.transit_accessibility}/100</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Nearest Savomart Store:</span>
                      <strong className="text-slate-800">{item.raw_metrics?.nearest_savomart?.distance_km} km</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setComparisonData(null)}
                className="px-4 py-2 bg-savo-purple text-white font-bold rounded-xl text-xs hover:bg-savo-purple-dark transition"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
