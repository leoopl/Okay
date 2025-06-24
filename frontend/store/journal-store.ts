import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from '@/lib/actions/supabase-journal';
import type { Database } from '@/lib/supabase/types';

// Frontend-compatible Journal type
export type Journal = {
  id: string;
  user_id: string;
  title: string;
  content: any; // TipTap JSON content
  mood?: string; // Convert null to undefined for frontend compatibility
  tags: string[];
  is_content_encrypted: boolean;
  created_at: string;
  updated_at: string;
};

// Supabase database type
type SupabaseJournalEntry = Database['public']['Tables']['journal_entries']['Row'];

// Mapper functions to convert between types
function mapSupabaseToFrontend(supabaseEntry: SupabaseJournalEntry): Journal {
  return {
    id: supabaseEntry.id,
    user_id: supabaseEntry.user_id,
    title: supabaseEntry.title,
    content: supabaseEntry.content,
    mood: supabaseEntry.mood || undefined, // Convert null to undefined
    tags: supabaseEntry.tags,
    is_content_encrypted: supabaseEntry.is_content_encrypted,
    created_at: supabaseEntry.created_at,
    updated_at: supabaseEntry.updated_at,
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
  error: string | null;

  // Actions
  getAllJournals: () => Promise<void>;
  getJournalById: (id: string) => Promise<Journal | null>;
  createJournal: (data?: Partial<CreateJournalDto>) => Promise<Journal>;
  updateJournal: (id: string, data: UpdateJournalDto) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
  setCurrentEntry: (entry: Journal | null) => void;
  clearError: () => void;

  // Local state helpers
  updateEntry: (id: string, updates: Partial<Journal>) => void;
  addEntry: (entry: Journal) => void;
  removeEntry: (id: string) => void;
}

export const useJournalStore = create<JournalState>()(
  devtools(
    subscribeWithSelector(
      immer<JournalState>((set, get) => ({
        // Initial state
        entries: [],
        currentEntry: null,
        isLoading: false,
        error: null,

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
                state.entries = mapArraySupabaseToFrontend(
                  result.entries as SupabaseJournalEntry[],
                );
                state.isLoading = false;
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

        // Create a new journal entry
        createJournal: async (data = {}): Promise<Journal> => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const defaultContent = JSON.stringify({
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: null },
                  content: [{ type: 'text', text: 'Start writing...' }],
                },
              ],
            });

            const result = await createJournalEntry(
              data.title || 'Give your thoughts a title...',
              data.content || defaultContent,
              data.mood as any,
              data.tags,
              false, // encrypt = false for now
            );

            if (result.success && result.entry) {
              const newEntry = mapSupabaseToFrontend(result.entry as SupabaseJournalEntry);
              set((state) => {
                state.entries.unshift(newEntry);
                state.currentEntry = newEntry;
                state.isLoading = false;
              });
              return newEntry;
            } else {
              set((state) => {
                state.error = result.error || 'Failed to create journal';
                state.isLoading = false;
              });
              throw new Error(result.error || 'Failed to create journal');
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to create journal';
              state.isLoading = false;
            });
            throw error;
          }
        },

        // Update an existing journal entry
        updateJournal: async (id: string, data: UpdateJournalDto) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const result = await updateJournalEntry(
              id,
              data.title,
              data.content,
              data.mood as any,
              data.tags,
              false, // encrypt = false for now
            );

            if (result.success && result.entry) {
              const updatedEntry = mapSupabaseToFrontend(result.entry as SupabaseJournalEntry);
              set((state) => {
                // Update in entries array
                const index = state.entries.findIndex((entry: Journal) => entry.id === id);
                if (index !== -1) {
                  state.entries[index] = updatedEntry;
                }

                // Update current entry if it's the same
                if (state.currentEntry?.id === id) {
                  state.currentEntry = updatedEntry;
                }

                state.isLoading = false;
              });
            } else {
              set((state) => {
                state.error = result.error || 'Failed to update journal';
                state.isLoading = false;
              });
              throw new Error(result.error || 'Failed to update journal');
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update journal';
              state.isLoading = false;
            });
            throw error;
          }
        },

        // Delete a journal entry
        deleteJournal: async (id: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const result = await deleteJournalEntry(id);
            if (result.success) {
              set((state) => {
                state.entries = state.entries.filter((entry: Journal) => entry.id !== id);
                if (state.currentEntry?.id === id) {
                  state.currentEntry = null;
                }
                state.isLoading = false;
              });
            } else {
              set((state) => {
                state.error = result.error || 'Failed to delete journal';
                state.isLoading = false;
              });
              throw new Error(result.error || 'Failed to delete journal');
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete journal';
              state.isLoading = false;
            });
            throw error;
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

        // Local state helpers (for optimistic updates)
        updateEntry: (id: string, updates: Partial<Journal>) => {
          set((state) => {
            const index = state.entries.findIndex((entry) => entry.id === id);
            if (index !== -1) {
              state.entries[index] = { ...state.entries[index], ...updates };
            }
            if (state.currentEntry?.id === id) {
              state.currentEntry = { ...state.currentEntry, ...updates };
            }
          });
        },

        addEntry: (entry: Journal) => {
          set((state) => {
            state.entries.unshift(entry);
          });
        },

        removeEntry: (id: string) => {
          set((state) => {
            state.entries = state.entries.filter((entry) => entry.id !== id);
            if (state.currentEntry?.id === id) {
              state.currentEntry = null;
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
