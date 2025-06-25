import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  searchJournalEntries,
} from '@/lib/actions/supabase-journal';
import { Database } from '@/lib/supabase/database.types';

// Frontend-compatible Journal type
export type Journal = {
  id: string;
  user_id: string;
  title: string;
  content: any; // TipTap JSON content
  mood?: string;
  tags: string[];
  is_content_encrypted: boolean;
  created_at: string;
  updated_at: string;
  // Optimistic update tracking
  _optimistic?: boolean;
  _syncStatus?: 'pending' | 'synced' | 'error';
};

// Supabase database type
type SupabaseJournalEntry = Database['public']['Tables']['journal_entries']['Row'];

// Search filters
export interface JournalSearchFilters {
  query?: string;
  mood?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
}

// Mapper functions
function mapSupabaseToFrontend(supabaseEntry: SupabaseJournalEntry): Journal {
  return {
    id: supabaseEntry.id,
    user_id: supabaseEntry.user_id,
    title: supabaseEntry.title,
    content: supabaseEntry.content,
    mood: supabaseEntry.mood || undefined,
    tags: supabaseEntry.tags || [],
    is_content_encrypted: supabaseEntry.is_content_encrypted,
    created_at: supabaseEntry.created_at,
    updated_at: supabaseEntry.updated_at,
    _syncStatus: 'synced',
  };
}

function mapArraySupabaseToFrontend(supabaseEntries: SupabaseJournalEntry[]): Journal[] {
  return supabaseEntries.map(mapSupabaseToFrontend);
}

interface CreateJournalDto {
  title: string;
  content: string;
  tags?: string[];
  mood?: string;
}

interface UpdateJournalDto {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: string;
}

interface JournalState {
  // State
  entries: Journal[];
  currentEntry: Journal | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSync: Date | null;
  searchFilters: JournalSearchFilters;

  // Actions
  getAllJournals: () => Promise<void>;
  getJournalById: (id: string) => Promise<Journal | null>;
  createJournal: (data?: Partial<CreateJournalDto>) => Promise<Journal>;
  updateJournal: (id: string, data: UpdateJournalDto) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
  searchJournals: (filters: JournalSearchFilters) => Promise<void>;
  setCurrentEntry: (entry: Journal | null) => void;
  clearError: () => void;
  setSearchFilters: (filters: JournalSearchFilters) => void;

  // Optimistic update helpers
  optimisticUpdate: (id: string, updates: Partial<Journal>) => void;
  optimisticCreate: (tempId: string, entry: Omit<Journal, 'id'>) => void;
  optimisticDelete: (id: string) => void;
  revertOptimisticUpdate: (id: string, originalData?: Journal) => void;

  // Sync helpers
  syncPendingChanges: () => Promise<void>;
  markAsSynced: (id: string) => void;
  markAsError: (id: string) => void;
}

