'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventoryStore } from '@/store/inventory-store';
import {
  InventoryService,
  InterpretationResult,
  CalculatedScores,
} from '@/services/inventory-service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, BarChart4, Download, Home } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ResultPage({ params }: { params: { slug: string } }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { currentInventory, calculatedScores, interpretationResults, responses, resetState } =
    useInventoryStore();

  useEffect(() => {
    // If we don't have results in the store, try to fetch them
    if (!interpretationResults || !calculatedScores) {
      setLoading(true);

      // First try to fetch the most recent response for this inventory
      InventoryService.getUserResponses()
        .then((responses) => {
          const response = responses.find((r) => r.inventoryId === params.slug);
          if (response) {
            useInventoryStore.setState({
              calculatedScores: response.calculatedScores,
              interpretationResults: response.interpretationResults,
              responses: response.responses,
            });
          } else {
            setError('Não foi possível encontrar seus resultados. Por favor, tente novamente.');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user responses:', err);
          setError('Não foi possível carregar seus resultados. Por favor, tente novamente.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [params.slug, interpretationResults, calculatedScores]);

  // Function to get color based on score severity
  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = score / maxScore;

    if (percentage < 0.3) return 'bg-green-medium';
    if (percentage < 0.6) return 'bg-yellow-medium';
    if (percentage < 0.8) return 'bg-orange-500';
    return 'bg-destructive';
  };

  // Function to handle downloading results
  const handleDownloadResults = () => {
    if (!currentInventory || !calculatedScores || !interpretationResults) return;

    const resultData = {
      title: currentInventory.title,
      date: new Date().toLocaleDateString('pt-BR'),
      scores: calculatedScores,
      interpretation: interpretationResults,
      responses: responses.map((r) => ({
        question: r.questionTitle,
        answer: r.optionLabel,
        value: r.optionValue,
      })),
    };

    // Create a blob and download
    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentInventory.name.toLowerCase()}-resultado.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle going back to inventorys
  const handleBackToQuestionnaires = () => {
    resetState();
    router.push('/inventory');
  };

  if (loading) {
    return (
      <div className="container mx-auto flex justify-center py-8">
        <div className="border-primary h-16 w-16 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push('/inventory')}>Voltar para Questionários</Button>
        </div>
      </div>
    );
  }

  if (!interpretationResults || !calculatedScores) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Resultados não encontrados</AlertTitle>
          <AlertDescription>
            Não encontramos resultados para este questionário. Você pode tentar responder o
            questionário novamente.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push(`/inventory/${params.slug}`)}>
            Responder Questionário
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Seus Resultados</h1>
        <p className="text-muted-foreground mt-2">{currentInventory?.title || 'Questionário'}</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart4 className="h-5 w-5" />
                Resultado Geral
              </CardTitle>
              <CardDescription>Sua pontuação e interpretação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium">Pontuação Total</span>
                  <span className="text-sm font-medium">
                    {calculatedScores.total} /{' '}
                    {currentInventory?.scoring.totalScoreRange?.[1] || '--'}
                  </span>
                </div>
                <Progress
                  value={
                    ((calculatedScores.total || 0) /
                      (currentInventory?.scoring.totalScoreRange?.[1] || 100)) *
                    100
                  }
                  className={`h-3 ${getScoreColor(
                    calculatedScores.total || 0,
                    currentInventory?.scoring.totalScoreRange?.[1] || 100,
                  )}`}
                />
              </div>

              <div className="bg-muted rounded-md p-4">
                <Badge variant="outline" className="mb-2">
                  {interpretationResults.label}
                </Badge>
                <p className="text-muted-foreground">{interpretationResults.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscale results */}
          {interpretationResults.subscaleInterpretations &&
            Object.keys(interpretationResults.subscaleInterpretations).length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Resultados por Categoria</CardTitle>
                  <CardDescription>Análise detalhada por categorias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(interpretationResults.subscaleInterpretations).map(
                      ([key, value]) => (
                        <div key={key}>
                          <div className="mb-2 flex justify-between">
                            <span className="text-sm font-medium capitalize">{key}</span>
                            <span className="text-sm font-medium">
                              {calculatedScores[key] || 0} /{' '}
                              {currentInventory?.scoring.subscales?.[key]?.maxRawScore || '--'}
                            </span>
                          </div>
                          <Progress
                            value={
                              ((calculatedScores[key] || 0) /
                                (currentInventory?.scoring.subscales?.[key]?.maxRawScore || 100)) *
                              100
                            }
                            className={`h-3 ${getScoreColor(
                              calculatedScores[key] || 0,
                              currentInventory?.scoring.subscales?.[key]?.maxRawScore || 100,
                            )}`}
                          />
                          <div className="mt-2">
                            <Badge variant="outline" className="mb-1">
                              {value.label}
                            </Badge>
                            <p className="text-muted-foreground text-sm">{value.recommendation}</p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Aviso Importante</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Este resultado não substitui uma avaliação profissional de saúde mental. Se você
                está com dificuldades, recomendamos buscar ajuda profissional.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Suas Respostas</CardTitle>
              <CardDescription>Revise as respostas que você forneceu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responses.map((response, index) => (
                  <div key={index} className="rounded-md border p-3">
                    <p className="mb-1 font-medium">{response.questionTitle}</p>
                    <p className="text-muted-foreground text-sm">
                      Resposta: {response.optionLabel}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button variant="outline" onClick={handleDownloadResults}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Resultados
        </Button>
        <Button onClick={handleBackToQuestionnaires}>
          <Home className="mr-2 h-4 w-4" />
          Voltar para Questionários
        </Button>
      </div>
    </div>
  );
}
