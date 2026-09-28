import React from 'react';
import { Property } from '../../types';
import { Printer, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface DecisionPackModalProps {
  property: Property | null;
  onClose: () => void;
}

export const DecisionPackModal: React.FC<DecisionPackModalProps> = ({
  property,
  onClose,
}) => {
  if (!property) return null;

  const handlePrint = () => {
    window.print();
  };

  const evalData = property.latest_evaluation;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        
        {/* Action Controls (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 no-print">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-savo-yellow/40 text-amber-900 text-xs font-bold rounded-lg border border-savo-yellow">
              Executive Memo
            </span>
            <span className="text-xs text-slate-500 font-medium">Ready for Leadership Committee Sign-Off</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-savo-purple hover:bg-savo-purple-dark text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 font-bold"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Decision Memo */}
        <div className="space-y-6 text-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-savo-purple pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-savo-purple rounded-xl flex items-center justify-center text-savo-yellow font-black text-2xl border-2 border-savo-yellow">
                S
              </div>
              <div>
                <h1 className="text-xl font-black text-savo-purple tracking-tight">SAVOMART RETAIL EXPANSION</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Store Investment Committee Decision Pack
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">ID: {property.code}</div>
              <div className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Property Name & Score Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-savo-purple text-white">
                {property.pincode} • Greater Chennai
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">{property.name}</h2>
              <p className="text-xs text-slate-600">{property.address}</p>
            </div>

            {evalData && (
              <div className="text-right bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Evaluation</div>
                <div className="text-3xl font-black text-savo-purple">
                  {evalData.total_score}<span className="text-xs text-slate-400">/100</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {evalData.recommendation.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Key Specifications Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-medium block">Carpet Area</span>
              <strong className="text-slate-900 text-sm">{property.carpet_area_sqft} sq ft</strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-medium block">Retail Frontage</span>
              <strong className="text-slate-900 text-sm">{property.frontage_ft} ft</strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-medium block">Monthly Rent</span>
              <strong className="text-slate-900 text-sm">
                {property.rent_monthly ? `₹${(property.rent_monthly / 100000).toFixed(2)} Lakhs` : 'Negotiating'}
              </strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-medium block">Rent / sq ft</span>
              <strong className="text-slate-900 text-sm">
                {property.rent_monthly ? `₹${(property.rent_monthly / property.carpet_area_sqft).toFixed(1)}/sqft` : '-'}
              </strong>
            </div>
          </div>

          {/* Key Insights & Risks */}
          {evalData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                <h4 className="font-extrabold text-emerald-900 mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                  Key Strategic Strengths
                </h4>
                <ul className="space-y-1.5 text-emerald-800">
                  {evalData.insights.map((ins, i) => (
                    <li key={i}>• {ins}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200">
                <h4 className="font-extrabold text-rose-900 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" />
                  Critical Risks & Mitigations
                </h4>
                <ul className="space-y-1.5 text-rose-800">
                  {evalData.risks.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Sign-off Section */}
          <div className="pt-6 border-t-2 border-slate-200 mt-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">
              Expansion Committee Signatures & Approval
            </h4>
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border-t border-slate-300 pt-2">
                <p className="font-bold text-slate-800">Head of Business Development</p>
                <span className="text-[10px] text-slate-400">Approved & Recommended</span>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <p className="font-bold text-slate-800">Chief Financial Officer (CFO)</p>
                <span className="text-[10px] text-slate-400">Commercial Term Verified</span>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <p className="font-bold text-slate-800">Head of Retail Operations</p>
                <span className="text-[10px] text-slate-400">Ready for Fitout Handover</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
