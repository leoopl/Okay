import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type JournalInsert = Database['public']['Tables']['journal_entries']['Insert'];
type JournalUpdate = Database['public']['Tables']['journal_entries']['Update'];
type JournalMood = Database['public']['Enums']['journal_mood'];

interface SyncJournalEntry {
  id?: string;
  title: string;
  content: any;
  mood?: string;
  tags?: string[];
  is_content_encrypted?: boolean;
  created_at?: string;
  updated_at?: string;
  _optimistic?: boolean;
  _syncStatus?: string;
}

interface SyncRequest {
  entries?: SyncJournalEntry[];
  entry?: SyncJournalEntry;
  operation?: 'create' | 'update' | 'delete';
}

/**
 * POST /api/journal/sync
 * Handles background sync of journal entries from service worker
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncRequest = await request.json();

    // Handle single entry sync (from service worker cache)
    if (body.entry) {
      const entry = body.entry;
      // Determine operation: explicit > _optimistic flag > legacy temp_ prefix detection
      const isCreate =
        body.operation === 'create' || entry._optimistic === true || entry.id?.startsWith('temp_');
      const operation = body.operation || (isCreate ? 'create' : 'update');

      if (operation === 'create' || isCreate) {
        // Use UUID provided by client (idempotent upsert) or let server generate one
        const hasClientUUID = entry.id && !entry.id.startsWith('temp_');
        const insertData: JournalInsert = {
          ...(hasClientUUID ? { id: entry.id } : {}),
          user_id: user.id,
          title: entry.title,
          content: entry.content,
          mood: (entry.mood as JournalMood) || null,
          tags: entry.tags || [],
          is_content_encrypted: entry.is_content_encrypted || false,
        };

        // Upsert: idempotent on conflict(id) — safe for retry and multi-tab scenarios
        const { data, error } = await supabase
          .from('journal_entries')
          .upsert(insertData, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          console.error('Error creating journal entry during sync:', error);
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Journal entry synced successfully',
          entry: data,
          tempId: entry.id, // Return temp ID for client to reconcile
        });
      } else if (operation === 'update' && entry.id) {
        // Update existing entry
        const updateData: JournalUpdate = {
          title: entry.title,
          content: entry.content,
          mood: (entry.mood as JournalMood) || null,
          tags: entry.tags || [],
          is_content_encrypted: entry.is_content_encrypted || false,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('journal_entries')
          .update(updateData)
          .eq('id', entry.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating journal entry during sync:', error);
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Journal entry updated successfully',
          entry: data,
        });
      } else if (operation === 'delete' && entry.id) {
        // Delete entry
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', entry.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting journal entry during sync:', error);
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Journal entry deleted successfully',
        });
      }
    }

    // Handle batch sync (multiple entries)
    if (body.entries && body.entries.length > 0) {
      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const entry of body.entries) {
        try {
          const isCreate = entry._optimistic === true || entry.id?.startsWith('temp_') || !entry.id;
          if (isCreate) {
            // Upsert: client UUID for idempotency, or let server generate one
            const hasClientUUID = entry.id && !entry.id.startsWith('temp_');
            const insertData: JournalInsert = {
              ...(hasClientUUID ? { id: entry.id } : {}),
              user_id: user.id,
              title: entry.title,
              content: entry.content,
              mood: (entry.mood as JournalMood) || null,
              tags: entry.tags || [],
              is_content_encrypted: entry.is_content_encrypted || false,
            };

            const { error } = await supabase
              .from('journal_entries')
              .upsert(insertData, { onConflict: 'id' });

            if (error) {
              results.failed++;
              results.errors.push(`Failed to create entry: ${error.message}`);
            } else {
              results.created++;
            }
          } else {
            // Update existing entry
            const updateData: JournalUpdate = {
              title: entry.title,
              content: entry.content,
              mood: (entry.mood as JournalMood) || null,
              tags: entry.tags || [],
              is_content_encrypted: entry.is_content_encrypted || false,
              updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
              .from('journal_entries')
              .update(updateData)
              .eq('id', entry.id!)
              .eq('user_id', user.id);

            if (error) {
              results.failed++;
              results.errors.push(`Failed to update entry ${entry.id}: ${error.message}`);
            } else {
              results.updated++;
            }
          }
        } catch (err) {
          results.failed++;
          results.errors.push(
            `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
          );
        }
      }

      return NextResponse.json({
        success: results.failed === 0,
        message: `Synced ${results.created} created, ${results.updated} updated, ${results.failed} failed`,
        results,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No entries provided for sync' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Journal sync error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
