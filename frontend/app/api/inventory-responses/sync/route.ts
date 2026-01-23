import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UserResponseOption {
  questionId: string;
  optionValue: number;
  optionLabel?: string;
  questionTitle?: string;
  subscale?: string;
}

interface SyncInventoryResponse {
  id?: string;
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

      // Create response record
      const { data, error } = await supabase
        .from('inventory_responses')
        .insert({
          user_id: user.id,
          inventory_id: response.inventoryId,
          responses: response.responses as any,
          calculated_scores: calculatedScores as any,
          interpretation_results: interpretationResults as any,
          consent_given: response.consentGiven,
          completed_at: response.completedAt || new Date().toISOString(),
        })
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
            .insert({
              user_id: user.id,
              inventory_id: response.inventoryId,
              responses: response.responses as any,
              calculated_scores: calculatedScores as any,
              interpretation_results: interpretationResults as any,
              consent_given: response.consentGiven,
              completed_at: response.completedAt || new Date().toISOString(),
            });

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

// Score calculation helpers (duplicated from server actions for route handler use)
function calculateScores(responses: UserResponseOption[], scoringRules: any): any {
  const scores: any = {
    total: 0,
    subscales: {},
  };

  if (scoringRules?.subscales) {
    Object.keys(scoringRules.subscales).forEach((subscale) => {
      scores.subscales[subscale] = 0;
    });

    responses.forEach((response) => {
      if (response.subscale && scores.subscales.hasOwnProperty(response.subscale)) {
        scores.subscales[response.subscale] += response.optionValue;
      }
    });
  } else {
    responses.forEach((response) => {
      scores.total += response.optionValue;
    });
  }

  return scores;
}

function generateInterpretation(scores: any, scoringRules: any): any {
  const interpretation: any = {};

  if (scoringRules?.subscales) {
    interpretation.subscaleInterpretations = {};
    let overallSeverity = 'normal';
    let highestSeverityScore = -1;

    Object.entries(scoringRules.subscales).forEach(
      ([subscaleName, subscaleRules]: [string, any]) => {
        const subscaleScore = scores.subscales[subscaleName] || 0;

        for (const range of subscaleRules) {
          if (subscaleScore >= range.min && subscaleScore <= range.max) {
            interpretation.subscaleInterpretations[subscaleName] = {
              severity: range.severity,
              label: range.label,
              recommendation: range.recommendation || getDefaultRecommendation(range.severity),
              score: subscaleScore,
            };

            const severityLevel = getSeverityLevel(range.severity);
            if (severityLevel > highestSeverityScore) {
              highestSeverityScore = severityLevel;
              overallSeverity = range.severity;
            }
            break;
          }
        }
      }
    );

    interpretation.severity = overallSeverity;
    interpretation.label = getOverallLabel(overallSeverity);
    interpretation.recommendation = getOverallRecommendation(overallSeverity);
  } else if (scoringRules?.interpretation) {
    const totalScore = scores.total;

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

  if (!interpretation.severity) {
    interpretation.severity = 'moderate';
    interpretation.label = 'Resultados da avaliação';
    interpretation.recommendation =
      'Considere buscar apoio profissional para uma avaliação mais detalhada.';
    interpretation.score = scores.total || 0;
  }

  return interpretation;
}

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
