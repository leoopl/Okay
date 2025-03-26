import { useApiClient } from '@/lib/api-client';

// Journal entry types
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalEntryDto {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
}

export interface UpdateJournalEntryDto {
  title?: string;
  content?: string;
  mood?: string;
  tags?: string[];
}

/**
 * Hook for managing journal entries securely
 * Uses authenticated API client to make requests to the backend
 */
export const useJournalService = () => {
  const api = useApiClient();

  /**
   * Fetch all journal entries for the current user
   */
  const getEntries = async (): Promise<JournalEntry[]> => {
    return api.get('/journal');
  };

  /**
   * Fetch a specific journal entry by ID
   */
  const getEntry = async (id: string): Promise<JournalEntry> => {
    return api.get(`/journal/${id}`);
  };

  /**
   * Create a new journal entry
   */
  const createEntry = async (data: CreateJournalEntryDto): Promise<JournalEntry> => {
    return api.post('/journal', data);
  };

  /**
   * Update an existing journal entry
   */
  const updateEntry = async (id: string, data: UpdateJournalEntryDto): Promise<JournalEntry> => {
    return api.patch(`/journal/${id}`, data);
  };

  /**
   * Delete a journal entry
   */
  const deleteEntry = async (id: string): Promise<void> => {
    return api.delete(`/journal/${id}`);
  };

  return {
    getEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};
