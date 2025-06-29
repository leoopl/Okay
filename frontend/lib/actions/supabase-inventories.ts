'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/database.types';

// Type definitions
export type Inventory = Database['public']['Tables']['inventories']['Row'];
export type InventoryResponse = Database['public']['Tables']['inventory_responses']['Row'];

export interface InventoryWithResponses extends Inventory {
  inventory_responses?: InventoryResponse[];
}

export interface UserResponseOption {
  questionId: string;
  optionValue: number;
  optionLabel?: string;
  questionTitle?: string;
}

export interface SubmitInventoryResponseInput {
  inventoryId: string;
  responses: UserResponseOption[];
  consentGiven: boolean;
}

// Get all available inventories
export async function getInventories() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', inventories: null };
    }

    const { data, error } = await supabase
      .from('inventories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventories:', error);
      return { success: false, error: error.message, inventories: null };
    }

    return { success: true, inventories: data, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred', inventories: null };
  }
}

// Get a single inventory by ID
export async function getInventory(id: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', inventory: null };
    }

    const { data, error } = await supabase.from('inventories').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching inventory:', error);
      return { success: false, error: error.message, inventory: null };
    }

    return { success: true, inventory: data, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred', inventory: null };
  }
}

// Submit inventory response
export async function submitInventoryResponse(input: SubmitInventoryResponseInput) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', response: null };
    }

    // Validate consent
    if (!input.consentGiven) {
      return { success: false, error: 'Consent is required to submit responses', response: null };
    }

    // Get inventory to calculate scores
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('*')
      .eq('id', input.inventoryId)
      .single();

    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found', response: null };
    }

    // Calculate scores based on inventory scoring rules
    const calculatedScores = calculateScores(input.responses, inventory.scoring as any);
    const interpretationResults = generateInterpretation(
      calculatedScores,
      inventory.scoring as any,
    );

    // Get user's IP for audit trail (this would be from request headers in real implementation)
    const ipAddress = null; // Would get from request headers

    // Create response record
    const { data, error } = await supabase
      .from('inventory_responses')
      .insert({
        user_id: user.id,
        inventory_id: input.inventoryId,
        responses: input.responses as any, // Cast to any for JSON type
        calculated_scores: calculatedScores as any,
        interpretation_results: interpretationResults as any,
        consent_given: input.consentGiven,
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting response:', error);
      return { success: false, error: error.message, response: null };
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'create',
      resource: 'inventory_response',
      resource_id: data.id,
      details: { inventory_id: input.inventoryId },
    });

    revalidatePath('/inventory');
    return { success: true, response: data, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred', response: null };
  }
}

// Get user's inventory responses
export async function getUserResponses(inventoryId?: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', responses: null };
    }

    let query = supabase
      .from('inventory_responses')
      .select(
        `
        *,
        inventories (
          id,
          name,
          title,
          description
        )
      `,
      )
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching responses:', error);
      return { success: false, error: error.message, responses: null };
    }

    return { success: true, responses: data, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred', responses: null };
  }
}

// Delete inventory response
export async function deleteInventoryResponse(responseId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const { data: response, error: fetchError } = await supabase
      .from('inventory_responses')
      .select('user_id')
      .eq('id', responseId)
      .single();

    if (fetchError || !response || response.user_id !== user.id) {
      return { success: false, error: 'Response not found or unauthorized' };
    }

    // Soft delete by anonymizing data (LGPD compliance)
    const { error } = await supabase
      .from('inventory_responses')
      .update({
        user_id: '00000000-0000-0000-0000-000000000000', // Anonymous user ID
        consent_given: false,
        ip_address: null,
      })
      .eq('id', responseId);

    if (error) {
      console.error('Error deleting response:', error);
      return { success: false, error: error.message };
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'delete',
      resource: 'inventory_response',
      resource_id: responseId,
      details: { soft_delete: true, reason: 'user_requested' },
    });

    revalidatePath('/inventory');
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Withdraw consent for a response
export async function withdrawConsent(responseId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('inventory_responses')
      .update({ consent_given: false })
      .eq('id', responseId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error withdrawing consent:', error);
      return { success: false, error: error.message };
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'consent_updated',
      resource: 'inventory_response',
      resource_id: responseId,
      details: { consent_withdrawn: true },
    });

    revalidatePath('/inventory');
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Helper function to calculate scores
function calculateScores(responses: UserResponseOption[], scoringRules: any): any {
  // This is a simplified scoring calculation
  // Actual implementation would depend on specific inventory scoring rules
  const scores: any = {
    total: 0,
    subscales: {},
  };

  responses.forEach((response) => {
    scores.total += response.optionValue;
  });

  // Calculate subscale scores if defined
  if (scoringRules.subscales) {
    Object.keys(scoringRules.subscales).forEach((subscale) => {
      scores.subscales[subscale] = 0;
      // Add logic for subscale calculation
    });
  }

  return scores;
}

// Helper function to generate interpretation
function generateInterpretation(scores: any, scoringRules: any): any {
  // This is a simplified interpretation
  // Actual implementation would use scoring rules to generate appropriate interpretation
  const interpretation: any = {
    severity: 'moderate',
    label: 'Moderate symptoms',
    recommendation: 'Consider consulting with a healthcare professional',
  };

  // Add logic for determining severity and recommendations based on scores
  if (scores.total <= scoringRules.cutoffs?.mild) {
    interpretation.severity = 'mild';
    interpretation.label = 'Mild symptoms';
    interpretation.recommendation = 'Continue monitoring your symptoms';
  } else if (scores.total >= scoringRules.cutoffs?.severe) {
    interpretation.severity = 'severe';
    interpretation.label = 'Severe symptoms';
    interpretation.recommendation = 'Seek professional help immediately';
  }

  return interpretation;
}

// Note: Server actions must be exported individually, not as an object
