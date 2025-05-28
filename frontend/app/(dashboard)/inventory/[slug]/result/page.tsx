'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventoryStore } from '@/store/inventory-store';
import { InventoryService } from '@/services/inventory-service';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Loading from './loading';

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
  const percentage = (score / maxScore) * 100;
  const getColorClass = (percentage: number) => {
    if (percentage < 30) return 'from-green-500 to-green-600';
    if (percentage < 60) return 'from-yellow-500 to-yellow-600';
    if (percentage < 80) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getBackgroundClass = (percentage: number) => {
    if (percentage < 30)
      return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
    if (percentage < 60)
      return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
    if (percentage < 80)
      return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
    return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
  };

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
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pontuação</span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
          </div>
          <div className="bg-muted relative h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full bg-gradient-to-r transition-all duration-1000 ease-out',
                getColorClass(percentage),
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className={cn('rounded-lg border p-3', getBackgroundClass(percentage))}>
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
          const userResponses = await InventoryService.getUserResponses();
          const response = userResponses.find((r) => r.inventoryId === slug);

          if (response) {
            useInventoryStore.setState({
              calculatedScores: response.calculatedScores,
              interpretationResults: response.interpretationResults,
              responses: response.responses,
            });
          } else {
            setError(
              'Não foi possível encontrar seus resultados. Por favor, responda o questionário novamente.',
            );
          }
        } catch (err) {
          console.error('Failed to fetch user responses:', err);
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

  return (
    <div className="from-background via-background to-muted/30 min-h-screen bg-gradient-to-br">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4 text-center">
          <div className="text-yellow-dark inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-medium shadow-2xl">
            <Award className="mr-2 size-4" />
            Avaliação Concluída
          </div>

          <h1 className="text-green-dark font-varela text-4xl font-bold">Seus Resultados</h1>

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
          <TabsList className="bg-grey-light/40 grid w-full grid-cols-2">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:text-blue-dark data-[state=active]:bg-background gap-2"
            >
              <BarChart4 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="data-[state=active]:text-blue-dark data-[state=active]:bg-background gap-2"
            >
              <Info className="h-4 w-4" />
              Detalhes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Main Score */}
            <ScoreDisplay
              label="Resultado Geral"
              score={calculatedScores.total || 0}
              maxScore={currentInventory?.scoring.totalScoreRange?.[1] || 100}
              interpretation={interpretationResults}
              variant="primary"
            />

            {/* Subscale Scores */}
            {interpretationResults.subscaleInterpretations &&
              Object.keys(interpretationResults.subscaleInterpretations).length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-foreground flex items-center gap-2 text-xl font-semibold">
                    <TrendingUp className="text-primary h-5 w-5" />
                    Análise por Categorias
                  </h2>

                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(interpretationResults.subscaleInterpretations).map(
                      ([key, value]) => (
                        <ScoreDisplay
                          key={key}
                          label={key}
                          score={calculatedScores[key] || 0}
                          maxScore={currentInventory?.scoring.subscales?.[key]?.maxRawScore || 100}
                          interpretation={value}
                        />
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* Important Notice */}
            <Card className="border-accent/20 bg-accent/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-accent/20 rounded-full p-2">
                    <Shield className="text-accent-foreground h-5 w-5" />
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
                <CardTitle className="font-varela flex items-center gap-2">
                  <Info className="text-blue-dark h-5 w-5" />
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
