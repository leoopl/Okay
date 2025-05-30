import { ApiClient, ApiError } from '@/lib/api-client';

export interface Journal {
  id: string;
  title: string;
  content: string; // JSON string from TipTap editor
  tags: string[];
  mood?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJournalDto {
  title: string;
  content: string;
  tags: string[];
  mood?: string;
}

export interface UpdateJournalDto {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: string;
}

/**
 * Fetch all journals for the authenticated user
 */
export async function getAllJournals(): Promise<Journal[]> {
  try {
    // Backend returns array of journals directly
    const response = await ApiClient.get<Journal[]>('/journals');

    // Transform dates from strings to Date objects
    return response.map(transformJournalDates);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Error fetching journals:', error);
    throw new ApiError('Unable to fetch journals. Please try again.');
  }
}

/**
 * Fetch a specific journal by ID
 */
export async function getJournalById(id: string): Promise<Journal> {
  if (!id) {
    throw new ApiError('Journal ID is required');
  }

  try {
    // Backend returns journal entry directly
    const response = await ApiClient.get<Journal>(`/journals/${id}`);
    return transformJournalDates(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Error fetching journal:', error);
    throw new ApiError('Unable to fetch journal. Please try again.');
  }
}

/**
 * Create a new journal entry
 */
export async function createJournal(data: CreateJournalDto): Promise<Journal> {
  // Validate required fields
  if (!data.title?.trim()) {
    throw new ApiError('Journal title is required');
  }

  if (!data.content?.trim()) {
    throw new ApiError('Journal content is required');
  }

  try {
    // Prepare the request payload
    const payload: any = {
      title: data.title.trim(),
      content: data.content,
      tags: data.tags || [],
    };

    // Only include mood if it has a valid value
    if (data.mood && data.mood.trim()) {
      payload.mood = data.mood;
    }

    // Backend returns journal entry directly
    const response = await ApiClient.post<Journal>('/journals', payload);
    return transformJournalDates(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Error creating journal:', error);
    throw new ApiError('Unable to create journal. Please try again.');
  }
}

/**
 * Update an existing journal entry
 */
export async function updateJournal(id: string, data: UpdateJournalDto): Promise<Journal> {
  if (!id) {
    throw new ApiError('Journal ID is required');
  }

  // Validate at least one field is being updated
  if (!data.title && !data.content && !data.tags && data.mood === undefined) {
    throw new ApiError('At least one field must be updated');
  }

  try {
    // Prepare update data, only including defined fields
    const updateData: any = {};

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }
    // Only include mood if it has a valid value
    if (data.mood !== undefined) {
      if (data.mood && data.mood.trim()) {
        updateData.mood = data.mood;
      }
      // If mood is explicitly set to empty string, don't include it to clear the field
    }

    // Backend returns journal entry directly
    const response = await ApiClient.patch<Journal>(`/journals/${id}`, updateData);
    return transformJournalDates(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Error updating journal:', error);
    throw new ApiError('Unable to update journal. Please try again.');
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournal(id: string): Promise<void> {
  if (!id) {
    throw new ApiError('Journal ID is required');
  }

  try {
    // Backend returns nothing (204 No Content)
    await ApiClient.delete(`/journals/${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Error deleting journal:', error);
    throw new ApiError('Unable to delete journal. Please try again.');
  }
}

/**
 * Helper function to transform date strings to Date objects
 */
function transformJournalDates(journal: any): Journal {
  return {
    ...journal,
    createdAt: new Date(journal.createdAt),
    updatedAt: new Date(journal.updatedAt),
  };
}

/**
 * Validate TipTap JSON content
 */
export function validateTipTapContent(content: string): boolean {
  if (!content) return false;

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && parsed.type === 'doc';
  } catch {
    return false;
  }
}

/**
 * Create default TipTap content
 */
export function createDefaultTipTapContent(): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign: null },
        content: [
          {
            type: 'text',
            text: 'Start writing your thoughts...',
          },
        ],
      },
    ],
  });
}

/**
 * Extract plain text from TipTap JSON content for preview
 */
export function extractTextFromTipTapContent(content: string, maxLength: number = 100): string {
  if (!content) return '';

  try {
    const parsed = JSON.parse(content);

    function extractText(node: any): string {
      if (!node) return '';

      if (node.type === 'text') {
        return node.text || '';
      }

      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }

      return '';
    }

    const fullText = extractText(parsed);
    return fullText.length > maxLength ? fullText.substring(0, maxLength) + '...' : fullText;
  } catch {
    return content.substring(0, maxLength);
  }
}
