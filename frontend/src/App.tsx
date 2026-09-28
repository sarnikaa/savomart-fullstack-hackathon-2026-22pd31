import React, { useState, useEffect } from 'react';
import { 
  User, 
  SavomartStore, 
  ChennaiLocality, 
  AreaAnalysis, 
  Property, 
  CatchmentStudy, 
  Hotspot 
} from './types';
import { api, setActiveUserHeader } from './services/api';
import { Navbar } from './components/common/Navbar';
import { ChennaiMap } from './components/map/ChennaiMap';
import { AreaExplorer } from './components/m1_area/AreaExplorer';
import { PropertyPipeline } from './components/m2_property/PropertyPipeline';
import { PropertyOnboardingModal } from './components/m2_property/PropertyOnboardingModal';
import { CatchmentManager } from './components/m3_survey/CatchmentManager';
import { SurveyExecutiveApp } from './components/m3_survey/SurveyExecutiveApp';
import { OpportunityMap } from './components/bonus/OpportunityMap';
import { ConversationalAnalyst } from './components/bonus/ConversationalAnalyst';
import { DecisionPackModal } from './components/bonus/DecisionPackModal';

export const App: React.FC = () => {
  // Global Data State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-bd-manager',
    name: 'Karthik Ramanathan',
    email: 'karthik.mgr@savomart.in',
    role: 'bd_manager',
  });
  const [stores, setStores] = useState<SavomartStore[]>([]);
  const [isSampleData, setIsSampleData] = useState<boolean>(true);
  const [localities, setLocalities] = useState<ChennaiLocality[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [studies, setStudies] = useState<CatchmentStudy[]>([]);
  const [currentHotspots, setCurrentHotspots] = useState<Hotspot[]>([]);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<string>('area_intelligence');
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0827, 80.2707]);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Modals
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);
  const [onboardHotspot, setOnboardHotspot] = useState<Hotspot | null>(null);
  const [decisionPackProperty, setDecisionPackProperty] = useState<Property | null>(null);

  // Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Users
      const userList = await api.getUsers();
      setUsers(userList);
      const defaultUser = userList.find(u => u.role === 'bd_manager') || userList[0];
      if (defaultUser) {
        setCurrentUser(defaultUser);
        setActiveUserHeader(defaultUser.id);
      }

      // 2. Stores
      const storesRes = await api.getStores();
      setStores(storesRes.stores);
      setIsSampleData(storesRes.is_sample_fallback);

      // 3. Localities
      const locList = await api.getLocalities();
      setLocalities(locList);

      // 4. Properties
      const propList = await api.getProperties();
      setProperties(propList);

      // 5. Catchment Studies
      const studyList = await api.getCatchmentStudies();
      setStudies(studyList);
    } catch (err) {
      console.error('Failed to load initial platform data', err);
    }
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setActiveUserHeader(user.id);
    // Switch default tab according to persona
    if (user.role === 'bd_manager') {
      setActiveTab('area_intelligence');
    } else if (user.role === 'bd_executive') {
      setActiveTab('bd_field_scout');
    } else if (user.role === 'survey_manager') {
      setActiveTab('catchment_manager');
    } else if (user.role === 'survey_executive') {
      setActiveTab('survey_executive');
    }
  };

  const handleDispatchScouting = (hotspot: Hotspot, areaId?: string) => {
    setOnboardHotspot(hotspot);
    setIsOnboardingModalOpen(true);
  };

  const handleRequestCatchment = async (prop: Property) => {
    try {
      await api.requestCatchmentStudy({
        property_id: prop.id,
        radius_meters: 500,
      });
      alert(`Catchment Study requested for ${prop.name}! Automatically partitioned into 3 balanced sectors.`);
      const updatedProps = await api.getProperties();
      setProperties(updatedProps);
      const updatedStudies = await api.getCatchmentStudies();
      setStudies(updatedStudies);
      setActiveTab('catchment_manager');
    } catch (err: any) {
      alert(`Could not request study: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        users={users}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOnline={isOnline}
        isSampleData={isSampleData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Manager Layout: Split Map + Work Area for Area & Property */}
        {(activeTab === 'area_intelligence' || activeTab === 'property_pipeline') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Interactive Leaflet Map Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Chennai Interactive Spatial Map
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {mapCenter[0].toFixed(3)}° N, {mapCenter[1].toFixed(3)}° E
                  </span>
                </div>
                <ChennaiMap
                  center={mapCenter}
                  stores={stores}
                  properties={properties}
                  hotspots={currentHotspots}
                  selectedLocation={selectedMapLocation}
                  onMapClick={(lat, lon) => {
                    setSelectedMapLocation({ lat, lon });
                    setMapCenter([lat, lon]);
                  }}
                  onSelectProperty={(prop) => setDecisionPackProperty(prop)}
                  className="h-[520px]"
                />
              </div>
            </div>

            {/* Right Pane: Area Intelligence or Property Pipeline */}
            <div className="lg:col-span-7 space-y-6">
              {activeTab === 'area_intelligence' && (
                <AreaExplorer
                  localities={localities}
                  currentUser={currentUser}
                  onDispatchScouting={handleDispatchScouting}
                  onSelectMapLocation={(lat, lon) => {
                    setMapCenter([lat, lon]);
                    setSelectedMapLocation({ lat, lon });
                  }}
                  onAnalysisDone={(analysis) => {
                    if (analysis.hotspots) setCurrentHotspots(analysis.hotspots);
                  }}
                />
              )}

              {activeTab === 'property_pipeline' && (
                <PropertyPipeline
                  properties={properties}
                  currentUser={currentUser}
                  onRefresh={async () => {
                    const list = await api.getProperties();
                    setProperties(list);
                  }}
                  onRequestCatchment={handleRequestCatchment}
                  onOpenOnboardModal={() => {
                    setOnboardHotspot(null);
                    setIsOnboardingModalOpen(true);
                  }}
                  onSelectPropertyOnMap={(prop) => {
                    setMapCenter([prop.lat, prop.lon]);
                    setSelectedMapLocation({ lat: prop.lat, lon: prop.lon });
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* BD Executive Mobile Field Intake View */}
        {activeTab === 'bd_field_scout' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Field Property Scouting (Chennai)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Onboard vacant properties spotted on the street with instant automated scoring
                  </p>
                </div>
                <button
                  onClick={() => setIsOnboardingModalOpen(true)}
                  className="px-4 py-2 bg-savo-purple text-white font-extrabold text-xs rounded-xl shadow hover:bg-savo-purple-dark transition"
                >
                  + Onboard New Site
                </button>
              </div>

              {/* Quick Field Map */}
              <ChennaiMap
                center={mapCenter}
                stores={stores}
                properties={properties}
                hotspots={currentHotspots}
                className="h-72 mb-4"
              />

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recently Sighted Sites in Chennai:
                </h4>
                {properties.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-extrabold text-slate-900">{p.name}</span>
                      <p className="text-[11px] text-slate-500">{p.address}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-purple-100 text-savo-purple font-bold">
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Survey Manager View: Catchment Operations & Splitting */}
        {activeTab === 'catchment_manager' && (
          <CatchmentManager
            studies={studies}
            users={users}
            currentUser={currentUser}
            onRefresh={async () => {
              const list = await api.getCatchmentStudies();
              setStudies(list);
            }}
            onSelectMapLocation={(lat, lon) => setMapCenter([lat, lon])}
          />
        )}

        {/* Survey Executive Mobile View: Offline-First Lane Ground Capture */}
        {activeTab === 'survey_executive' && (
          <SurveyExecutiveApp
            currentUser={currentUser}
            onRefresh={async () => {
              const list = await api.getCatchmentStudies();
              setStudies(list);
            }}
          />
        )}

        {/* Bonus: Opportunity Heatmap Scanner */}
        {activeTab === 'opportunity_scan' && (
          <OpportunityMap
            onSelectLocality={(pin, lat, lon) => {
              setMapCenter([lat, lon]);
              setActiveTab('area_intelligence');
            }}
          />
        )}

        {/* Bonus: Grounded Conversational AI Analyst */}
        {activeTab === 'ai_analyst' && (
          <ConversationalAnalyst />
        )}

      </main>

      {/* Property Onboarding Modal */}
      <PropertyOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        currentUser={currentUser}
        initialHotspot={onboardHotspot}
        onPropertyCreated={(newProp) => {
          setProperties(prev => [newProp, ...prev]);
          setMapCenter([newProp.lat, newProp.lon]);
          setSelectedMapLocation({ lat: newProp.lat, lon: newProp.lon });
          if (currentUser.role === 'bd_manager') {
            setActiveTab('property_pipeline');
          }
        }}
      />

      {/* Leadership Committee Decision Pack Modal */}
      <DecisionPackModal
        property={decisionPackProperty}
        onClose={() => setDecisionPackProperty(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 SAVOmart · Expansion Intelligence Platform (Chennai Region)
          </span>
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-savo-purple">Theme: #782B90 & #FFF200</span>
            <span>•</span>
            <span>OSM & OGD Open Data Powered</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
