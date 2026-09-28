import { useState, useEffect, useCallback } from 'react';
import { LaneSurvey } from '../types';
import { api } from '../services/api';

const STORAGE_KEY = 'savo_offline_surveys_queue';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSurveys, setPendingSurveys] = useState<LaneSurvey[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncMessage, setLastSyncMessage] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPendingSurveys(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load offline surveys from storage', e);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending surveys to backend
  const syncNow = useCallback(async () => {
    if (pendingSurveys.length === 0 || !navigator.onLine) return;

    setSyncStatus('syncing');
    try {
      const res = await api.syncLaneSurveys(pendingSurveys);
      setSyncStatus('synced');
      setLastSyncMessage(`Synced ${res.synced_count} lane surveys to cloud.`);
      // Clear queue
      setPendingSurveys([]);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (err: any) {
      setSyncStatus('error');
      setLastSyncMessage(err.message || 'Sync failed. Will retry automatically.');
    }
  }, [pendingSurveys]);

  // Save new survey locally first
  const queueSurvey = useCallback((survey: LaneSurvey) => {
    setPendingSurveys(prev => {
      // Deduplicate by client_uuid
      const filtered = prev.filter(s => s.client_uuid !== survey.client_uuid);
      const updated = [...filtered, survey];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // If online, trigger auto-sync
    if (navigator.onLine) {
      setTimeout(() => {
        syncNow();
      }, 500);
    }
  }, [syncNow]);

  return {
    isOnline,
    pendingSurveys,
    pendingCount: pendingSurveys.length,
    syncStatus,
    lastSyncMessage,
    queueSurvey,
    syncNow,
  };
}
