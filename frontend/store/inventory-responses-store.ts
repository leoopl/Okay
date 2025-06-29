import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { InventoryResponse } from '@/lib/actions/supabase-inventories';

export type SyncStatus = 'pending' | 'synced' | 'error';

interface InventoryResponsesState {
  // Data
  responses: Map<string, InventoryResponse>;
  syncStatus: Map<string, SyncStatus>;
  pendingDeletes: Set<string>;

  // UI state
  isInitialized: boolean;

  // Actions
  addResponse: (response: InventoryResponse) => void;
  updateResponse: (id: string, updates: Partial<InventoryResponse>) => void;
  removeResponse: (id: string) => void;
  setResponses: (responses: InventoryResponse[]) => void;
  setSyncStatus: (id: string, status: SyncStatus) => void;
  addPendingDelete: (id: string) => void;
  removePendingDelete: (id: string) => void;
  getResponse: (id: string) => InventoryResponse | undefined;
  getAllResponses: () => InventoryResponse[];
  getResponsesBySyncStatus: (status: SyncStatus) => InventoryResponse[];
  setInitialized: (initialized: boolean) => void;
  resetStore: () => void;
}

const initialState = {
  responses: new Map<string, InventoryResponse>(),
  syncStatus: new Map<string, SyncStatus>(),
  pendingDeletes: new Set<string>(),
  isInitialized: false,
};

export const useInventoryResponsesStore = create<InventoryResponsesState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addResponse: (response) =>
        set((state) => {
          const newResponses = new Map(state.responses);
          newResponses.set(response.id, response);

          const newSyncStatus = new Map(state.syncStatus);
          if (!newSyncStatus.has(response.id)) {
            newSyncStatus.set(response.id, 'synced');
          }

          return {
            responses: newResponses,
            syncStatus: newSyncStatus,
          };
        }),

      updateResponse: (id, updates) =>
        set((state) => {
          const response = state.responses.get(id);
          if (!response) return state;

          const newResponses = new Map(state.responses);
          newResponses.set(id, { ...response, ...updates });

          const newSyncStatus = new Map(state.syncStatus);
          newSyncStatus.set(id, 'pending');

          return {
            responses: newResponses,
            syncStatus: newSyncStatus,
          };
        }),

      removeResponse: (id) =>
        set((state) => {
          const newResponses = new Map(state.responses);
          newResponses.delete(id);

          const newSyncStatus = new Map(state.syncStatus);
          newSyncStatus.delete(id);

          const newPendingDeletes = new Set(state.pendingDeletes);
          newPendingDeletes.delete(id);

          return {
            responses: newResponses,
            syncStatus: newSyncStatus,
            pendingDeletes: newPendingDeletes,
          };
        }),

      setResponses: (responses) =>
        set(() => {
          const newResponses = new Map<string, InventoryResponse>();
          const newSyncStatus = new Map<string, SyncStatus>();

          responses.forEach((response) => {
            newResponses.set(response.id, response);
            newSyncStatus.set(response.id, 'synced');
          });

          return {
            responses: newResponses,
            syncStatus: newSyncStatus,
          };
        }),

      setSyncStatus: (id, status) =>
        set((state) => {
          const newSyncStatus = new Map(state.syncStatus);
          newSyncStatus.set(id, status);
          return { syncStatus: newSyncStatus };
        }),

      addPendingDelete: (id) =>
        set((state) => {
          const newPendingDeletes = new Set(state.pendingDeletes);
          newPendingDeletes.add(id);

          const newSyncStatus = new Map(state.syncStatus);
          newSyncStatus.set(id, 'pending');

          return {
            pendingDeletes: newPendingDeletes,
            syncStatus: newSyncStatus,
          };
        }),

      removePendingDelete: (id) =>
        set((state) => {
          const newPendingDeletes = new Set(state.pendingDeletes);
          newPendingDeletes.delete(id);
          return { pendingDeletes: newPendingDeletes };
        }),

      getResponse: (id) => get().responses.get(id),

      getAllResponses: () => Array.from(get().responses.values()),

      getResponsesBySyncStatus: (status) => {
        const state = get();
        return Array.from(state.responses.values()).filter(
          (response) => state.syncStatus.get(response.id) === status,
        );
      },

      setInitialized: (isInitialized) => set({ isInitialized }),

      resetStore: () => set(initialState),
    }),
    { name: 'inventory-responses-store' },
  ),
);

// Selectors for easier access
export const useInventoryResponses = () =>
  useInventoryResponsesStore((state) => state.getAllResponses());

export const usePendingInventoryResponses = () =>
  useInventoryResponsesStore((state) => state.getResponsesBySyncStatus('pending'));

export const useInventoryResponseById = (id: string) =>
  useInventoryResponsesStore((state) => state.getResponse(id));
