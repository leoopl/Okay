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
  subscale?: string;
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
      .is('deleted_at', null) // Filter out soft-deleted records
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

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('inventory_responses')
      .update({
        deleted_at: new Date().toISOString(),
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
  const scores: any = {
    total: 0,
    subscales: {},
  };

  // If scoring rules have subscales (like DASS-21)
  if (scoringRules.subscales) {
    // Initialize subscale scores
    Object.keys(scoringRules.subscales).forEach((subscale) => {
      scores.subscales[subscale] = 0;
    });

    // Calculate scores for each response
    responses.forEach((response) => {
      // Add to subscale score if response has a subscale
      if (response.subscale && scores.subscales.hasOwnProperty(response.subscale)) {
        scores.subscales[response.subscale] += response.optionValue;
      }
    });
  } else {
    // Simple total score calculation (like GAD-7, PHQ-9)
    responses.forEach((response) => {
      scores.total += response.optionValue;
    });
  }

  return scores;
}

// Helper function to generate interpretation
function generateInterpretation(scores: any, scoringRules: any): any {
  const interpretation: any = {};

  // Check if scoring rules have subscales (like DASS-21)
  if (scoringRules.subscales) {
    interpretation.subscaleInterpretations = {};
    let overallSeverity = 'normal';
    let highestSeverityScore = -1;

    // Generate interpretation for each subscale
    Object.entries(scoringRules.subscales).forEach(
      ([subscaleName, subscaleRules]: [string, any]) => {
        const subscaleScore = scores.subscales[subscaleName] || 0;

        // Find the appropriate interpretation based on score range
        for (const range of subscaleRules) {
          if (subscaleScore >= range.min && subscaleScore <= range.max) {
            interpretation.subscaleInterpretations[subscaleName] = {
              severity: range.severity,
              label: range.label,
              recommendation: range.recommendation || getDefaultRecommendation(range.severity),
              score: subscaleScore,
            };

            // Track the highest severity for overall interpretation
            const severityLevel = getSeverityLevel(range.severity);
            if (severityLevel > highestSeverityScore) {
              highestSeverityScore = severityLevel;
              overallSeverity = range.severity;
            }
            break;
          }
        }
      },
    );

    // Set overall severity based on the highest subscale severity
    interpretation.severity = overallSeverity;
    interpretation.label = getOverallLabel(overallSeverity);
    interpretation.recommendation = getOverallRecommendation(overallSeverity);
  }
  // Simple interpretation (like GAD-7, PHQ-9)
  else if (scoringRules.interpretation) {
    const totalScore = scores.total;

    // Find the appropriate interpretation based on score range
    for (const range of scoringRules.interpretation) {
      if (totalScore >= range.min && totalScore <= range.max) {
        interpretation.severity = range.severity;
        interpretation.label = range.label;
        interpretation.recommendation =
          range.recommendation || getDefaultRecommendation(range.severity);
        interpretation.score = totalScore;
        break;
      }
    }
  }

  // Ensure we always have a valid interpretation
  if (!interpretation.severity) {
    interpretation.severity = 'moderate';
    interpretation.label = 'Resultados da avaliação';
    interpretation.recommendation =
      'Considere buscar apoio profissional para uma avaliação mais detalhada.';
    interpretation.score = scores.total || 0;
  }

  return interpretation;
}

// Helper functions for severity handling
function getSeverityLevel(severity: string): number {
  const levels: { [key: string]: number } = {
    normal: 0,
    mild: 1,
    moderate: 2,
    severe: 3,
    crisis: 4,
  };
  return levels[severity] || 2;
}

function getOverallLabel(severity: string): string {
  const labels: { [key: string]: string } = {
    normal: 'Resultados dentro do esperado',
    mild: 'Sintomas leves identificados',
    moderate: 'Sintomas moderados identificados',
    severe: 'Sintomas significativos identificados',
    crisis: 'Atenção imediata necessária',
  };
  return labels[severity] || 'Resultados da avaliação';
}

function getOverallRecommendation(severity: string): string {
  const recommendations: { [key: string]: string } = {
    normal: 'Seus resultados estão dentro do esperado. Continue cuidando da sua saúde mental.',
    mild: 'Considere manter práticas de autocuidado e monitorar seus sintomas.',
    moderate: 'Recomendamos buscar apoio profissional para uma avaliação mais detalhada.',
    severe: 'É importante buscar ajuda profissional o quanto antes.',
    crisis: 'Procure ajuda profissional imediatamente. Você não está sozinho(a).',
  };
  return recommendations[severity] || 'Considere buscar apoio profissional.';
}

function getDefaultRecommendation(severity: string): string {
  const recommendations: { [key: string]: string } = {
    normal: 'Continue mantendo hábitos saudáveis e práticas de autocuidado.',
    mild: 'Considere práticas de relaxamento e mantenha o automonitoramento.',
    moderate: 'Busque apoio profissional para melhor compreender seus sintomas.',
    severe: 'Procure ajuda profissional especializada o mais breve possível.',
    crisis: 'Busque ajuda imediata. Ligue 188 (CVV) ou procure um serviço de emergência.',
  };
  return recommendations[severity] || 'Considere buscar orientação profissional.';
}
