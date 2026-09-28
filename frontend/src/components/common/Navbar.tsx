import React from 'react';
import { User, Role } from '../../types';
import { 
  Compass, 
  Building2, 
  MapPin, 
  Layers, 
  Sparkles, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

interface NavbarProps {
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOnline: boolean;
  isSampleData: boolean;
  onOpenDecisionPack?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  users,
  currentUser,
  onSelectUser,
  activeTab,
  onSelectTab,
  isOnline,
  isSampleData,
  onOpenDecisionPack
}) => {
  const roleDisplayNames: Record<Role, { title: string; badge: string }> = {
    bd_manager: { title: 'BD Manager', badge: 'bg-purple-100 text-savo-purple border-purple-300' },
    bd_executive: { title: 'BD Executive (Field)', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
    survey_manager: { title: 'Survey Manager', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    survey_executive: { title: 'Survey Exec (Field)', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm no-print">
      {/* Brand & Persona Switcher Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-savo-purple flex items-center justify-center shadow-md border-2 border-savo-yellow">
              <span className="text-savo-yellow font-black text-xl tracking-tighter">S</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold text-savo-purple tracking-tight">SAVO</span>
                <span className="text-xl font-bold text-slate-800 tracking-tight">SiteScout</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-savo-yellow/30 text-amber-900 border border-savo-yellow">
                  Chennai CMA
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Savomart Retail Expansion Intelligence Platform
              </p>
            </div>
          </div>

          {/* Persona Switcher & Status Badges */}
          <div className="flex items-center space-x-3">
            {/* Live vs Sample Data Provenance Badge */}
            {isSampleData ? (
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Stores API unreachable; using validated Chennai sample data.">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Sample Fallback Cache
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Live API Synced
              </span>
            )}

            {/* Offline / Online indicator */}
            <div className="flex items-center">
              {isOnline ? (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50" title="Online: Cloud synchronized">
                  <Wifi className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 animate-pulse" title="Working offline; surveys stored in local queue">
                  <WifiOff className="w-3.5 h-3.5 mr-1" />
                  Offline Queue
                </span>
              )}
            </div>

            {/* Role Switcher Dropdown */}
            <div className="relative flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold px-2 hidden sm:inline">Role:</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const targetUser = users.find(u => u.id === e.target.value);
                  if (targetUser) onSelectUser(targetUser);
                }}
                className="bg-white text-xs font-bold text-slate-800 py-1.5 px-2.5 rounded-md border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-savo-purple cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {roleDisplayNames[u.role]?.title || u.role} ({u.name.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Persona Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-100 py-1 overflow-x-auto">
          {/* BD Manager Views */}
          {currentUser.role === 'bd_manager' && (
            <>
              <button
                onClick={() => onSelectTab('area_intelligence')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'area_intelligence'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-4 h-4 mr-1.5" />
                M1: Area Intelligence
              </button>
              <button
                onClick={() => onSelectTab('property_pipeline')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'property_pipeline'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 mr-1.5" />
                M2: Property Pipeline
              </button>
              <button
                onClick={() => onSelectTab('catchment_manager')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'catchment_manager'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 mr-1.5" />
                M3: Catchment Studies
              </button>
              <button
                onClick={() => onSelectTab('opportunity_scan')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'opportunity_scan'
                    ? 'bg-amber-400 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                City Opportunity Heatmap
              </button>
              <button
                onClick={() => onSelectTab('ai_analyst')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'ai_analyst'
                    ? 'bg-purple-900 text-savo-yellow shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                AI Retail Analyst
              </button>
            </>
          )}

          {/* BD Executive View */}
          {currentUser.role === 'bd_executive' && (
            <>
              <button
                onClick={() => onSelectTab('bd_field_scout')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'bd_field_scout'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                M2: Field Property Onboarding
              </button>
              <button
                onClick={() => onSelectTab('property_pipeline')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'property_pipeline'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 mr-1.5" />
                My Scouted Properties
              </button>
            </>
          )}

          {/* Survey Manager View */}
          {currentUser.role === 'survey_manager' && (
            <>
              <button
                onClick={() => onSelectTab('catchment_manager')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'catchment_manager'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 mr-1.5" />
                M3: Catchment Work Splitting & Assignment
              </button>
              <button
                onClick={() => onSelectTab('property_pipeline')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'property_pipeline'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 mr-1.5" />
                Properties Overview
              </button>
            </>
          )}

          {/* Survey Executive View */}
          {currentUser.role === 'survey_executive' && (
            <>
              <button
                onClick={() => onSelectTab('survey_executive')}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'survey_executive'
                    ? 'bg-savo-purple text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                M3: Lane Survey Capture (Offline-First)
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
