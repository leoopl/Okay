'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventoryStore } from '@/store/inventory-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  BarChart4,
  Download,
  Home,
  Calendar,
  TrendingUp,
  Award,
  Info,
  Heart,
  Shield,
  Wind,
  BookOpen,
  HeadphonesIcon,
  PenTool,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Loading from './loading';
import { getUserResponses } from '@/lib/actions/supabase-inventories';

// Enhanced Error Component
const ErrorState = ({
  error,
  onRetry,
  showRetryButton = true,
}: {
  error: string;
  onRetry: () => void;
  showRetryButton?: boolean;
}) => (
  <div className="container mx-auto max-w-2xl px-4 py-16">
    <div className="space-y-6 text-center">
      <div className="bg-destructive/10 mx-auto w-fit rounded-full p-6">
        <AlertCircle className="text-destructive h-12 w-12" />
      </div>
      <div className="space-y-2">
        <h2 className="text-foreground text-2xl font-bold">Resultados não encontrados</h2>
        <p className="text-muted-foreground mx-auto max-w-md">{error}</p>
      </div>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {showRetryButton && (
          <Button onClick={onRetry} variant="default" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Tentar Novamente
          </Button>
        )}
        <Button
          onClick={() => (window.location.href = '/inventory')}
          variant="outline"
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Voltar para Questionários
        </Button>
      </div>
    </div>
  </div>
);

// Messages by Severity
type Severity = 'normal' | 'mild' | 'moderate' | 'severe' | 'crisis';

const getMessagesConfig = (severity: Severity) => {
  const messages: Record<
    Severity,
    {
      title: string;
      subtitle: string;
      description: string;
      ctaText: string;
      icon: any;
      actionUrl: string;
      isExternal?: boolean;
    }
  > = {
    normal: {
      title: '🎉 Excelente Trabalho!',
      subtitle: 'Seus resultados indicam que você está gerenciando bem seu bem-estar mental.',
      description:
        'Continue priorizando seu autocuidado. As ferramentas abaixo podem ajudar a manter esse equilíbrio positivo.',
      ctaText: 'Siga o fluxo e continue respirando',
      icon: Wind,
      actionUrl: '/breathing',
    },
    mild: {
      title: '💙 Você Está no Caminho Certo',
      subtitle: 'Seus resultados mostram alguns desafios que você está enfrentando.',
      description:
        'Isso é mais comum do que imagina. Continue cuidando da sua saúde mental com hábitos saudáveis. Considere iniciar um diário de gratidão para manter o foco positivo.',
      ctaText: 'Expresse seus pensamentos e sentimentos',
      icon: PenTool,
      actionUrl: '/journal',
    },
    moderate: {
      title: '🤝 Apoio Disponível Para Você',
      subtitle:
        'Seus resultados mostram que você está lidando com dificuldades emocionais mais significativas que muitas pessoas enfrentam.',
      description:
        'É importante buscar apoio adicional. Você deu um passo importante, e estamos aqui para apoiar.',
      ctaText: 'Explore nosso conteúdo educacional',
      icon: BookOpen,
      actionUrl: '/blog',
    },
    severe: {
      title: '🛟 Você precisa de apoio profissional',
      subtitle: 'Suas respostas indicam desafios que estão impactando sua vida.',
      description:
        'Sua saúde mental é uma prioridade. Por favor, conecte-se com os recursos de apoio profissional disponíveis.',
      ctaText: 'Buscar Ajuda Profissional Agora',
      icon: Users,
      actionUrl: '/professional',
    },
    crisis: {
      title: '🚨 Você não está sozinho(a). Estamos aqui para ajudar.',
      subtitle:
        'Suas respostas mostram que você está passando por um momento extremamente difícil. O que você sente é sério, mas tratável. A ajuda está disponível.',
      description:
        'Existem pessoas que querem te ouvir. Que tal ligar para o seu contato de emergência ou com pessoas que podem te ajudar?',
      ctaText: 'Falar com Alguém Agora',
      icon: HeadphonesIcon,
      actionUrl: 'tel:188',
      isExternal: true,
    },
  };

  return messages[severity];
};

// Colos Configuration by Severity
const getColosConfig = (severity: Severity) => {
  const configs = {
    normal: {
      primaryColor: 'success',
      headerBg: 'bg-success-bg',
      headerBorder: 'border-success/30',
      accentColor: 'text-success',
      buttonVariant: 'default' as const,
    },
    mild: {
      primaryColor: 'secondary',
      headerBg: 'bg-secondary/20',
      headerBorder: 'border-secondary/30',
      accentColor: 'text-secondary',
      buttonVariant: 'default' as const,
    },
    moderate: {
      primaryColor: 'primary',
      headerBg: 'bg-primary/10',
      headerBorder: 'border-primary/30',
      accentColor: 'text-accent-strong',
      buttonVariant: 'default' as const,
    },
    severe: {
      primaryColor: 'destructive',
      headerBg: 'bg-destructive/10',
      headerBorder: 'border-destructive/30',
      accentColor: 'text-destructive',
      buttonVariant: 'default' as const,
    },
    crisis: {
      primaryColor: 'crisis',
      headerBg: 'bg-crisis-bg',
      headerBorder: 'border-crisis/40',
      accentColor: 'text-crisis',
      buttonVariant: 'destructive' as const,
    },
  };

  return configs[severity];
};

