'use server';

import { revalidatePath } from 'next/cache';
import { createClient, logAuditTrail } from '@/lib/supabase/server';
import { getRequestMetadata } from '@/lib/actions/supabase-auth';
import type { Database } from '@/lib/supabase/database.types';
import { JournalSearchFilters } from '@/store/journal-store';
import { JournalError, JournalErrorType, getErrorType } from '@/components/journal/journal-utils';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
type JournalInsert = Database['public']['Tables']['journal_entries']['Insert'];
type JournalUpdate = Database['public']['Tables']['journal_entries']['Update'];
type JournalMood = Database['public']['Enums']['journal_mood'];

export interface JournalActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  entry?: JournalEntry;
  entries?: JournalEntry[];
}

export async function createJournalEntry(
  title: string,
  content: string, // TipTap JSON content
  mood?: JournalMood,
  tags?: string[],
  encrypt: boolean = false,
): Promise<JournalActionResponse> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para criar uma entrada no diário',
        false,
      );
    }

    // Validate input
    if (!title?.trim() || title.length > 200) {
      throw new JournalError(
        JournalErrorType.VALIDATION_ERROR,
        'Título deve ter entre 1 e 200 caracteres',
        false,
      );
    }

    // Prepare entry data
    const entryContent = content;
    const isEncrypted = false;

    // TODO: Implement encryption when needed
    if (encrypt) {
      // entryContent = await encrypt(content);
      // isEncrypted = true;
    }

    const entryData: JournalInsert = {
      user_id: user.id,
      title: title.trim(),
      content: entryContent,
      mood: mood || null,
      tags: tags || [],
      is_content_encrypted: isEncrypted,
    };

    // Insert journal entry
    const { data, error } = await supabase
      .from('journal_entries')
      .insert(entryData)
      .select()
      .single();

    if (error) {
      console.error('Error creating journal entry:', error);
      throw new JournalError(
        getErrorType(error),
        'Erro ao criar entrada no diário',
        getErrorType(error) === JournalErrorType.NETWORK_ERROR,
        error,
      );
    }

    // Log audit trail
    await logAuditTrail({
      action: 'create',
      resource: 'journal_entries',
      resourceId: data.id,
      details: { title: data.title, tags: data.tags, mood: data.mood },
      ipAddress,
      userAgent,
    });

    revalidatePath('/journal');
    return {
      success: true,
      message: 'Entrada criada com sucesso',
      entry: data,
    };
  } catch (error) {
    console.error('Error creating journal entry:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao criar a entrada. Tente novamente mais tarde.',
    };
  }
}

export async function updateJournalEntry(
  entryId: string,
  title?: string,
  content?: any,
  mood?: JournalMood,
  tags?: string[],
  _encrypt: boolean = false,
): Promise<JournalActionResponse> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para atualizar a entrada',
        false,
      );
    }

    // First, verify the entry belongs to the user
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingEntry) {
      throw new JournalError(
        JournalErrorType.NOT_FOUND,
        'Entrada não encontrada ou você não tem permissão para editá-la',
        false,
      );
    }

    // Validate input
    if (title !== undefined && (!title.trim() || title.length > 200)) {
      throw new JournalError(
        JournalErrorType.VALIDATION_ERROR,
        'Título deve ter entre 1 e 200 caracteres',
        false,
      );
    }

    // Prepare update data
    const updateData: JournalUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (mood !== undefined) updateData.mood = mood;
    if (tags !== undefined) updateData.tags = tags;

    // Handle content encryption
    if (content !== undefined) {
      // TODO: Implement encryption when needed
      updateData.content = content;
      updateData.is_content_encrypted = false;
    }

    // Capture changes for audit log
    const changes: any = {};
    if (title !== undefined && title !== existingEntry.title)
      changes.title = { old: existingEntry.title, new: title };
    if (mood !== undefined && mood !== existingEntry.mood)
      changes.mood = { old: existingEntry.mood, new: mood };
    if (tags !== undefined && JSON.stringify(tags) !== JSON.stringify(existingEntry.tags)) {
      changes.tags = { old: existingEntry.tags, new: tags };
    }

    // Update journal entry
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating journal entry:', error);
      throw new JournalError(
        getErrorType(error),
        'Erro ao atualizar entrada no diário',
        getErrorType(error) === JournalErrorType.NETWORK_ERROR,
        error,
      );
    }

    // Log audit trail with changes
    await logAuditTrail({
      action: 'update',
      resource: 'journal_entries',
      resourceId: entryId,
      details: { changes },
      ipAddress,
      userAgent,
    });

    revalidatePath('/journal');
    return {
      success: true,
      message: 'Entrada atualizada com sucesso',
      entry: data,
    };
  } catch (error) {
    console.error('Error updating journal entry:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao atualizar a entrada. Tente novamente mais tarde.',
    };
  }
}

