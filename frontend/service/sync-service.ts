import { Journal } from '@/store/journal-store';
import {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getJournalEntries,
} from '@/lib/actions/supabase-journal';
import {
  submitInventoryResponse,
  getUserResponses,
} from '@/lib/actions/supabase-inventories';
import { logDose } from '@/lib/actions/supabase-dose-logs';
import { getMedications } from '@/lib/actions/supabase-medications';
import { offlineStorage, SyncQueueItem, OfflineDoseLog } from '../store/offline-storage';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
  errors: SyncError[];
}

export interface ConflictItem {
  localVersion: Journal;
  remoteVersion: Journal;
  resolution?: 'local' | 'remote' | 'merge';
  mergedVersion?: Journal;
}

export interface SyncError {
  itemId: string;
  action: string;
  error: string;
  retryable: boolean;
}

export type ConflictResolver = (conflict: ConflictItem) => Promise<'local' | 'remote' | 'merge'>;

class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private conflictResolver: ConflictResolver | null = null;
  private isInitialized = false;

  // Sync status
  public status: SyncStatus = {
    isOnline: typeof window !== 'undefined' ? navigator.onLine : false,
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
  };

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeBrowser();
    }
  }

  private initializeBrowser() {
    if (this.isInitialized) return;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for TRIGGER_SYNC from service worker (when SW background sync fires)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage);
    }

    // Check online status periodically
    setInterval(() => {
      this.updateOnlineStatus();
    }, 30000); // Every 30 seconds

    // Initialize
    this.updateOnlineStatus();
    this.isInitialized = true;
  }

  // Handle messages from the service worker
  private handleSWMessage = (event: MessageEvent) => {
    if (event.data?.type === 'TRIGGER_SYNC') {
      // Ack immediately via MessageChannel so SW doesn't time out waiting
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'SYNC_ACK' });
      }
      // Trigger sync asynchronously — Web Locks inside syncAll() will serialize multi-tab calls
      this.syncAll().catch(console.error);
    }
  };

  private handleOnline = () => {
    this.updateOnlineStatus();
    // Attempt to sync when coming online
    this.syncAll();
  };

  private handleOffline = () => {
    this.updateOnlineStatus();
  };

  private updateOnlineStatus() {
    if (typeof window === 'undefined') return;

    const wasOnline = this.status.isOnline;
    this.status.isOnline = navigator.onLine;

    if (!wasOnline && this.status.isOnline) {
      this.notifyListeners();
    }
  }

  // Refresh auth session before sync — prevents silent queue drops on expired JWTs
  private async refreshAuth(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      // Proactively refresh if expiring within 60 seconds
      if (session.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[SyncService] Session refresh failed:', error.message);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('[SyncService] Auth check failed:', error);
      return false;
    }
  }

  // Set custom conflict resolver
  setConflictResolver(resolver: ConflictResolver) {
    this.conflictResolver = resolver;
  }

  // Subscribe to sync status changes
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.syncListeners.forEach((listener) => listener(this.status));
  }

  // Main sync function
  async syncAll(): Promise<SyncResult> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: [{ itemId: 'sync', action: 'syncAll', error: 'Not in browser environment', retryable: false }],
      };
    }

    if (!this.isInitialized) {
      this.initializeBrowser();
    }

    if (!this.status.isOnline) {
      return { success: false, synced: 0, failed: 0, conflicts: [], errors: [] };
    }

    // Web Locks: serialize concurrent syncAll() calls across tabs.
    // AbortSignal.timeout(30_000) prevents starvation if a tab crashes while holding the lock.
    try {
      return await navigator.locks.request(
        'okay-sync-lock',
        { signal: AbortSignal.timeout(30_000) },
        async () => {
          // Same-tab reentrancy guard (Web Locks handles cross-tab; this handles re-entrancy)
          if (this.isSyncing) {
            return { success: false, synced: 0, failed: 0, conflicts: [], errors: [] };
          }

          this.isSyncing = true;
          this.status.isSyncing = true;
          this.notifyListeners();

          const result: SyncResult = {
            success: true,
            synced: 0,
            failed: 0,
            conflicts: [],
            errors: [],
          };

          try {
            // 0. Refresh auth — never silently drop queue on expired JWT
            const isAuthenticated = await this.refreshAuth();
            if (!isAuthenticated) {
              result.success = false;
              result.errors.push({
                itemId: 'auth',
                action: 'refreshAuth',
                error: 'No active session — sync requires authentication',
                retryable: false,
              });
              return result;
            }

            // 1. Process sync queue
            await this.processSyncQueue(result);

            // 2. Sync local changes
            await this.syncLocalChanges(result);

            // 3. Pull remote changes
            await this.pullRemoteChanges(result);

            // 4. Sync inventory responses
            const inventoryResult = await this.syncInventoryResponses();
            result.synced += inventoryResult.synced;
            result.failed += inventoryResult.failed;
            result.errors.push(...inventoryResult.errors);

            // 5. Sync dose logs (before medications so server-side upsert has current med IDs)
            const doseLogResult = await this.syncDoseLogs();
            result.synced += doseLogResult.synced;
            result.failed += doseLogResult.failed;
            result.errors.push(...doseLogResult.errors);

            // 6. Sync medications (pull remote state)
            const medicationResult = await this.syncMedications();
            result.synced += medicationResult.synced;
            result.failed += medicationResult.failed;
            result.errors.push(...medicationResult.errors);

            // 7. Resolve conflicts
            if (result.conflicts.length > 0) {
              await this.resolveConflicts(result);
            }

            this.status.lastSync = new Date();
            this.status.pendingChanges = await this.getPendingChangesCount();
            result.success = result.failed === 0 && result.errors.length === 0;
          } catch (error) {
            console.error('Sync error:', error);
            result.success = false;
            result.errors.push({
              itemId: 'sync',
              action: 'syncAll',
              error: error instanceof Error ? error.message : 'Unknown sync error',
              retryable: true,
            });
          } finally {
            this.isSyncing = false;
            this.status.isSyncing = false;
            this.notifyListeners();
          }

          return result;
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Lock timed out (another tab crashed/froze while holding the lock)
        console.warn('[SyncService] Sync lock timed out — skipping this cycle');
        this.isSyncing = false;
        this.status.isSyncing = false;
        this.notifyListeners();
        return {
          success: false,
          synced: 0,
          failed: 0,
          conflicts: [],
          errors: [{ itemId: 'sync', action: 'syncAll', error: 'Lock timeout', retryable: true }],
        };
      }
      throw error;
    }
  }

  // Process items in sync queue
  private async processSyncQueue(result: SyncResult) {
    const queue = await offlineStorage.getSyncQueue();

    for (const item of queue) {
      try {
        await this.processSyncQueueItem(item);
        await offlineStorage.removeFromSyncQueue(item.id);
        result.synced++;
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);

        // Update retry count
        item.retries++;
        await offlineStorage.updateSyncQueueItem(item);

        result.failed++;
        result.errors.push({
          itemId: item.id,
          action: item.action,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: item.retries < 3,
        });

        // Remove from queue if too many retries
        if (item.retries >= 3) {
          await offlineStorage.removeFromSyncQueue(item.id);
        }
      }
    }
  }

  private async processSyncQueueItem(item: SyncQueueItem) {
    switch (item.action) {
      case 'create':
        await createJournalEntry(
          item.data.title,
          item.data.content,
          item.data.mood,
          item.data.tags,
          item.data.is_content_encrypted,
          item.data.id, // Pass client UUID for idempotent upsert
        );
        break;

      case 'update':
        await updateJournalEntry(
          item.data.id,
          item.data.title,
          item.data.content,
          item.data.mood,
          item.data.tags,
          item.data.is_content_encrypted,
        );
        break;

      case 'delete':
        await deleteJournalEntry(item.data.id);
        break;

      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  // Sync local changes not in queue
  private async syncLocalChanges(result: SyncResult) {
    const pendingJournals = await offlineStorage.getJournalsBySyncStatus('pending');

    for (const journal of pendingJournals) {
      try {
        if (journal._optimistic) {
          // This is a new entry — pass client UUID for idempotent upsert on server
          const response = await createJournalEntry(
            journal.title,
            journal.content,
            journal.mood as any,
            journal.tags,
            journal.is_content_encrypted,
            journal.id, // UUID preserved — no ID swap needed after sync
          );

          if (response.success && response.entry) {
            // UUID is the same — just mark as synced (no delete+recreate)
            await offlineStorage.saveJournal({
              ...response.entry,
              _syncStatus: 'synced',
              _optimistic: false,
            } as Journal);
          }
        } else {
          // This is an update
          await updateJournalEntry(
            journal.id,
            journal.title,
            journal.content,
            journal.mood as any,
            journal.tags,
            journal.is_content_encrypted,
          );

          // Mark as synced
          await offlineStorage.saveJournal({
            ...journal,
            _syncStatus: 'synced',
          });
        }

        result.synced++;
      } catch (error) {
        console.error(`Failed to sync journal ${journal.id}:`, error);

        // Mark as error
        await offlineStorage.saveJournal({
          ...journal,
          _syncStatus: 'error',
        });

        result.failed++;
        result.errors.push({
          itemId: journal.id,
          action: journal._optimistic ? 'create' : 'update',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        });
      }
    }
  }

  // Pull remote changes
  private async pullRemoteChanges(result: SyncResult) {
    try {
      const response = await getJournalEntries(100, 0);

      if (!response.success || !response.entries) {
        throw new Error(response.error || 'Failed to fetch remote entries');
      }

      const remoteEntries = response.entries;
      const localEntries = await offlineStorage.getAllJournals();

      // Create maps for efficient lookup
      const localMap = new Map(localEntries.map((e) => [e.id, e]));
      const remoteMap = new Map(remoteEntries.map((e) => [e.id, e]));

      // Find new remote entries
      for (const remote of remoteEntries) {
        const local = localMap.get(remote.id);

        if (!local) {
          // New entry from server
          await offlineStorage.saveJournal({
            ...remote,
            _syncStatus: 'synced',
          } as Journal);
          result.synced++;
        } else if (local._syncStatus === 'synced') {
          // Check for updates
          const localTime = new Date(local.updated_at).getTime();
          const remoteTime = new Date(remote.updated_at).getTime();

          if (remoteTime > localTime) {
            // Remote is newer, update local
            await offlineStorage.saveJournal({
              ...remote,
              _syncStatus: 'synced',
            } as Journal);
            result.synced++;
          }
        } else if (local._syncStatus === 'pending') {
          // Conflict detected
          const localTime = new Date(local.updated_at).getTime();
          const remoteTime = new Date(remote.updated_at).getTime();

          if (localTime !== remoteTime) {
            result.conflicts.push({
              localVersion: local,
              remoteVersion: remote as Journal,
            });
          }
        }
      }

      // Find deleted entries
      for (const local of localEntries) {
        if (!remoteMap.has(local.id) && local._syncStatus === 'synced') {
          // Entry was deleted on server
          await offlineStorage.deleteJournal(local.id);
          result.synced++;
        }
      }
    } catch (error) {
      console.error('Failed to pull remote changes:', error);
      result.errors.push({
        itemId: 'pull',
        action: 'pullRemoteChanges',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });
    }
  }

  // Resolve conflicts
  private async resolveConflicts(result: SyncResult) {
    for (const conflict of result.conflicts) {
      try {
        let resolution: 'local' | 'remote' | 'merge' = 'remote'; // Default

        if (this.conflictResolver) {
          resolution = await this.conflictResolver(conflict);
        } else {
          // Default strategy: last-write-wins
          const localTime = new Date(conflict.localVersion.updated_at).getTime();
          const remoteTime = new Date(conflict.remoteVersion.updated_at).getTime();
          resolution = localTime > remoteTime ? 'local' : 'remote';
        }

        conflict.resolution = resolution;

        switch (resolution) {
          case 'local':
            // Keep local version, push to server
            await updateJournalEntry(
              conflict.localVersion.id,
              conflict.localVersion.title,
              conflict.localVersion.content,
              conflict.localVersion.mood as any,
              conflict.localVersion.tags,
              conflict.localVersion.is_content_encrypted,
            );
            await offlineStorage.saveJournal({
              ...conflict.localVersion,
              _syncStatus: 'synced',
            });
            break;

          case 'remote':
            // Keep remote version
            await offlineStorage.saveJournal({
              ...conflict.remoteVersion,
              _syncStatus: 'synced',
            });
            break;

          case 'merge':
            // Merge versions (this is a simple example)
            const merged: Journal = {
              ...conflict.remoteVersion,
              content: conflict.localVersion.content, // Keep local content
              tags: Array.from(
                new Set([...conflict.localVersion.tags, ...conflict.remoteVersion.tags]),
              ),
              updated_at: new Date().toISOString(),
            };

            conflict.mergedVersion = merged;

            await updateJournalEntry(
              merged.id,
              merged.title,
              merged.content,
              merged.mood as any,
              merged.tags,
              merged.is_content_encrypted,
            );
            await offlineStorage.saveJournal({
              ...merged,
              _syncStatus: 'synced',
            });
            break;
        }

        result.synced++;
      } catch (error) {
        console.error(`Failed to resolve conflict for ${conflict.localVersion.id}:`, error);
        result.errors.push({
          itemId: conflict.localVersion.id,
          action: 'resolveConflict',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        });
      }
    }
  }

  // Get count of pending changes
  async getPendingChangesCount(): Promise<number> {
    const [pendingJournals, pendingInventoryResponses, pendingDoseLogs, syncQueue] =
      await Promise.all([
        offlineStorage.getJournalsBySyncStatus('pending'),
        offlineStorage.getInventoryResponsesBySyncStatus('pending'),
        offlineStorage.getDoseLogsBySyncStatus('pending'),
        offlineStorage.getSyncQueue(),
      ]);
    return (
      pendingJournals.length +
      pendingInventoryResponses.length +
      pendingDoseLogs.length +
      syncQueue.length
    );
  }

  // Sync inventory responses
  async syncInventoryResponses(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    };

    try {
      // Get pending inventory responses
      const pendingResponses = await offlineStorage.getInventoryResponsesBySyncStatus('pending');

      for (const response of pendingResponses) {
        try {
          if ((response as any)._optimistic) {
            // This is a new response that needs to be submitted
            const submitResult = await submitInventoryResponse({
              inventoryId: response.inventory_id,
              responses: response.responses as any,
              consentGiven: response.consent_given,
            });

            if (submitResult.success && submitResult.response) {
              // Update local storage with server response
              await offlineStorage.deleteInventoryResponse(response.id);
              await offlineStorage.saveInventoryResponse({
                ...submitResult.response,
                _syncStatus: 'synced',
              });
              result.synced++;
            } else {
              throw new Error(submitResult.error || 'Failed to submit response');
            }
          }
        } catch (error) {
          console.error(`Failed to sync inventory response ${response.id}:`, error);

          // Mark as error
          await offlineStorage.saveInventoryResponse({
            ...response,
            _syncStatus: 'error',
          });

          result.failed++;
          result.errors.push({
            itemId: response.id,
            action: 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          });
        }
      }

      // Pull remote inventory responses
      const remoteResult = await getUserResponses();
      if (remoteResult.success && remoteResult.responses) {
        const localResponses = await offlineStorage.getAllInventoryResponses();
        const localMap = new Map(localResponses.map((r) => [r.id, r]));

        // Update local storage with remote responses
        for (const remote of remoteResult.responses) {
          const local = localMap.get(remote.id);
          if (!local || new Date(remote.completed_at) > new Date(local.completed_at)) {
            await offlineStorage.saveInventoryResponse({
              ...remote,
              _syncStatus: 'synced',
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync inventory responses:', error);
      result.errors.push({
        itemId: 'inventory-sync',
        action: 'syncInventoryResponses',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });
    }

    return result;
  }

  // Sync pending dose logs to server
  async syncDoseLogs(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    };

    try {
      const pendingLogs = await offlineStorage.getDoseLogsBySyncStatus('pending');

      for (const log of pendingLogs) {
        try {
          const response = await logDose({
            medicationId: log.medication_id,
            status: log.status as any,
            timestamp: log.timestamp,
            scheduledTime: log.scheduled_time || undefined,
            notes: log.notes || undefined,
            doseType: log.dose_type as 'scheduled' | 'prn' | undefined,
            clientId: log.id,
          });

          if (response.success && response.doseLog) {
            // Update with server-confirmed record
            await offlineStorage.deleteDoseLog(log.id);
            await offlineStorage.saveDoseLog({
              ...log,
              id: response.doseLog.id,
              _syncStatus: 'synced',
              _optimistic: false,
            } as OfflineDoseLog);
            result.synced++;
          } else {
            throw new Error(response.error || 'Failed to sync dose log');
          }
        } catch (error) {
          console.error(`[SyncService] Failed to sync dose log ${log.id}:`, error);
          await offlineStorage.saveDoseLog({ ...log, _syncStatus: 'error' });
          result.failed++;
          result.errors.push({
            itemId: log.id,
            action: 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          });
        }
      }
    } catch (error) {
      console.error('[SyncService] Failed to sync dose logs:', error);
      result.errors.push({
        itemId: 'dose-logs-sync',
        action: 'syncDoseLogs',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });
    }

    return result;
  }

  // Sync medications: pull remote state and update local cache
  async syncMedications(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    };

    try {
      const response = await getMedications();
      if (!response.success || !response.medications) {
        throw new Error(response.error || 'Failed to fetch medications');
      }

      const localMedications = await offlineStorage.getAllMedications();
      const localMap = new Map(localMedications.map((m) => [m.id, m]));

      for (const remote of response.medications) {
        const local = localMap.get(remote.id);
        if (!local || (remote.updated_at && remote.updated_at > (local.updated_at || ''))) {
          await offlineStorage.saveMedication({
            id: remote.id,
            user_id: remote.user_id,
            name: remote.name,
            dosage: remote.dosage,
            form: remote.form,
            start_date: remote.start_date,
            end_date: remote.end_date || null,
            notes: remote.notes || null,
            instructions: remote.instructions || null,
            schedule: (remote as any).schedule || [],
            created_at: remote.created_at,
            updated_at: remote.updated_at,
            _syncStatus: 'synced',
            _optimistic: false,
          });
          result.synced++;
        }
      }
    } catch (error) {
      console.error('[SyncService] Failed to sync medications:', error);
      result.errors.push({
        itemId: 'medications-sync',
        action: 'syncMedications',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });
    }

    return result;
  }

  // Manual conflict resolution
  async resolveConflictManually(
    localId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: Partial<Journal>,
  ): Promise<void> {
    const local = await offlineStorage.getJournal(localId);
    if (!local) throw new Error('Local journal not found');

    if (resolution === 'merge' && mergedData) {
      const merged = { ...local, ...mergedData, updated_at: new Date().toISOString() };
      await offlineStorage.saveJournal(merged);
      await updateJournalEntry(
        merged.id,
        merged.title,
        merged.content,
        merged.mood as any,
        merged.tags,
        merged.is_content_encrypted,
      );
    } else if (resolution === 'local') {
      await updateJournalEntry(
        local.id,
        local.title,
        local.content,
        local.mood as any,
        local.tags,
        local.is_content_encrypted,
      );
    }
    // If 'remote', we don't need to do anything as the next sync will pull it
  }

  // Cleanup
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', this.handleSWMessage);
      }
    }
    this.syncListeners = [];
  }
}

// Types
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingChanges: number;
}

// Lazy singleton instance
let syncServiceInstance: SyncService | null = null;

export const getSyncService = (): SyncService => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
};

// For backward compatibility
export const syncService = getSyncService();
