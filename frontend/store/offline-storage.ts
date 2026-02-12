import { Journal } from '@/store/journal-store';
import type { InventoryResponse } from '@/lib/actions/supabase-inventories';

const DB_NAME = 'OkayJournalDB';
const DB_VERSION = 2; // Increment version for schema change
const STORE_NAME = 'journals';
const SYNC_QUEUE_STORE = 'syncQueue';
const INVENTORY_RESPONSES_STORE = 'inventoryResponses';

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create journals store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const journalStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          journalStore.createIndex('user_id', 'user_id', { unique: false });
          journalStore.createIndex('created_at', 'created_at', { unique: false });
          journalStore.createIndex('updated_at', 'updated_at', { unique: false });
          journalStore.createIndex('_syncStatus', '_syncStatus', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('action', 'action', { unique: false });
        }

        // Create inventory responses store
        if (!db.objectStoreNames.contains(INVENTORY_RESPONSES_STORE)) {
          const inventoryStore = db.createObjectStore(INVENTORY_RESPONSES_STORE, { keyPath: 'id' });
          inventoryStore.createIndex('user_id', 'user_id', { unique: false });
          inventoryStore.createIndex('inventory_id', 'inventory_id', { unique: false });
          inventoryStore.createIndex('completed_at', 'completed_at', { unique: false });
          inventoryStore.createIndex('_syncStatus', '_syncStatus', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  // Journal operations
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

  // Sync queue operations
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

  // Search operations
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

  // Get journals by sync status
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

  // Batch operations
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
            resolve(); // Skip if not found
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    });

    await Promise.all(promises);
  }

  // Export/Import for backup
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

  // Inventory Response operations
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

  // Clear all stores in a single transaction (used during logout)
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_NAME, SYNC_QUEUE_STORE, INVENTORY_RESPONSES_STORE],
        'readwrite',
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(SYNC_QUEUE_STORE).clear();
      transaction.objectStore(INVENTORY_RESPONSES_STORE).clear();
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