export async function deleteJournalEntry(entryId: string): Promise<JournalActionResponse> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para deletar a entrada',
        false,
      );
    }

    // Get entry details for audit log before deletion
    const { data: entryToDelete, error: fetchError } = await supabase
      .from('journal_entries')
      .select('title, tags, mood')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !entryToDelete) {
      throw new JournalError(
        JournalErrorType.NOT_FOUND,
        'Entrada não encontrada ou você não tem permissão para deletá-la',
        false,
      );
    }

    // Delete journal entry
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting journal entry:', error);
      throw new JournalError(
        getErrorType(error),
        'Erro ao deletar entrada no diário',
        getErrorType(error) === JournalErrorType.NETWORK_ERROR,
        error,
      );
    }

    // Log audit trail with deleted entry details
    await logAuditTrail({
      action: 'delete',
      resource: 'journal_entries',
      resourceId: entryId,
      details: {
        title: entryToDelete.title,
        tags: entryToDelete.tags,
        mood: entryToDelete.mood,
      },
      ipAddress,
      userAgent,
    });

    revalidatePath('/journal');
    return {
      success: true,
      message: 'Entrada deletada com sucesso',
    };
  } catch (error) {
    console.error('Error deleting journal entry:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao deletar a entrada. Tente novamente mais tarde.',
    };
  }
}

export async function getJournalEntries(
  limit: number = 50,
  offset: number = 0,
): Promise<JournalActionResponse> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para visualizar as entradas',
        false,
      );
    }

    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching journal entries:', error);
      throw new JournalError(
        getErrorType(error),
        'Erro ao buscar entradas do diário',
        getErrorType(error) === JournalErrorType.NETWORK_ERROR,
        error,
      );
    }

    // Log read access for compliance
    await logAuditTrail({
      action: 'read',
      resource: 'journal_entries',
      details: { count: entries.length, limit, offset },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      entries: entries,
    };
  } catch (error) {
    console.error('Error fetching journal entries:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao buscar as entradas. Tente novamente mais tarde.',
    };
  }
}

export async function getJournalEntry(entryId: string): Promise<JournalActionResponse> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para visualizar a entrada',
        false,
      );
    }

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (error || !entry) {
      throw new JournalError(
        JournalErrorType.NOT_FOUND,
        'Entrada não encontrada ou você não tem permissão para visualizá-la',
        false,
      );
    }

    // Log read access
    await logAuditTrail({
      action: 'read',
      resource: 'journal_entries',
      resourceId: entryId,
      details: { title: entry.title },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      entry,
    };
  } catch (error) {
    console.error('Error fetching journal entry:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao buscar a entrada. Tente novamente mais tarde.',
    };
  }
}

export async function searchJournalEntries(
  filters: JournalSearchFilters,
  limit: number = 50,
  offset: number = 0,
): Promise<JournalActionResponse> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para pesquisar entradas',
        false,
      );
    }

    // Use the PostgreSQL function for full-text search
    const { data: entries, error } = await supabase.rpc('search_journal_entries', {
      p_user_id: user.id,
      p_query: filters.query || undefined,
      p_mood: (filters.mood as JournalMood) || undefined,
      p_tags: filters.tags || undefined,
      p_start_date: filters.startDate || undefined,
      p_end_date: filters.endDate || undefined,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Error searching journal entries:', error);
      throw new JournalError(
        getErrorType(error),
        'Erro ao pesquisar entradas do diário',
        getErrorType(error) === JournalErrorType.NETWORK_ERROR,
        error,
      );
    }

    // Log search action
    await logAuditTrail({
      action: 'read',
      resource: 'journal_entries',
      details: {
        search: true,
        filters: {
          hasQuery: !!filters.query,
          mood: filters.mood,
          tagCount: filters.tags?.length || 0,
          dateRange: {
            start: filters.startDate,
            end: filters.endDate,
          },
        },
        resultCount: entries?.length || 0,
      },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      entries: (entries || []) as unknown as JournalEntry[],
    };
  } catch (error) {
    console.error('Error searching journal entries:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao pesquisar as entradas. Tente novamente mais tarde.',
    };
  }
}

export async function getJournalStats(): Promise<{
  success: boolean;
  stats?: {
    totalEntries: number;
    entriesThisMonth: number;
    entriesThisWeek: number;
    moodDistribution: Record<string, number>;
    popularTags: Array<{ tag: string; count: number }>;
  };
  error?: string;
}> {
  const supabase = await createClient();
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new JournalError(
        JournalErrorType.AUTH_ERROR,
        'Você precisa estar logado para visualizar as estatísticas',
        false,
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    // Get all entries for the user
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('created_at, mood, tags')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching journal stats:', error);
      throw new JournalError(
        getErrorType(error),
        'Erro ao buscar estatísticas do diário',
        getErrorType(error) === JournalErrorType.NETWORK_ERROR,
        error,
      );
    }

    // Calculate statistics
    const totalEntries = entries.length;
    const entriesThisMonth = entries.filter(
      (entry) => new Date(entry.created_at) >= startOfMonth,
    ).length;
    const entriesThisWeek = entries.filter(
      (entry) => new Date(entry.created_at) >= startOfWeek,
    ).length;

    // Mood distribution
    const moodDistribution: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.mood) {
        moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
      }
    });

    // Popular tags
    const tagCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.tags) {
        entry.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Log stats access
    await logAuditTrail({
      action: 'read',
      resource: 'journal_entries',
      details: { statsAccess: true },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      stats: {
        totalEntries,
        entriesThisMonth,
        entriesThisWeek,
        moodDistribution,
        popularTags,
      },
    };
  } catch (error) {
    console.error('Error calculating journal stats:', error);

    if (error instanceof JournalError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Ocorreu um erro ao calcular as estatísticas. Tente novamente mais tarde.',
    };
  }
}

// Export Journal type for compatibility
export type Journal = {
  id: string;
  title: string;
  content: any;
  mood?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};
