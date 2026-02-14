import { useEffect, useState, useCallback, useRef } from 'react';
import { useInventoryResponsesStore } from '@/store/inventory-responses-store';
import { toast } from 'sonner';
import { offlineStorage } from '@/store/offline-storage';
import {
  deleteInventoryResponse,
  submitInventoryResponse,
  getUserResponses,
} from '@/lib/actions/supabase-inventories';

export function useInventoryOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasSyncedOnMount = useRef(false);

  const {
    setResponses,
    addResponse,
    removeResponse,
    setSyncStatus,
    addPendingDelete,
    removePendingDelete,
    getAllResponses,
    getResponsesBySyncStatus,
    setInitialized: setStoreInitialized,
  } = useInventoryResponsesStore();

  // Initialize offline storage
  const initializeOfflineStorage = useCallback(async () => {
    if (isInitialized) return;

    try {
      // Initialize IndexedDB
      await offlineStorage.init();

      // Load cached inventory responses
      const cachedResponses = await offlineStorage.getAllInventoryResponses();

      // If we have cached data and are offline, use it
      if (!navigator.onLine && cachedResponses.length > 0) {
        setResponses(cachedResponses);
      }

      setIsInitialized(true);
      setStoreInitialized(true);

      // Sync on initialization if online and haven't synced yet
      if (navigator.onLine && !hasSyncedOnMount.current) {
        hasSyncedOnMount.current = true;
        await syncInventoryResponses();
      }
    } catch (error) {
      console.error('Failed to initialize inventory offline storage:', error);
      toast.error('Failed to initialize offline storage for inventory responses');
    }
  }, [isInitialized, setResponses, setStoreInitialized, syncInventoryResponses]);

  // Sync inventory responses
  const syncInventoryResponses = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);

    try {
      // Get pending responses
      const pendingResponses = getResponsesBySyncStatus('pending');
      const pendingDeletes = useInventoryResponsesStore.getState().pendingDeletes;

      let syncedCount = 0;
      let failedCount = 0;

      // Process pending deletes
      for (const responseId of pendingDeletes) {
        try {
          const result = await deleteInventoryResponse(responseId);
          if (result.success) {
            removeResponse(responseId);
            removePendingDelete(responseId);
            await offlineStorage.deleteInventoryResponse(responseId);
            syncedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error('Failed to delete response:', error);
          failedCount++;
        }
      }

      // Process pending responses (new submissions)
      for (const response of pendingResponses) {
        try {
          if ((response as any)._optimistic) {
            // This is a new response that needs to be submitted
            const result = await submitInventoryResponse({
              inventoryId: response.inventory_id,
              responses: response.responses as any,
              consentGiven: response.consent_given,
            });

            if (result.success && result.response) {
              // Update with server response
              removeResponse(response.id);
              addResponse(result.response);
              await offlineStorage.saveInventoryResponse({
                ...result.response,
                _syncStatus: 'synced',
              });
              syncedCount++;
            } else {
              failedCount++;
            }
          }
        } catch (error) {
          console.error('Failed to sync response:', error);
          failedCount++;
        }
      }

      // Fetch latest responses from server
      const serverResult = await getUserResponses();
      if (serverResult.success && serverResult.responses) {
        setResponses(serverResult.responses);

        // Save to offline storage
        await offlineStorage.saveInventoryResponses(
          serverResult.responses.map((r) => ({ ...r, _syncStatus: 'synced' })),
        );
      }

      if (syncedCount > 0) {
        toast.success(
          `Synced ${syncedCount} inventory ${syncedCount === 1 ? 'response' : 'responses'}`,
        );
      }

      if (failedCount > 0) {
        toast.warning(`Failed to sync ${failedCount} ${failedCount === 1 ? 'item' : 'items'}`);
      }
    } catch (error) {
      console.error('Inventory sync failed:', error);
      toast.error('Failed to sync inventory responses');
    } finally {
      setIsSyncing(false);
    }
  }, [
    isSyncing,
    getResponsesBySyncStatus,
    removeResponse,
    removePendingDelete,
    addResponse,
    setResponses,
  ]);

  // Save responses to offline storage whenever they change
  useEffect(() => {
    if (!isInitialized) return;

    const saveToOffline = async () => {
      try {
        const responses = getAllResponses();
        await offlineStorage.saveInventoryResponses(
          responses.map((r) => ({ ...r, _syncStatus: 'synced' })),
        );
      } catch (error) {
        console.error('Failed to save inventory responses to offline storage:', error);
      }
    };

    saveToOffline();
  }, [getAllResponses, isInitialized]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync when coming online
      setTimeout(() => syncInventoryResponses(), 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncInventoryResponses]);

  // Delete response with offline support
  const deleteResponseOffline = useCallback(
    async (responseId: string) => {
      if (navigator.onLine) {
        // Try to delete immediately
        try {
          const result = await deleteInventoryResponse(responseId);
          if (result.success) {
            removeResponse(responseId);
            await offlineStorage.deleteInventoryResponse(responseId);
            toast.success('Resultado excluído com sucesso');
          } else {
            throw new Error(result.error || 'Failed to delete');
          }
        } catch (error) {
          console.error('Failed to delete response:', error);
          toast.error('Falha ao excluir resultado');
          // Add to pending deletes for later sync
          addPendingDelete(responseId);
          setSyncStatus(responseId, 'pending');
        }
      } else {
        // Offline - queue for deletion
        addPendingDelete(responseId);
        setSyncStatus(responseId, 'pending');
        toast.info('Exclusão será sincronizada quando voltar online');
      }
    },
    [removeResponse, addPendingDelete, setSyncStatus],
  );

  return {
    isOnline,
    isSyncing,
    isInitialized,
    initializeOfflineStorage,
    syncInventoryResponses,
    deleteResponseOffline,
  };
}
