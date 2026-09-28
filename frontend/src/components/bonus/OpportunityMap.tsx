import React, { useState, useEffect } from 'react';
import { OpportunityPocket } from '../../types';
import { api } from '../../services/api';
import { TrendingUp, MapPin, ShieldCheck, AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';

interface OpportunityMapProps {
  onSelectLocality: (pincode: string, lat: number, lon: number) => void;
}

export const OpportunityMap: React.FC<OpportunityMapProps> = ({ onSelectLocality }) => {
  const [opportunities, setOpportunities] = useState<OpportunityPocket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadScan();
  }, []);

  const loadScan = async () => {
    try {
      setLoading(true);
      const res = await api.getCityOpportunities();
      setOpportunities(res.top_opportunities);
    } catch (e) {
      console.error('Error fetching city opportunities', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 text-slate-900 p-6 rounded-3xl shadow-md border border-amber-300">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-savo-purple" />
          <span className="text-xs font-black uppercase tracking-wider text-savo-purple">
            Proactive Market Scanner
          </span>
        </div>
        <h2 className="text-xl font-black tracking-tight mt-1">
          Chennai City-Wide Opportunity Rankings
        </h2>
        <p className="text-xs text-slate-700 mt-1 max-w-2xl">
          Automated evaluation of un-scouted micro-markets in Greater Chennai. Identifies high residential density pockets with zero Savomart cannibalisation and grocery supply gaps.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Scanning city H3 grids...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Ranked Expansion Pockets ({opportunities.length} Zones)
            </h3>
            <span className="text-xs text-slate-500">Benchmark: Chennai Urban v1.0</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Micro-Market / Pincode</th>
                  <th className="p-3.5">Opportunity Score</th>
                  <th className="p-3.5">Savomart Buffer</th>
                  <th className="p-3.5">Recommendation</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {opportunities.map((opp, idx) => (
                  <tr key={opp.pincode} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-black text-slate-400">#{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900">{opp.locality_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Pincode: {opp.pincode}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-sm font-black text-savo-purple">
                        {opp.opportunity_score}
                      </span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>
                    <td className="p-3.5">
                      {opp.is_cannibalisation_risk ? (
                        <span className="text-rose-700 font-bold flex items-center text-[11px]">
                          <AlertCircle className="w-3 h-3 mr-1" /> Overlap Risk ({opp.nearest_savomart_km}km)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center text-[11px]">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Safe ({opp.nearest_savomart_km}km)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        opp.opportunity_score >= 80
                          ? 'bg-purple-100 text-savo-purple border border-purple-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {opp.recommendation_badge}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onSelectLocality(opp.pincode, opp.lat, opp.lon)}
                        className="px-3 py-1 bg-savo-purple hover:bg-savo-purple-dark text-white rounded-lg font-bold text-[11px] shadow-sm transition inline-flex items-center space-x-1"
                      >
                        <span>Analyze</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
