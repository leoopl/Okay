import { Journal } from '@/store/journal-store';
import type { InventoryResponse } from '@/lib/actions/supabase-inventories';

const DB_NAME = 'OkayJournalDB';
const DB_VERSION = 3; // v3: added medications + doseLogs stores
const STORE_NAME = 'journals';
const SYNC_QUEUE_STORE = 'syncQueue';
const INVENTORY_RESPONSES_STORE = 'inventoryResponses';
const MEDICATIONS_STORE = 'medications';
const DOSE_LOGS_STORE = 'doseLogs';

// Storage quota thresholds
const STORAGE_WARN_THRESHOLD = 50 * 1024 * 1024; // 50MB — log warning, continue write
const STORAGE_MIN_FREE = 10 * 1024 * 1024; // 10MB — abort write, notify user

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

export interface OfflineMedication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  form: string;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  instructions?: string | null;
  schedule: any[];
  created_at: string;
  updated_at: string;
  _syncStatus?: 'pending' | 'synced' | 'error';
  _optimistic?: boolean;
}

export interface OfflineDoseLog {
  id: string;
  medication_id: string;
  user_id: string;
  timestamp: string;
  status: string;
  scheduled_time?: string | null;
  notes?: string | null;
  dose_type?: 'scheduled' | 'prn' | null;
  created_at: string;
  updated_at: string;
  _syncStatus?: 'pending' | 'synced' | 'error';
  _optimistic?: boolean;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private migrationFailed = false;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.migrationFailed = true;
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const oldVersion = event.oldVersion;

