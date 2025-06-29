import { useEffect, useState, useCallback, useRef } from 'react';
import { useJournalStore } from '@/store/journal-store';
import { toast } from 'sonner';
import { SyncStatus, getSyncService } from '@/service/sync-service';
import { offlineStorage } from '@/store/offline-storage';

export function useOfflineSync() {
  // Initialize sync service lazily
  const syncService = getSyncService();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.status);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasSyncedOnMount = useRef(false);

  // Get store actions
  const { getAllJournals, entries, optimisticUpdate, optimisticCreate, optimisticDelete } =
    useJournalStore();

  // Initialize offline storage
  const initializeOfflineStorage = useCallback(async () => {
    if (isInitialized) return;

    try {
      // Initialize IndexedDB
      await offlineStorage.init();

      // Load cached data
      const cachedEntries = await offlineStorage.getAllJournals();

      // If we have cached data and are offline, use it
      if (typeof window !== 'undefined' && !navigator.onLine && cachedEntries.length > 0) {
        useJournalStore.setState({ entries: cachedEntries });
      }

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

      // Cleanup function
      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
      toast.error('Failed to initialize offline storage');
    }
  }, [isInitialized, syncService]);

  // Save entries to offline storage whenever they change
  useEffect(() => {
    if (!isInitialized) return;

    const saveToOffline = async () => {
      try {
        // Save all entries to IndexedDB
        await offlineStorage.saveJournals(entries);
      } catch (error) {
        console.error('Failed to save to offline storage:', error);
      }
    };

    saveToOffline();
  }, [entries, isInitialized]);

  // Sync when coming online
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      if (navigator.onLine && isInitialized) {
        try {
          // Wait a moment to ensure stable connection
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await syncService.syncAll();

          if (result.success && result.synced > 0) {
            toast.success(`Synced ${result.synced} ${result.synced === 1 ? 'change' : 'changes'}`);
          } else if (result.failed > 0) {
            toast.warning(
              `Sync completed with ${result.failed} ${result.failed === 1 ? 'error' : 'errors'}`,
            );
          }

          // Refresh journal list after sync
          await getAllJournals();
        } catch (error) {
          console.error('Sync failed:', error);
          toast.error('Failed to sync changes. Will retry when connection is stable.');
        }
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isInitialized, getAllJournals, syncService]);

  // Handle offline queue for actions
  const queueOfflineAction = useCallback(
    async (action: 'create' | 'update' | 'delete', data: any) => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await offlineStorage.addToSyncQueue({
          id: `queue_${Date.now()}_${Math.random()}`,
          action,
          data,
          timestamp: Date.now(),
        });
      }
    },
    [],
  );

  // Enhanced create with offline support
  const createOffline = useCallback(
    async (data: any) => {
      const tempId = `temp_${Date.now()}`;

      // Optimistic update
      optimisticCreate(tempId, {
        ...data,
        user_id: '', // Will be filled later
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_content_encrypted: false,
        _optimistic: true,
        _syncStatus: 'pending',
      });

      // Save to offline storage
      await offlineStorage.saveJournal({
        id: tempId,
        ...data,
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_content_encrypted: false,
        _optimistic: true,
        _syncStatus: 'pending',
      });

      // Queue for sync if offline
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await queueOfflineAction('create', data);
      }

      return tempId;
    },
    [optimisticCreate, queueOfflineAction],
  );

  // Enhanced update with offline support
  const updateOffline = useCallback(
    async (id: string, data: any) => {
      // Optimistic update
      optimisticUpdate(id, {
        ...data,
        updated_at: new Date().toISOString(),
        _syncStatus: 'pending',
      });

      // Get full entry for offline storage
      const entry = useJournalStore.getState().entries.find((e) => e.id === id);
      if (entry) {
        await offlineStorage.saveJournal({
          ...entry,
          ...data,
          updated_at: new Date().toISOString(),
          _syncStatus: 'pending',
        });
      }

      // Queue for sync if offline
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await queueOfflineAction('update', { id, ...data });
      }
    },
    [optimisticUpdate, queueOfflineAction],
  );

  // Enhanced delete with offline support
  const deleteOffline = useCallback(
    async (id: string) => {
      // Optimistic delete
      optimisticDelete(id);

      // Remove from offline storage
      await offlineStorage.deleteJournal(id);

      // Queue for sync if offline
      if (typeof window !== 'undefined' && !navigator.onLine) {
        await queueOfflineAction('delete', { id });
      }
    },
    [optimisticDelete, queueOfflineAction],
  );

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!isInitialized || (typeof window !== 'undefined' && !navigator.onLine)) return;

    try {
      const result = await syncService.syncAll();

      if (result.success) {
        // Refresh journal list after successful sync
        await getAllJournals();
      }

      return result;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }, [isInitialized, getAllJournals, syncService]);

  return {
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    pendingChanges: syncStatus.pendingChanges,
    lastSync: syncStatus.lastSync,
    initializeOfflineStorage,
    createOffline,
    updateOffline,
    deleteOffline,
    syncNow,
    isInitialized,
  };
}
