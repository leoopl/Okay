/**
 * Journal Store - Zustand state management for journal entries
 * Handles CRUD operations and local state management
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import * as journalService from '@/services/journal-service';
import type { Journal, CreateJournalDto, UpdateJournalDto } from '@/services/journal-service';

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
      immer((set, get) => ({
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
            const entries = await journalService.getAllJournals();
            set((state) => {
              state.entries = entries;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to fetch journals';
              state.isLoading = false;
            });
          }
        },

        // Fetch a specific journal entry
        getJournalById: async (id: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const entry = await journalService.getJournalById(id);
            set((state) => {
              state.currentEntry = entry;
              state.isLoading = false;
            });
            return entry;
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
        createJournal: async (data = {}) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const newEntry = await journalService.createJournal({
              title: 'New Journal Entry',
              content:
                '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Start writing..."}]}]}',
              tags: [],
              mood: '',
              ...data,
            });

            set((state) => {
              state.entries.unshift(newEntry);
              state.currentEntry = newEntry;
              state.isLoading = false;
            });

            return newEntry;
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
            const updatedEntry = await journalService.updateJournal(id, data);

            set((state) => {
              // Update in entries array
              const index = state.entries.findIndex((entry) => entry.id === id);
              if (index !== -1) {
                state.entries[index] = updatedEntry;
              }

              // Update current entry if it's the same
              if (state.currentEntry?.id === id) {
                state.currentEntry = updatedEntry;
              }

              state.isLoading = false;
            });
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
            await journalService.deleteJournal(id);

            set((state) => {
              state.entries = state.entries.filter((entry) => entry.id !== id);
              if (state.currentEntry?.id === id) {
                state.currentEntry = null;
              }
              state.isLoading = false;
            });
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
              Object.assign(state.entries[index], updates);
            }

            if (state.currentEntry?.id === id) {
              Object.assign(state.currentEntry, updates);
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
      {
        name: 'journal-store',
      },
    ),
  ),
);

// Selector hooks for optimized re-renders
export const useJournalEntries = () => useJournalStore((state) => state.entries);
export const useCurrentJournalEntry = () => useJournalStore((state) => state.currentEntry);
export const useJournalLoading = () => useJournalStore((state) => state.isLoading);
export const useJournalError = () => useJournalStore((state) => state.error);