// Enhanced Score Display Component
const ScoreDisplay = ({
  label,
  score,
  maxScore,
  interpretation,
  variant = 'default',
}: {
  label: string;
  score: number;
  maxScore: number;
  interpretation: { label: string; recommendation: string };
  variant?: 'default' | 'primary';
}) => {
  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        variant === 'primary' && 'ring-primary/20 shadow-lg ring-2',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              'text-lg font-semibold capitalize',
              variant === 'primary' && 'text-primary',
            )}
          >
            {label}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {score}/{maxScore}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Award className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{interpretation.label}</p>
              <p className="text-xs leading-relaxed opacity-90">{interpretation.recommendation}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Response Details Component
const ResponseDetails = ({ responses }: { responses: any[] }) => (
  <div className="space-y-4">
    {responses.map((response, index) => (
      <Card key={index} className="bg-muted/30">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h4 className="text-sm leading-relaxed font-medium">{response.questionTitle}</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium">Resposta:</span> {response.optionLabel}
            </p>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Main Component
export default function ResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { currentInventory, calculatedScores, interpretationResults, responses, resetState } =
    useInventoryStore();

  // Fetch results if not in store
  useEffect(() => {
    const fetchResults = async () => {
      if (!interpretationResults || !calculatedScores) {
        setLoading(true);

        try {
          const userResponsesResult = await getUserResponses();
          const response = userResponsesResult.responses?.find((r: any) => r.inventory_id === slug);

          if (response) {
            useInventoryStore.setState({
              calculatedScores: response.calculated_scores as any,
              interpretationResults: response.interpretation_results as any,
              responses: response.responses as any,
            });
          } else {
            setError(
              'Não foi possível encontrar seus resultados. Por favor, responda o questionário novamente.',
            );
          }
        } catch (err) {
          console.error('Falha ao buscar respostas do usuário:', err);
          setError(
            'Não foi possível carregar seus resultados. Verifique sua conexão e tente novamente.',
          );
        } finally {
          setLoading(false);
        }
      }
    };

    fetchResults();
  }, [slug, interpretationResults, calculatedScores]);

  // Download results function
  const handleDownloadResults = () => {
    if (!currentInventory || !calculatedScores || !interpretationResults) return;

    const resultData = {
      inventory: {
        title: currentInventory.title,
        version: currentInventory.version,
      },
      assessment: {
        date: new Date().toLocaleDateString('pt-BR'),
        scores: calculatedScores,
        interpretation: interpretationResults,
      },
      responses: responses.map((r) => ({
        question: r.questionTitle,
        answer: r.optionLabel,
        value: r.optionValue,
      })),
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'JSON',
      },
    };

    const blob = new Blob([JSON.stringify(resultData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okay-${currentInventory.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Navigation functions
  const handleBackToQuestionnaires = () => {
    resetState();
    router.push('/inventory');
  };

  const handleRetakeAssessment = () => {
    resetState();
    router.push(`/inventory/${slug}`);
  };

  // Loading state
  if (loading) {
    return <Loading />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => window.location.reload()}
        showRetryButton={!error.includes('responda o questionário')}
      />
    );
  }

  // Missing results state
  if (!interpretationResults || !calculatedScores) {
    return (
      <ErrorState
        error="Não encontramos resultados para este questionário. Você pode responder o questionário para obter seus resultados."
        onRetry={handleRetakeAssessment}
        showRetryButton={true}
      />
    );
  }

  // Get the severity from interpretation results
  const severity = interpretationResults?.severity || 'normal';
  const messageConfig = getMessagesConfig(severity as Severity);
  const colorConfig = getColosConfig(severity as Severity);
  const MessageIcon = messageConfig.icon;

  // Use Dynamic Results Interface for enhanced experience
  return (
    <div className="from-background via-background to-muted/30 min-h-screen bg-linear-to-br">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4 text-center">
          <div className="text-accent-strong inline-flex items-center rounded-full bg-card/80 px-4 py-2 text-sm font-medium shadow-2xl">
            <Award className="mr-2 size-4" />
            Avaliação Concluída
          </div>

          <h1 className="text-accent-strong font-varela text-4xl font-bold">Seus Resultados</h1>

          <div className="text-muted-foreground flex flex-col items-center justify-center gap-4 text-sm sm:flex-row">
            <div className="flex items-center gap-2">
              <Calendar className="size-4" />
              <span>Realizado hoje</span>
            </div>
            {currentInventory && (
              <>
                <div className="bg-muted-foreground/50 hidden h-1 w-1 rounded-full sm:block" />
                <span>{currentInventory.title}</span>
              </>
            )}
          </div>
        </div>

        {/* Results Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/40 grid w-full grid-cols-2">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:text-primary data-[state=active]:bg-background gap-2"
            >
              <BarChart4 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="data-[state=active]:text-primary data-[state=active]:bg-background gap-2"
            >
              <Info className="h-4 w-4" />
              Detalhes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Main Score - only show if no subscales */}
            {!interpretationResults.subscaleInterpretations && (
              <ScoreDisplay
                label="Resultado Geral"
                score={calculatedScores.total || 0}
                maxScore={(() => {
                  const scoring = currentInventory?.scoring;
                  if (scoring && typeof scoring === 'object' && 'totalScoreRange' in scoring) {
                    const scoreRange = (scoring as any).totalScoreRange;
                    return Array.isArray(scoreRange) ? scoreRange[1] : 21;
                  }
                  return 21;
                })()}
                interpretation={{
                  label: interpretationResults.label || 'Resultado não disponível',
                  recommendation:
                    interpretationResults.recommendation ||
                    'Considere buscar apoio profissional para uma avaliação mais detalhada.',
                }}
                variant="primary"
              />
            )}
            {/* Subscale Scores - for DASS-21 and similar inventories */}
            {interpretationResults.subscaleInterpretations &&
              Object.keys(interpretationResults.subscaleInterpretations).length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-accent-strong font-varela flex items-center gap-2 text-xl font-semibold">
                    <TrendingUp className="text-primary size-5" />
                    Análise por Categorias
                  </h2>

                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(interpretationResults.subscaleInterpretations).map(
                      ([key, value]: [string, any]) => {
                        // Get the appropriate severity config for each subscale
                        const subscaleSeverity = value.severity || 'normal';
                        const subscaleColorConfig = getColosConfig(subscaleSeverity as Severity);

                        return (
                          <Card
                            key={key}
                            className={cn(
                              'transition-all duration-200 hover:shadow-md',
                              'border-2',
                              subscaleColorConfig.headerBorder,
                            )}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold capitalize">
                                  {key === 'stress'
                                    ? 'Estresse'
                                    : key === 'anxiety'
                                      ? 'Ansiedade'
                                      : key === 'depression'
                                        ? 'Depressão'
                                        : key}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs', subscaleColorConfig.accentColor)}
                                >
                                  {value.score || calculatedScores.subscales?.[key] || 0}/21
                                </Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              <div
                                className={cn(
                                  'rounded-lg border p-3',
                                  subscaleColorConfig.headerBg,
                                  subscaleColorConfig.headerBorder,
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <Award
                                    className={cn(
                                      'mt-0.5 h-4 w-4 shrink-0',
                                      subscaleColorConfig.accentColor,
                                    )}
                                  />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{value.label}</p>
                                    <p className="text-xs leading-relaxed opacity-90">
                                      {value.recommendation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

            {/* Severity-based message card */}
            <Card className={cn('border-2', colorConfig.headerBorder, colorConfig.headerBg)}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-full p-3', colorConfig.headerBg)}>
                      <MessageIcon className={cn('h-6 w-6', colorConfig.accentColor)} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">{messageConfig.title}</h2>
                      <p className="text-muted-foreground mt-1">{messageConfig.subtitle}</p>
                    </div>
                  </div>
                  <div className="items-center justify-items-center">
                    <p className="text-sm leading-relaxed">{messageConfig.description}</p>
                    <Button
                      variant={colorConfig.buttonVariant}
                      className="mt-5 w-full sm:w-auto"
                      onClick={() => {
                        if (messageConfig.isExternal) {
                          window.open(messageConfig.actionUrl, '_self');
                        } else {
                          router.push(messageConfig.actionUrl);
                        }
                      }}
                    >
                      {messageConfig.ctaText}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notice */}
            <Card className="border-destructive/80 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-accent/20 rounded-full p-2">
                    <Shield className="text-destructive size-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-foreground font-semibold">Importante lembrar</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Este resultado é uma ferramenta de autoavaliação e não substitui uma consulta
                      com profissional de saúde mental. Se você está enfrentando dificuldades
                      significativas, recomendamos buscar acompanhamento especializado.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        Baseado em evidências científicas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Dados seguros e privados
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-varela text-accent-strong flex items-center gap-2">
                  <Info className="text-primary size-5" />
                  Suas Respostas
                </CardTitle>
                <CardDescription>
                  Revise as respostas que você forneceu durante a avaliação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponseDetails responses={responses} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Button variant="outline" onClick={handleDownloadResults} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar Resultados
          </Button>

          <Button variant="outline" onClick={handleRetakeAssessment} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Refazer Avaliação
          </Button>

          <Button onClick={handleBackToQuestionnaires} className="gap-2">
            <Heart className="h-4 w-4" />
            Outras Avaliações
          </Button>
        </div>
      </div>
    </div>
  );
}
