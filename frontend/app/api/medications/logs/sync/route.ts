import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type DoseLogInsert = Database['public']['Tables']['dose_logs']['Insert'];
type DoseStatus = Database['public']['Enums']['dose_status'];

interface SyncDoseLog {
  id?: string; // Client-generated UUID for idempotent upsert
  medicationId: string;
  status: DoseStatus;
  timestamp: string;
  scheduledTime?: string;
  notes?: string;
  doseType?: 'scheduled' | 'prn';
}

interface SyncRequest {
  logs?: SyncDoseLog[];
  log?: SyncDoseLog;
}

/**
 * POST /api/medications/logs/sync
 * Handles background sync of medication dose logs from service worker
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

    // Handle single log sync
    if (body.log) {
      const log = body.log;

      // Verify medication belongs to user
      const { data: medication, error: medError } = await supabase
        .from('medications')
        .select('id')
        .eq('id', log.medicationId)
        .eq('user_id', user.id)
        .single();

      if (medError || !medication) {
        return NextResponse.json(
          { success: false, error: 'Medication not found or unauthorized' },
          { status: 404 },
        );
      }

      const doseLogData: DoseLogInsert = {
        ...(log.id ? { id: log.id } : {}),
        medication_id: log.medicationId,
        user_id: user.id,
        timestamp: log.timestamp,
        status: log.status,
        scheduled_time: log.scheduledTime || null,
        notes: log.notes || null,
      };

      const { data, error } = await supabase
        .from('dose_logs')
        .upsert({ ...doseLogData, dose_type: log.doseType || null } as any, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error syncing dose log:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Dose log synced successfully',
        log: data,
      });
    }

    // Handle batch sync (multiple logs)
    if (body.logs && body.logs.length > 0) {
      const results = {
        created: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Get user's medications for verification
      const { data: userMedications } = await supabase
        .from('medications')
        .select('id')
        .eq('user_id', user.id);

      const userMedicationIds = new Set(userMedications?.map((m) => m.id) || []);

      for (const log of body.logs) {
        try {
          // Verify medication belongs to user
          if (!userMedicationIds.has(log.medicationId)) {
            results.failed++;
            results.errors.push(`Medication ${log.medicationId} not found or unauthorized`);
            continue;
          }

          const doseLogData: DoseLogInsert = {
            ...(log.id ? { id: log.id } : {}),
            medication_id: log.medicationId,
            user_id: user.id,
            timestamp: log.timestamp,
            status: log.status,
            scheduled_time: log.scheduledTime || null,
            notes: log.notes || null,
          };

          const { error } = await supabase
            .from('dose_logs')
            .upsert({ ...doseLogData, dose_type: log.doseType || null } as any, {
              onConflict: 'id',
            });

          if (error) {
            results.failed++;
            results.errors.push(`Failed to sync log: ${error.message}`);
          } else {
            results.created++;
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
        message: `Synced ${results.created} logs, ${results.failed} failed`,
        results,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No logs provided for sync' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Medication logs sync error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