export const useJournalStore = create<JournalState>()(
  devtools(
    subscribeWithSelector(
      immer<JournalState>((set, get) => ({
        // Initial state
        entries: [],
        currentEntry: null,
        isLoading: false,
        isSyncing: false,
        error: null,
        lastSync: null,
        searchFilters: {},

        // Fetch all journal entries
        getAllJournals: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const result = await getJournalEntries();
            if (result.success && result.entries) {
              set((state) => {
                // Preserve optimistic updates
                const optimisticEntries = state.entries.filter((e) => e._optimistic);
                const serverEntries = mapArraySupabaseToFrontend(
                  result.entries as SupabaseJournalEntry[],
                );

                // Merge optimistic and server entries
                const mergedEntries = [...optimisticEntries];
                serverEntries.forEach((serverEntry) => {
                  if (!mergedEntries.find((e) => e.id === serverEntry.id)) {
                    mergedEntries.push(serverEntry);
                  }
                });

                state.entries = mergedEntries;
                state.isLoading = false;
                state.lastSync = new Date();
              });
            } else {
              set((state) => {
                state.error = result.error || 'Failed to fetch journals';
                state.isLoading = false;
              });
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to fetch journals';
              state.isLoading = false;
            });
          }
        },

        // Fetch a specific journal entry
        getJournalById: async (id: string): Promise<Journal | null> => {
          // Check if we have it locally first
          const localEntry = get().entries.find((e) => e.id === id);
          if (localEntry && localEntry._syncStatus === 'synced') {
            set((state) => {
              state.currentEntry = localEntry;
            });
            return localEntry;
          }

          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const result = await getJournalEntry(id);
            if (result.success && result.entry) {
              const mappedEntry = mapSupabaseToFrontend(result.entry as SupabaseJournalEntry);
              set((state) => {
                state.currentEntry = mappedEntry;
                // Update in entries array
                const index = state.entries.findIndex((entry) => entry.id === id);
                if (index !== -1) {
                  state.entries[index] = mappedEntry;
                } else {
                  state.entries.push(mappedEntry);
                }
                state.isLoading = false;
              });
              return mappedEntry;
            } else {
              set((state) => {
                state.error = result.error || 'Failed to fetch journal';
                state.isLoading = false;
                state.currentEntry = null;
              });
              return null;
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to fetch journal';
              state.isLoading = false;
              state.currentEntry = null;
            });
            return null;
          }
        },

        // Create a new journal entry with optimistic update
        createJournal: async (data = {}): Promise<Journal> => {
          const tempId = `temp_${Date.now()}`;
          const tempEntry: Journal = {
            id: tempId,
            user_id: '', // Will be filled by server
            title: data.title || 'Give your thoughts a title...',
            content:
              data.content ||
              JSON.stringify({
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: null },
                    content: [{ type: 'text', text: 'Start writing...' }],
                  },
                ],
              }),
            mood: data.mood,
            tags: data.tags || [],
            is_content_encrypted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _optimistic: true,
            _syncStatus: 'pending',
          };

          // Optimistic update
          get().optimisticCreate(tempId, tempEntry);

          try {
            const result = await createJournalEntry(
              tempEntry.title,
              tempEntry.content,
              tempEntry.mood as any,
              tempEntry.tags,
              false,
            );

            if (result.success && result.entry) {
              const newEntry = mapSupabaseToFrontend(result.entry as SupabaseJournalEntry);
              set((state) => {
                // Replace temp entry with real entry
                const index = state.entries.findIndex((e) => e.id === tempId);
                if (index !== -1) {
                  state.entries[index] = newEntry;
                }
                state.currentEntry = newEntry;
              });
              return newEntry;
            } else {
              // Revert optimistic update on error
              get().revertOptimisticUpdate(tempId);
              throw new Error(result.error || 'Failed to create journal');
            }
          } catch (error) {
            get().revertOptimisticUpdate(tempId);
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to create journal';
            });
            throw error;
          }
        },

        // Update an existing journal entry with optimistic update
        updateJournal: async (id: string, data: UpdateJournalDto) => {
          // Store original for rollback
          const original = get().entries.find((e) => e.id === id);

          // Optimistic update
          get().optimisticUpdate(id, { ...data, _syncStatus: 'pending' });

          try {
            const result = await updateJournalEntry(
              id,
              data.title,
              data.content,
              data.mood as any,
              data.tags,
              false,
            );

            if (result.success && result.entry) {
              const updatedEntry = mapSupabaseToFrontend(result.entry as SupabaseJournalEntry);
              set((state) => {
                const index = state.entries.findIndex((entry) => entry.id === id);
                if (index !== -1) {
                  state.entries[index] = updatedEntry;
                }
                if (state.currentEntry?.id === id) {
                  state.currentEntry = updatedEntry;
                }
              });
            } else {
              // Revert on error
              if (original) {
                get().revertOptimisticUpdate(id, original);
              }
              throw new Error(result.error || 'Failed to update journal');
            }
          } catch (error) {
            if (original) {
              get().revertOptimisticUpdate(id, original);
            }
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update journal';
            });
            throw error;
          }
        },

        // Delete a journal entry with optimistic update
        deleteJournal: async (id: string) => {
          // Store original for rollback
          const original = get().entries.find((e) => e.id === id);

          // Optimistic delete
          get().optimisticDelete(id);

          try {
            const result = await deleteJournalEntry(id);
            if (!result.success) {
              // Revert on error
              if (original) {
                set((state) => {
                  state.entries.push(original);
                });
              }
              throw new Error(result.error || 'Failed to delete journal');
            }
          } catch (error) {
            if (original) {
              set((state) => {
                state.entries.push(original);
              });
            }
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete journal';
            });
            throw error;
          }
        },

        // Search journals
        searchJournals: async (filters: JournalSearchFilters) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
            state.searchFilters = filters;
          });

          try {
            const result = await searchJournalEntries(filters);
            if (result.success && result.entries) {
              set((state) => {
                state.entries = mapArraySupabaseToFrontend(
                  result.entries as SupabaseJournalEntry[],
                );
                state.isLoading = false;
              });
            } else {
              set((state) => {
                state.error = result.error || 'Failed to search journals';
                state.isLoading = false;
              });
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to search journals';
              state.isLoading = false;
            });
          }
        },

        // Set current entry
        setCurrentEntry: (entry: Journal | null) => {
          set((state) => {
            state.currentEntry = entry;
          });
        },

        // Clear error
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        // Set search filters
        setSearchFilters: (filters: JournalSearchFilters) => {
          set((state) => {
            state.searchFilters = filters;
          });
        },

        // Optimistic update helpers
        optimisticUpdate: (id: string, updates: Partial<Journal>) => {
          set((state) => {
            const index = state.entries.findIndex((e) => e.id === id);
            if (index !== -1) {
              state.entries[index] = {
                ...state.entries[index],
                ...updates,
                updated_at: new Date().toISOString(),
              };
            }
            if (state.currentEntry?.id === id) {
              state.currentEntry = {
                ...state.currentEntry,
                ...updates,
                updated_at: new Date().toISOString(),
              };
            }
          });
        },

        optimisticCreate: (tempId: string, entry: Omit<Journal, 'id'>) => {
          set((state) => {
            state.entries.unshift({ ...entry, id: tempId } as Journal);
          });
        },

        optimisticDelete: (id: string) => {
          set((state) => {
            state.entries = state.entries.filter((e) => e.id !== id);
            if (state.currentEntry?.id === id) {
              state.currentEntry = null;
            }
          });
        },

        revertOptimisticUpdate: (id: string, originalData?: Journal) => {
          set((state) => {
            if (originalData) {
              const index = state.entries.findIndex((e) => e.id === id);
              if (index !== -1) {
                state.entries[index] = originalData;
              }
            } else {
              // Remove if no original data (was a create operation)
              state.entries = state.entries.filter((e) => e.id !== id);
            }
          });
        },

        // Sync helpers
        syncPendingChanges: async () => {
          const pendingEntries = get().entries.filter((e) => e._syncStatus === 'pending');
          if (pendingEntries.length === 0) return;

          set((state) => {
            state.isSyncing = true;
          });

          for (const entry of pendingEntries) {
            try {
              if (entry._optimistic) {
                // This was a create operation
                await get().createJournal({
                  title: entry.title,
                  content: entry.content,
                  tags: entry.tags,
                  mood: entry.mood,
                });
              } else {
                // This was an update operation
                await get().updateJournal(entry.id, {
                  title: entry.title,
                  content: entry.content,
                  tags: entry.tags,
                  mood: entry.mood,
                });
              }
              get().markAsSynced(entry.id);
            } catch (error) {
              get().markAsError(entry.id);
            }
          }

          set((state) => {
            state.isSyncing = false;
          });
        },

        markAsSynced: (id: string) => {
          set((state) => {
            const index = state.entries.findIndex((e) => e.id === id);
            if (index !== -1) {
              state.entries[index]._syncStatus = 'synced';
              state.entries[index]._optimistic = false;
            }
          });
        },

        markAsError: (id: string) => {
          set((state) => {
            const index = state.entries.findIndex((e) => e.id === id);
            if (index !== -1) {
              state.entries[index]._syncStatus = 'error';
            }
          });
        },
      })),
    ),
    { name: 'journal-store' },
  ),
);

// Selectors for easier access
export const useJournalEntries = () => useJournalStore((state) => state.entries);
export const useCurrentJournalEntry = () => useJournalStore((state) => state.currentEntry);
export const useJournalLoading = () => useJournalStore((state) => state.isLoading);
export const useJournalError = () => useJournalStore((state) => state.error);
export const useJournalSync = () =>
  useJournalStore((state) => ({
    isSyncing: state.isSyncing,
    lastSync: state.lastSync,
    syncPendingChanges: state.syncPendingChanges,
  }));
