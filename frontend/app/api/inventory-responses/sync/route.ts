import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateScores, generateInterpretation, type UserResponseOption } from '@/lib/scoring-utils';

interface SyncInventoryResponse {
  id?: string; // Client-generated UUID for idempotent upsert
  inventoryId: string;
  responses: UserResponseOption[];
  consentGiven: boolean;
  calculatedScores?: any;
  interpretationResults?: any;
  completedAt?: string;
}

interface SyncRequest {
  responses?: SyncInventoryResponse[];
  response?: SyncInventoryResponse;
}

/**
 * POST /api/inventory-responses/sync
 * Handles background sync of inventory responses from service worker
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SyncRequest = await request.json();

    // Handle single response sync
    if (body.response) {
      const response = body.response;

      // Validate consent
      if (!response.consentGiven) {
        return NextResponse.json(
          { success: false, error: 'Consent is required' },
          { status: 400 }
        );
      }

      // Get inventory to calculate scores if not already calculated
      let calculatedScores = response.calculatedScores;
      let interpretationResults = response.interpretationResults;

      if (!calculatedScores || !interpretationResults) {
        const { data: inventory, error: inventoryError } = await supabase
          .from('inventories')
          .select('*')
          .eq('id', response.inventoryId)
          .single();

        if (inventoryError || !inventory) {
          return NextResponse.json(
            { success: false, error: 'Inventory not found' },
            { status: 404 }
          );
        }

        calculatedScores = calculateScores(response.responses, inventory.scoring as any);
        interpretationResults = generateInterpretation(calculatedScores, inventory.scoring as any);
      }

      // Upsert: idempotent on conflict(id) when client provides a UUID
      const { data, error } = await supabase
        .from('inventory_responses')
        .upsert(
          {
            ...(response.id ? { id: response.id } : {}),
            user_id: user.id,
            inventory_id: response.inventoryId,
            responses: response.responses as any,
            calculated_scores: calculatedScores as any,
            interpretation_results: interpretationResults as any,
            consent_given: response.consentGiven,
            completed_at: response.completedAt || new Date().toISOString(),
          },
          { onConflict: 'id' },
        )
        .select()
        .single();

      if (error) {
        console.error('Error syncing inventory response:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'create',
        resource: 'inventory_response',
        resource_id: data.id,
        details: { inventory_id: response.inventoryId, synced: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Inventory response synced successfully',
        response: data,
      });
    }

    // Handle batch sync (multiple responses)
    if (body.responses && body.responses.length > 0) {
      const results = {
        created: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const response of body.responses) {
        try {
          if (!response.consentGiven) {
            results.failed++;
            results.errors.push('Consent not given for response');
            continue;
          }

          // Get inventory for scoring
          const { data: inventory, error: inventoryError } = await supabase
            .from('inventories')
            .select('*')
            .eq('id', response.inventoryId)
            .single();

          if (inventoryError || !inventory) {
            results.failed++;
            results.errors.push(`Inventory ${response.inventoryId} not found`);
            continue;
          }

          const calculatedScores = response.calculatedScores ||
            calculateScores(response.responses, inventory.scoring as any);
          const interpretationResults = response.interpretationResults ||
            generateInterpretation(calculatedScores, inventory.scoring as any);

          const { error } = await supabase
            .from('inventory_responses')
            .upsert(
              {
                ...(response.id ? { id: response.id } : {}),
                user_id: user.id,
                inventory_id: response.inventoryId,
                responses: response.responses as any,
                calculated_scores: calculatedScores as any,
                interpretation_results: interpretationResults as any,
                consent_given: response.consentGiven,
                completed_at: response.completedAt || new Date().toISOString(),
              },
              { onConflict: 'id' },
            );

          if (error) {
            results.failed++;
            results.errors.push(`Failed to sync response: ${error.message}`);
          } else {
            results.created++;
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }

      return NextResponse.json({
        success: results.failed === 0,
        message: `Synced ${results.created} responses, ${results.failed} failed`,
        results,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No responses provided for sync' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Inventory sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