          // v1 → v2 migration: create journals, syncQueue, inventoryResponses stores
          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const journalStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
              journalStore.createIndex('user_id', 'user_id', { unique: false });
              journalStore.createIndex('created_at', 'created_at', { unique: false });
              journalStore.createIndex('updated_at', 'updated_at', { unique: false });
              journalStore.createIndex('_syncStatus', '_syncStatus', { unique: false });
            }

            if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
              const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
              syncStore.createIndex('timestamp', 'timestamp', { unique: false });
              syncStore.createIndex('action', 'action', { unique: false });
            }

            if (!db.objectStoreNames.contains(INVENTORY_RESPONSES_STORE)) {
              const inventoryStore = db.createObjectStore(INVENTORY_RESPONSES_STORE, {
                keyPath: 'id',
              });
              inventoryStore.createIndex('user_id', 'user_id', { unique: false });
              inventoryStore.createIndex('inventory_id', 'inventory_id', { unique: false });
              inventoryStore.createIndex('completed_at', 'completed_at', { unique: false });
              inventoryStore.createIndex('_syncStatus', '_syncStatus', { unique: false });
            }
          }

          // v2 → v3 migration: create medications + doseLogs stores
          if (oldVersion < 3) {
            if (!db.objectStoreNames.contains(MEDICATIONS_STORE)) {
              const medStore = db.createObjectStore(MEDICATIONS_STORE, { keyPath: 'id' });
              medStore.createIndex('user_id', 'user_id', { unique: false });
              medStore.createIndex('_syncStatus', '_syncStatus', { unique: false });
            }

            if (!db.objectStoreNames.contains(DOSE_LOGS_STORE)) {
              const doseStore = db.createObjectStore(DOSE_LOGS_STORE, { keyPath: 'id' });
              doseStore.createIndex('medication_id', 'medication_id', { unique: false });
              doseStore.createIndex('logged_at', 'timestamp', { unique: false });
              doseStore.createIndex('_syncStatus', '_syncStatus', { unique: false });
              // Composite index for efficient scheduled-dose lookup.
              // NOTE: IndexedDB does NOT enforce uniqueness on non-keyPath indexes.
              // Deduplication for scheduled doses is enforced server-side via upsert.
              doseStore.createIndex(
                'medication_scheduled_date',
                ['medication_id', 'scheduled_time', 'date'],
                { unique: false },
              );
            }
          }
        } catch (err) {
          // If migration fails, set flag → callers degrade to online-only
          this.migrationFailed = true;
          console.error('[OfflineStorage] Migration failed:', err);
          // Abort the transaction to prevent partial upgrades
          (event.target as IDBOpenDBRequest).transaction?.abort();
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.migrationFailed) {
      throw new Error('IndexedDB migration failed — operating online-only');
    }
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Check storage quota before writing. Returns false if there is insufficient free space.
   * Logs a warning when near STORAGE_WARN_THRESHOLD.
   */
  private async checkStorageQuota(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return true;

    try {
      const { usage = 0, quota = Infinity } = await navigator.storage.estimate();
      const free = quota - usage;

      if (usage > STORAGE_WARN_THRESHOLD) {
        console.warn(
          `[OfflineStorage] Storage usage ${Math.round(usage / 1024 / 1024)}MB exceeds warn threshold — consider purging old records`,
        );
      }

      if (free < STORAGE_MIN_FREE) {
        console.error(
          `[OfflineStorage] Insufficient free storage (${Math.round(free / 1024 / 1024)}MB free) — aborting write`,
        );
        return false;
      }
    } catch {
      // Quota API unavailable — proceed
    }

    return true;
  }

  /**
   * Purge synced records older than daysOld from the specified store.
   * Intended for periodic retention policy enforcement.
   * Initial defaults: journals 90 days, doseLogs 180 days, inventoryResponses 90 days.
   * IMPORTANT: These defaults require clinical review before production deployment.
   */
  async purgeOldSyncedRecords(
    storeName: string,
    daysOld: number,
    dateField: string = 'updated_at',
  ): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    let deleted = 0;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: any[] = req.result || [];
          for (const record of records) {
            if (record._syncStatus === 'synced' && record[dateField] && record[dateField] < cutoff) {
              store.delete(record.id);
              deleted++;
            }
          }
        };

        tx.oncomplete = () => resolve(deleted);
        tx.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  // ─── Journal operations ──────────────────────────────────────────────────────

  async saveJournal(journal: Journal): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(journal);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveJournals(journals: Journal[]): Promise<void> {
    if (!(await this.checkStorageQuota())) {
      throw new Error('Armazenamento insuficiente. Conecte-se para sincronizar.');
    }

    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const promises = journals.map((journal) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(journal);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getJournal(id: string): Promise<Journal | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllJournals(userId?: string): Promise<Journal[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (userId) {
        const index = store.index('user_id');
        request = index.getAll(userId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteJournal(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearJournals(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Sync queue operations ───────────────────────────────────────────────────

  async addToSyncQueue(item: Omit<SyncQueueItem, 'retries'>): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    const queueItem: SyncQueueItem = {
      ...item,
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(queueItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Search operations ───────────────────────────────────────────────────────

  async searchJournals(query: string, userId?: string): Promise<Journal[]> {
    const journals = await this.getAllJournals(userId);

    if (!query) return journals;

    const searchTerms = query.toLowerCase().split(' ');

    return journals.filter((journal) => {
      const searchableText = [
        journal.title,
        JSON.stringify(journal.content),
        journal.mood || '',
        ...(journal.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchTerms.every((term) => searchableText.includes(term));
    });
  }

  async getJournalsBySyncStatus(status: 'pending' | 'synced' | 'error'): Promise<Journal[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('_syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async batchUpdate(updates: Array<{ id: string; changes: Partial<Journal> }>): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const promises = updates.map(({ id, changes }) => {
      return new Promise<void>(async (resolve, reject) => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const journal = getRequest.result;
          if (journal) {
            const updated = { ...journal, ...changes };
            const putRequest = store.put(updated);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            resolve();
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    });

    await Promise.all(promises);
  }

  async exportData(): Promise<{ journals: Journal[]; syncQueue: SyncQueueItem[] }> {
    const journals = await this.getAllJournals();
    const syncQueue = await this.getSyncQueue();
    return { journals, syncQueue };
  }

  async importData(data: { journals: Journal[]; syncQueue: SyncQueueItem[] }): Promise<void> {
    await this.clearJournals();
    await this.clearSyncQueue();

    if (data.journals.length > 0) {
      await this.saveJournals(data.journals);
    }

    if (data.syncQueue.length > 0) {
      const db = await this.ensureDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);

      const promises = data.syncQueue.map((item) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      await Promise.all(promises);
    }
  }

  // ─── Inventory Response operations ───────────────────────────────────────────

  async saveInventoryResponse(
    response: InventoryResponse & { _syncStatus?: string },
  ): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readwrite');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put(response);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveInventoryResponses(
    responses: (InventoryResponse & { _syncStatus?: string })[],
  ): Promise<void> {
    if (!(await this.checkStorageQuota())) {
      throw new Error('Armazenamento insuficiente. Conecte-se para sincronizar.');
    }

    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readwrite');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);

    const promises = responses.map((response) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(response);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getInventoryResponse(
    id: string,
  ): Promise<(InventoryResponse & { _syncStatus?: string }) | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readonly');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllInventoryResponses(
    userId?: string,
  ): Promise<(InventoryResponse & { _syncStatus?: string })[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readonly');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (userId) {
        const index = store.index('user_id');
        request = index.getAll(userId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteInventoryResponse(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readwrite');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getInventoryResponsesByInventory(
    inventoryId: string,
  ): Promise<(InventoryResponse & { _syncStatus?: string })[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readonly');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);
    const index = store.index('inventory_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(inventoryId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getInventoryResponsesBySyncStatus(
    status: 'pending' | 'synced' | 'error',
  ): Promise<(InventoryResponse & { _syncStatus?: string })[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([INVENTORY_RESPONSES_STORE], 'readonly');
    const store = transaction.objectStore(INVENTORY_RESPONSES_STORE);
    const index = store.index('_syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Medication operations ───────────────────────────────────────────────────

  async saveMedication(medication: OfflineMedication): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MEDICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(MEDICATIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put(medication);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveMedications(medications: OfflineMedication[]): Promise<void> {
    if (!(await this.checkStorageQuota())) {
      throw new Error('Armazenamento insuficiente. Conecte-se para sincronizar.');
    }

    const db = await this.ensureDB();
    const transaction = db.transaction([MEDICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(MEDICATIONS_STORE);

    const promises = medications.map((med) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(med);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getMedication(id: string): Promise<OfflineMedication | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MEDICATIONS_STORE], 'readonly');
    const store = transaction.objectStore(MEDICATIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMedications(userId?: string): Promise<OfflineMedication[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MEDICATIONS_STORE], 'readonly');
    const store = transaction.objectStore(MEDICATIONS_STORE);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (userId) {
        const index = store.index('user_id');
        request = index.getAll(userId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMedication(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MEDICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(MEDICATIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMedicationsBySyncStatus(
    status: 'pending' | 'synced' | 'error',
  ): Promise<OfflineMedication[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MEDICATIONS_STORE], 'readonly');
    const store = transaction.objectStore(MEDICATIONS_STORE);
    const index = store.index('_syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Dose Log operations ─────────────────────────────────────────────────────

  async saveDoseLog(log: OfflineDoseLog): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOSE_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(DOSE_LOGS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveDoseLogs(logs: OfflineDoseLog[]): Promise<void> {
    if (!(await this.checkStorageQuota())) {
      throw new Error('Armazenamento insuficiente. Conecte-se para sincronizar.');
    }

    const db = await this.ensureDB();
    const transaction = db.transaction([DOSE_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(DOSE_LOGS_STORE);

    const promises = logs.map((log) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(log);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getDoseLog(id: string): Promise<OfflineDoseLog | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOSE_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(DOSE_LOGS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDoseLogs(medicationId?: string): Promise<OfflineDoseLog[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOSE_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(DOSE_LOGS_STORE);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (medicationId) {
        const index = store.index('medication_id');
        request = index.getAll(medicationId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDoseLog(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOSE_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(DOSE_LOGS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDoseLogsBySyncStatus(
    status: 'pending' | 'synced' | 'error',
  ): Promise<OfflineDoseLog[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOSE_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(DOSE_LOGS_STORE);
    const index = store.index('_syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Global operations ───────────────────────────────────────────────────────

  // Clear all stores in a single transaction (used during logout)
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const storeNames = [
      STORE_NAME,
      SYNC_QUEUE_STORE,
      INVENTORY_RESPONSES_STORE,
      MEDICATIONS_STORE,
      DOSE_LOGS_STORE,
    ];
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      storeNames.forEach((name) => {
        // Only clear stores that exist (graceful degradation)
        if (db.objectStoreNames.contains(name)) {
          transaction.objectStore(name).clear();
        }
      });
    });
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorageService();
