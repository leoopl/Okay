import { ApiClient } from '@/lib/api-client';

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
  /**
   * Fetch all journal entries for the current user
   */
  const getEntries = async (): Promise<JournalEntry[]> => {
    return ApiClient.get('/journal');
  };

  /**
   * Fetch a specific journal entry by ID
   */
  const getEntry = async (id: string): Promise<JournalEntry> => {
    return ApiClient.get(`/journal/${id}`);
  };

  /**
   * Create a new journal entry
   */
  const createEntry = async (data: CreateJournalEntryDto): Promise<JournalEntry> => {
    return ApiClient.post('/journal', data);
  };

  /**
   * Update an existing journal entry
   */
  const updateEntry = async (id: string, data: UpdateJournalEntryDto): Promise<JournalEntry> => {
    return ApiClient.patch(`/journal/${id}`, data);
  };

  /**
   * Delete a journal entry
   */
  const deleteEntry = async (id: string): Promise<void> => {
    return ApiClient.delete(`/journal/${id}`);
  };

  return {
    getEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};
