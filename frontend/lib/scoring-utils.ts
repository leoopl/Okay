/**
 * Shared inventory scoring utilities.
 * Used by both lib/actions/supabase-inventories.ts and app/api/inventory-responses/sync/route.ts.
 */

export interface UserResponseOption {
  questionId: string;
  optionValue: number;
  optionLabel?: string;
  questionTitle?: string;
  subscale?: string;
}

export function calculateScores(responses: UserResponseOption[], scoringRules: any): any {
  const scores: any = {
    total: 0,
    subscales: {},
  };

  if (scoringRules?.subscales) {
    Object.keys(scoringRules.subscales).forEach((subscale) => {
      scores.subscales[subscale] = 0;
    });

    responses.forEach((response) => {
      if (
        response.subscale &&
        Object.prototype.hasOwnProperty.call(scores.subscales, response.subscale)
      ) {
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

export function generateInterpretation(scores: any, scoringRules: any): any {
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
      },
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

export function getSeverityLevel(severity: string): number {
  const levels: { [key: string]: number } = {
    normal: 0,
    mild: 1,
    moderate: 2,
    severe: 3,
    crisis: 4,
  };
  return levels[severity] ?? 2;
}

export function getOverallLabel(severity: string): string {
  const labels: { [key: string]: string } = {
    normal: 'Resultados dentro do esperado',
    mild: 'Sintomas leves identificados',
    moderate: 'Sintomas moderados identificados',
    severe: 'Sintomas significativos identificados',
    crisis: 'Atenção imediata necessária',
  };
  return labels[severity] || 'Resultados da avaliação';
}

export function getOverallRecommendation(severity: string): string {
  const recommendations: { [key: string]: string } = {
    normal: 'Seus resultados estão dentro do esperado. Continue cuidando da sua saúde mental.',
    mild: 'Considere manter práticas de autocuidado e monitorar seus sintomas.',
    moderate: 'Recomendamos buscar apoio profissional para uma avaliação mais detalhada.',
    severe: 'É importante buscar ajuda profissional o quanto antes.',
    crisis: 'Procure ajuda profissional imediatamente. Você não está sozinho(a).',
  };
  return recommendations[severity] || 'Considere buscar apoio profissional.';
}

export function getDefaultRecommendation(severity: string): string {
  const recommendations: { [key: string]: string } = {
    normal: 'Continue mantendo hábitos saudáveis e práticas de autocuidado.',
    mild: 'Considere práticas de relaxamento e mantenha o automonitoramento.',
    moderate: 'Busque apoio profissional para melhor compreender seus sintomas.',
    severe: 'Procure ajuda profissional especializada o mais breve possível.',
    crisis: 'Busque ajuda imediata. Ligue 188 (CVV) ou procure um serviço de emergência.',
  };
  return recommendations[severity] || 'Considere buscar orientação profissional.';
}
