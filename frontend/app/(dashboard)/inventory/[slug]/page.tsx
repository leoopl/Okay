'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  InventoryService,
  Inventory,
  Question,
  UserResponseOption,
} from '@/services/inventory-service';
import { useInventoryStore } from '@/store/inventory-store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/modify-radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function InventoryPage({ params }: { params: Promise<{ slug: string }> }) {
  // Unwrap params using React.use()
  const { slug } = use(params);

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showConsentForm, setShowConsentForm] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const { setCurrentInventory, responses, updateResponse, consentGiven, setConsent, setResults } =
    useInventoryStore();

  // Fetch inventory data
  useEffect(() => {
    async function fetchInventory() {
      try {
        setLoading(true);
        const data = await InventoryService.getInventory(slug);
        setInventory(data);
        setCurrentInventory(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError(
          'Não foi possível carregar o questionário. Por favor, tente novamente mais tarde.',
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, [slug, setCurrentInventory]);

  // Calculate progress
  const progress = inventory
    ? Math.round((currentQuestionIndex / inventory.questions.length) * 100)
    : 0;

  // Get current question
  const currentQuestion = inventory?.questions[currentQuestionIndex];

  // Check if current question has been answered
  const getCurrentResponse = () => {
    if (!currentQuestion) return null;
    return responses.find((r) => r.questionId === currentQuestion.id);
  };

  const handleOptionSelect = (optionValue: number) => {
    if (!currentQuestion) return;

    // Find the selected option to get its label
    const option = currentQuestion.options.find((opt) => opt.value === optionValue);

    // Update response in store with question title for better tracking
    updateResponse(
      currentQuestion.id,
      optionValue,
      option?.label,
      currentQuestion.title, // Pass question title
    );
  };

  const handleNext = () => {
    if (!inventory) return;

    if (currentQuestionIndex < inventory.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!inventory) return;

    try {
      setSubmitting(true);

      // Check if all questions have been answered
      if (responses.length !== inventory.questions.length) {
        setError('Por favor, responda todas as perguntas antes de enviar.');
        setSubmitting(false);
        return;
      }

      // Prepare submission data
      const submitData = {
        inventoryId: inventory.id,
        responses: responses,
        consentGiven: consentGiven,
      };

      // Submit responses
      const result = await InventoryService.submitResponse(submitData);

      // Store results in state
      setResults(result.calculatedScores, result.interpretationResults);

      // Navigate to results page
      router.push(`/inventory/${slug}/result`);
    } catch (err) {
      console.error('Failed to submit responses:', err);
      setError('Não foi possível enviar suas respostas. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Consent form component
  const ConsentForm = () => (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Consentimento para Processamento de Dados</CardTitle>
        <CardDescription>
          Antes de prosseguir, precisamos do seu consentimento para coletar e processar informações
          sobre sua saúde mental.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-md border p-4">
          <div className="flex flex-row items-start space-y-0 space-x-3">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsent(!!checked)}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="consent"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Eu concordo com o processamento dos meus dados de saúde mental
              </Label>
              <p className="text-muted-foreground text-sm">
                Eu entendo que minhas respostas serão armazenadas e processadas para fornecer uma
                avaliação de saúde mental. Posso revogar este consentimento a qualquer momento
                através do meu perfil.
              </p>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground text-sm">
          <p className="mb-2">Ao aceitar, você concorda que:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Seus dados serão armazenados com segurança e criptografados</li>
            <li>Você pode solicitar a exclusão dos seus dados a qualquer momento</li>
            <li>
              Suas informações não serão compartilhadas com terceiros sem seu consentimento
              explícito
            </li>
            <li>Suas respostas serão usadas apenas para fornecer uma avaliação personalizada</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => router.push('/inventory')}>
          Voltar
        </Button>
        <Button onClick={() => setShowConsentForm(false)} disabled={!consentGiven}>
          Continuar
        </Button>
      </CardFooter>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Skeleton className="mb-4 h-8 w-2/3" />
        <Skeleton className="mb-8 h-4 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="mb-2 h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
            <div className="ml-auto">
              <Skeleton className="h-10 w-24" />
            </div>
          </CardFooter>
        </Card>
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

  if (!inventory) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Questionário não encontrado</AlertTitle>
          <AlertDescription>O questionário solicitado não foi encontrado.</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push('/inventory')}>Voltar para Questionários</Button>
        </div>
      </div>
    );
  }

  // Show consent form first
  if (showConsentForm) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <ConsentForm />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="font-varela text-green-dark small-caps text-center text-3xl font-bold">
          {inventory.title}
        </h1>
        <div className="mt-3 flex items-center gap-4">
          <Progress value={progress} className="flex-1" />
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {currentQuestionIndex + 1} de {inventory.questions.length}
          </span>
        </div>
      </div>

      {currentQuestion && (
        <Card className="bg-transparent">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.title}</CardTitle>
            {currentQuestion.subscale && (
              <CardDescription>Categoria: {currentQuestion.subscale}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={getCurrentResponse()?.optionValue.toString() || ''}
              onValueChange={(value) => handleOptionSelect(parseInt(value))}
              aria-label={currentQuestion.title}
            >
              {currentQuestion.options.map((option) => (
                <RadioGroupItem
                  key={option.value}
                  value={option.value.toString()}
                  className="w-full"
                >
                  {option.label}
                </RadioGroupItem>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <Button onClick={handleNext} disabled={!getCurrentResponse() || submitting}>
              {currentQuestionIndex < inventory.questions.length - 1 ? (
                <>
                  Próxima
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  {submitting ? 'Enviando...' : 'Finalizar'}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
