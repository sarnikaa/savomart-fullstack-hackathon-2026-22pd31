import React, { useState, useEffect } from 'react';
import { SurveyTask, LaneSurvey, User } from '../../types';
import { api } from '../../services/api';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { 
  MapPin, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Store, 
  Ruler, 
  Send,
  Sparkles
} from 'lucide-react';

interface SurveyExecutiveAppProps {
  currentUser: User;
  onRefresh: () => void;
}

export const SurveyExecutiveApp: React.FC<SurveyExecutiveAppProps> = ({
  currentUser,
  onRefresh,
}) => {
  const [tasks, setTasks] = useState<SurveyTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SurveyTask | null>(null);
  const [selectedLaneId, setSelectedLaneId] = useState<string>('');
  const [measuredWidthFt, setMeasuredWidthFt] = useState<number>(36);
  const [pedestrianCount, setPedestrianCount] = useState<number>(65);
  const [timeSlot, setTimeSlot] = useState<'morning_peak' | 'afternoon_regular' | 'evening_peak'>('evening_peak');
  const [kiranaCount, setKiranaCount] = useState<number>(2);
  const [supermarketCount, setSupermarketCount] = useState<number>(1);
  const [householdTags, setHouseholdTags] = useState<string[]>([
    'high_density_apartments',
    'upper_middle_class'
  ]);
  const [obstacleFlags, setObstacleFlags] = useState<string[]>([]);
  const [isSuccessMessage, setIsSuccessMessage] = useState<string | null>(null);

  const {
    isOnline,
    pendingCount,
    syncStatus,
    lastSyncMessage,
    queueSurvey,
    syncNow
  } = useOfflineQueue();

  // Load assigned tasks
  useEffect(() => {
    loadTasks();
  }, [currentUser.id]);

  const loadTasks = async () => {
    try {
      const list = await api.getSurveyTasks(currentUser.id);
      setTasks(list);
      if (list.length > 0 && !selectedTask) {
        setSelectedTask(list[0]);
        if (list[0].lane_ids && list[0].lane_ids.length > 0) {
          setSelectedLaneId(list[0].lane_ids[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching assigned tasks', e);
    }
  };

  const handleCaptureSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedLaneId) return;

    const clientUuid = `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const surveyData: LaneSurvey = {
      client_uuid: clientUuid,
      survey_task_id: selectedTask.id,
      lane_id: selectedLaneId,
      lane_name: `${selectedTask.name} - ${selectedLaneId}`,
      measured_width_ft: measuredWidthFt,
      pedestrian_count_10min: pedestrianCount,
      measurement_time_slot: timeSlot,
      kirana_count: kiranaCount,
      supermarket_count: supermarketCount,
      household_tags: householdTags,
      obstacle_flags: obstacleFlags,
      offline_created_at: new Date().toISOString(),
    };

    // Save locally first via offline queue hook
    queueSurvey(surveyData);

    setIsSuccessMessage(
      isOnline
        ? 'Survey captured & synced to cloud!'
        : 'Saved offline in local memory queue. Will sync automatically when network restores.'
    );

    setTimeout(() => setIsSuccessMessage(null), 4000);
    onRefresh();
  };

  const toggleTag = (tag: string) => {
    setHouseholdTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleObstacle = (flag: string) => {
    setObstacleFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Mobile Header Banner */}
      <div className="bg-savo-purple text-white p-5 rounded-3xl shadow-lg border-2 border-savo-yellow flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-savo-yellow bg-white/10 px-2 py-0.5 rounded">
            Survey Executive Field App
          </span>
          <h2 className="text-lg font-black tracking-tight mt-1">
            {currentUser.name}
          </h2>
          <p className="text-xs text-purple-200">
            Offline-First Lane Ground Capture
          </p>
        </div>

        {/* Sync Controls */}
        <div className="text-right">
          <div className="flex items-center justify-end space-x-1 mb-1">
            {isOnline ? (
              <span className="text-[10px] font-bold text-emerald-300 flex items-center">
                <Wifi className="w-3 h-3 mr-1" /> Online
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-300 flex items-center animate-pulse">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </span>
            )}
          </div>
          {pendingCount > 0 && (
            <button
              onClick={syncNow}
              disabled={syncStatus === 'syncing' || !isOnline}
              className="px-2.5 py-1 bg-savo-yellow text-slate-900 font-extrabold rounded-lg text-[10px] shadow flex items-center space-x-1"
            >
              {syncStatus === 'syncing' ? <RotateCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>Sync {pendingCount} Pending</span>
            </button>
          )}
        </div>
      </div>

      {isSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs text-emerald-800 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{isSuccessMessage}</span>
        </div>
      )}

      {/* Task Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          Assigned Survey Sector:
        </label>
        <select
          value={selectedTask?.id || ''}
          onChange={(e) => {
            const t = tasks.find(item => item.id === e.target.value);
            if (t) {
              setSelectedTask(t);
              if (t.lane_ids?.length) setSelectedLaneId(t.lane_ids[0]);
            }
          }}
          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-savo-purple"
        >
          {tasks.map(t => (
            <option key={t.id} value={t.id}>
              Chunk #{t.chunk_index}: {t.name} ({t.surveys_count} lanes completed)
            </option>
          ))}
        </select>
      </div>

      {/* Lane Capture Form */}
      {selectedTask && (
        <form onSubmit={handleCaptureSurvey} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4 text-xs font-semibold text-slate-700">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-900">
              Capture Lane Ground Data
            </h3>
            <p className="text-[11px] text-slate-500">
              Measure lane footfall over a standardized 10-minute window
            </p>
          </div>

          {/* Lane Picker */}
          <div>
            <label className="block text-slate-600 mb-1">Select Assigned Lane Corridor *</label>
            <select
              value={selectedLaneId}
              onChange={e => setSelectedLaneId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
            >
              {(selectedTask.lane_ids || []).map(lid => (
                <option key={lid} value={lid}>{lid}</option>
              ))}
            </select>
          </div>

          {/* 10-Min Pedestrian Count Window */}
          <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-extrabold flex items-center">
                <Users className="w-4 h-4 mr-1 text-savo-purple" />
                Pedestrian Count (10-Min Window) *
              </label>
              <span className="font-mono font-black text-savo-purple text-base">
                {pedestrianCount} persons
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="250"
              value={pedestrianCount}
              onChange={e => setPedestrianCount(Number(e.target.value))}
              className="w-full accent-savo-purple"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Low (5)</span>
              <span>Medium (75)</span>
              <span>High (250+)</span>
            </div>
          </div>

          {/* Time Slot & Road Width */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Measurement Slot *</label>
              <select
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
              >
                <option value="morning_peak">Morning Peak (8-11 AM)</option>
                <option value="afternoon_regular">Afternoon (1-4 PM)</option>
                <option value="evening_peak">Evening Peak (5-9 PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Measured Road Width (ft)</label>
              <input
                type="number"
                value={measuredWidthFt}
                onChange={e => setMeasuredWidthFt(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Existing Competition in Lane */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Local Kirana Stores Count</label>
              <input
                type="number"
                min="0"
                value={kiranaCount}
                onChange={e => setKiranaCount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Supermarket Competitors</label>
              <input
                type="number"
                min="0"
                value={supermarketCount}
                onChange={e => setSupermarketCount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Household Profile Tags */}
          <div>
            <label className="block text-slate-600 mb-1.5">Household Demographics Profile:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'high_density_apartments', label: '🏢 Dense Apartments' },
                { id: 'independent_houses', label: '🏡 Individual Houses' },
                { id: 'upper_middle_class', label: '💼 Upper Middle Income' },
                { id: 'student_hostels', label: '🎓 Student / Hostels' },
              ].map(tag => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    householdTags.includes(tag.id)
                      ? 'bg-savo-purple text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Obstacle Flags */}
          <div>
            <label className="block text-slate-600 mb-1.5">Field Obstacle Alerts:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'waterlogging_prone', label: '🌧️ Waterlogging Risk' },
                { id: 'narrow_for_trucks', label: '🚛 Narrow Delivery Entry' },
                { id: 'no_customer_parking', label: '🚫 No Street Parking' },
              ].map(flag => (
                <button
                  type="button"
                  key={flag.id}
                  onClick={() => toggleObstacle(flag.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    obstacleFlags.includes(flag.id)
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              {isOnline ? 'Direct Cloud Sync' : 'IndexedDB Offline Storage'}
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 bg-savo-purple hover:bg-savo-purple-dark text-white font-extrabold rounded-xl shadow-lg transition flex items-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Record Lane Observation</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
