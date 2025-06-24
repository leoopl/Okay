'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
// import { encrypt, decrypt } from '@/lib/encryption-utils'; // Commented out - not implemented yet
import type { Database } from '@/lib/supabase/types';

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
  encrypt: boolean = true,
): Promise<JournalActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para criar uma entrada no diário' };
  }

  try {
    // Prepare entry data
    let entryContent = content;
    let isEncrypted = false;

    // TODO: Implement encryption when needed
    // For now, store content as-is
    // if (encrypt && typeof content === 'object') {
    //   entryContent = await encrypt(JSON.stringify(content));
    //   isEncrypted = true;
    // }

    const entryData: JournalInsert = {
      user_id: session.user.id,
      title,
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
      return {
        success: false,
        error: 'Erro ao criar entrada no diário',
      };
    }

    revalidatePath('/journal');
    return {
      success: true,
      message: 'Entrada criada com sucesso',
      entry: data,
    };
  } catch (error) {
    console.error('Error creating journal entry:', error);
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
  encrypt: boolean = true,
): Promise<JournalActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para atualizar a entrada' };
  }

  try {
    // First, verify the entry belongs to the user
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingEntry) {
      return {
        success: false,
        error: 'Entrada não encontrada ou você não tem permissão para editá-la',
      };
    }

    // Prepare update data
    const updateData: JournalUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (mood !== undefined) updateData.mood = mood;
    if (tags !== undefined) updateData.tags = tags;

    // Handle content encryption
    if (content !== undefined) {
      // TODO: Implement encryption when needed
      // For now, store content as-is
      // if (encrypt && typeof content === 'object') {
      //   updateData.content = await encrypt(JSON.stringify(content));
      //   updateData.is_content_encrypted = true;
      // } else {
      updateData.content = content;
      updateData.is_content_encrypted = false;
      // }
    }

    // Update journal entry
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating journal entry:', error);
      return {
        success: false,
        error: 'Erro ao atualizar entrada no diário',
      };
    }

    revalidatePath('/journal');
    return {
      success: true,
      message: 'Entrada atualizada com sucesso',
      entry: data,
    };
  } catch (error) {
    console.error('Error updating journal entry:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao atualizar a entrada. Tente novamente mais tarde.',
    };
  }
}

export async function deleteJournalEntry(entryId: string): Promise<JournalActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para deletar a entrada' };
  }

  try {
    // Delete journal entry (with user verification)
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting journal entry:', error);
      return {
        success: false,
        error: 'Erro ao deletar entrada no diário',
      };
    }

    revalidatePath('/journal');
    return {
      success: true,
      message: 'Entrada deletada com sucesso',
    };
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao deletar a entrada. Tente novamente mais tarde.',
    };
  }
}

export async function getJournalEntries(
  limit: number = 10,
  offset: number = 0,
  mood?: JournalMood,
  tags?: string[],
  search?: string,
): Promise<JournalActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para visualizar as entradas' };
  }

  try {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (mood) {
      query = query.eq('mood', mood);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Error fetching journal entries:', error);
      return {
        success: false,
        error: 'Erro ao buscar entradas do diário',
      };
    }

    // TODO: Decrypt encrypted entries when encryption is implemented
    // For now, return entries as-is
    // const decryptedEntries = await Promise.all(
    //   entries.map(async (entry) => {
    //     if (entry.is_content_encrypted && typeof entry.content === 'string') {
    //       try {
    //         const decryptedContent = await decrypt(entry.content);
    //         return {
    //           ...entry,
    //           content: JSON.parse(decryptedContent),
    //         };
    //       } catch (error) {
    //         console.error('Error decrypting entry:', error);
    //         // Return entry with placeholder content if decryption fails
    //         return {
    //           ...entry,
    //           content: {
    //             type: 'doc',
    //             content: [
    //               {
    //                 type: 'paragraph',
    //                 content: [
    //                   {
    //                     type: 'text',
    //                     text: '[Conteúdo criptografado não pôde ser descriptografado]',
    //                   },
    //                 ],
    //               },
    //             ],
    //           },
    //         };
    //       }
    //     }
    //     return entry;
    //   }),
    // );

    return {
      success: true,
      entries: entries,
    };
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao buscar as entradas. Tente novamente mais tarde.',
    };
  }
}

export async function getJournalEntry(entryId: string): Promise<JournalActionResponse> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para visualizar a entrada' };
  }

  try {
    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !entry) {
      return {
        success: false,
        error: 'Entrada não encontrada ou você não tem permissão para visualizá-la',
      };
    }

    // TODO: Decrypt content if encrypted when encryption is implemented
    // For now, return entry as-is
    // if (entry.is_content_encrypted && typeof entry.content === 'string') {
    //   try {
    //     const decryptedContent = await decrypt(entry.content);
    //     entry.content = JSON.parse(decryptedContent);
    //   } catch (error) {
    //     console.error('Error decrypting entry:', error);
    //     // Return entry with placeholder content if decryption fails
    //     entry.content = {
    //       type: 'doc',
    //       content: [
    //         {
    //           type: 'paragraph',
    //           content: [
    //             {
    //               type: 'text',
    //               text: '[Conteúdo criptografado não pôde ser descriptografado]',
    //             },
    //           ],
    //         },
    //       ],
    //     };
    //   }
    // }

    return {
      success: true,
      entry,
    };
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao buscar a entrada. Tente novamente mais tarde.',
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

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Você precisa estar logado para visualizar as estatísticas' };
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    // Get all entries for the user
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('created_at, mood, tags')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching journal stats:', error);
      return {
        success: false,
        error: 'Erro ao buscar estatísticas do diário',
      };
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
      entry.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

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
    return {
      success: false,
      error: 'Ocorreu um erro ao calcular as estatísticas. Tente novamente mais tarde.',
    };
  }
}

// Utility functions have been moved to @/lib/tiptap-utils

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
