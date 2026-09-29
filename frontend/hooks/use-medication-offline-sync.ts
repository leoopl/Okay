import { useEffect, useState, useCallback, useRef } from 'react';
import { useMedicationStore, type DoseLogDto } from '@/store/medication-store';
import { toast } from 'sonner';
import { SyncStatus, getSyncService } from '@/service/sync-service';
import { offlineStorage } from '@/store/offline-storage';

export function useMedicationOfflineSync() {
  const syncService = getSyncService();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.status);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasSyncedOnMount = useRef(false);

  const { fetchMedications, fetchDoseLogs } = useMedicationStore();

  // Initialize offline storage and subscribe to sync events
  const initializeOfflineStorage = useCallback(async () => {
    if (isInitialized) return;

    try {
      await offlineStorage.init();

      // Subscribe to sync status changes
      const unsubscribe = syncService.subscribe((status) => {
        setSyncStatus(status);
      });

      setIsInitialized(true);

      // Sync on initialization if online and haven't synced yet
      if (typeof window !== 'undefined' && navigator.onLine && !hasSyncedOnMount.current) {
        hasSyncedOnMount.current = true;
        await syncService.syncAll();
      }

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('[useMedicationOfflineSync] Failed to initialize offline storage:', error);
    }
  }, [isInitialized, syncService]);

  // Listen for SYNC_SUCCESS from service worker to refresh data
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_SUCCESS' && event.data?.data?.type === 'medication') {
        fetchMedications().catch(console.error);
        fetchDoseLogs().catch(console.error);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [fetchMedications, fetchDoseLogs]);

  // Sync when coming back online
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      if (navigator.onLine && isInitialized) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await syncService.syncAll();

          if (result.success && result.synced > 0) {
            toast.success(
              `Sincronizado: ${result.synced} ${result.synced === 1 ? 'alteração' : 'alterações'}`,
            );
            // Refresh medication data after sync
            await Promise.all([fetchMedications(), fetchDoseLogs()]);
          } else if (result.failed > 0) {
            toast.warning(
              `Sincronização com ${result.failed} ${result.failed === 1 ? 'erro' : 'erros'}`,
            );
          }
        } catch (error) {
          console.error('[useMedicationOfflineSync] Sync failed:', error);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isInitialized, fetchMedications, fetchDoseLogs, syncService]);

  // iOS/Safari: sync on visibility change and focus (PeriodicSync not available on iOS)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && isInitialized) {
        syncService.syncAll().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isInitialized, syncService]);

  // Log a dose with offline support (clientId for idempotency is managed by the store)
  const logDoseOffline = useCallback(async (data: DoseLogDto) => {
    const { logDose } = useMedicationStore.getState();
    return logDose(data);
  }, []);

  // Manual sync
  const syncNow = useCallback(async () => {
    if (!isInitialized || (typeof window !== 'undefined' && !navigator.onLine)) return;

    try {
      const result = await syncService.syncAll();

      if (result.success) {
        await Promise.all([fetchMedications(), fetchDoseLogs()]);
      }

      return result;
    } catch (error) {
      console.error('[useMedicationOfflineSync] Manual sync failed:', error);
      throw error;
    }
  }, [isInitialized, fetchMedications, fetchDoseLogs, syncService]);

  return {
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    pendingChanges: syncStatus.pendingChanges,
    lastSync: syncStatus.lastSync,
    initializeOfflineStorage,
    logDoseOffline,
    syncNow,
    isInitialized,
  };
}
