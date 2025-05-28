'use client';

import { use, useEffect, useState, useCallback } from 'react';
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
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  Shield,
  Eye,
  FileText,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Loading from './loading';

// Enhanced Error Component
const ErrorState = ({ error, onBack }: { error: string; onBack: () => void }) => (
  <div className="container mx-auto max-w-2xl px-4 py-16">
    <div className="space-y-6 text-center">
      <div className="bg-destructive/10 mx-auto w-fit rounded-full p-6">
        <AlertCircle className="text-destructive h-12 w-12" />
      </div>
      <div className="space-y-2">
        <h2 className="text-foreground text-2xl font-bold">Ops! Algo deu errado</h2>
        <p className="text-muted-foreground mx-auto max-w-md">{error}</p>
      </div>
      <Button onClick={onBack} variant="outline" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Questionários
      </Button>
    </div>
  </div>
);

// Enhanced Consent Form Component
const ConsentForm = ({
  consentGiven,
  setConsent,
  onBack,
  onContinue,
  inventory,
}: {
  consentGiven: boolean;
  setConsent: (consent: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  inventory: Inventory;
}) => (
  <div className="container mx-auto max-w-4xl px-4 py-8">
    <Card className="bg-card/50 border-0 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center">
        <div className="bg-primary/10 mx-auto w-fit rounded-full p-4">
          <Shield className="text-blue-dark size-8" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">Consentimento Informado</CardTitle>
          <CardDescription className="mx-auto max-w-2xl text-base">
            Sua privacidade e bem-estar são nossa prioridade. Leia as informações abaixo antes de
            prosseguir com a avaliação.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Inventory Info */}
        <div className="bg-muted/30 space-y-3 rounded-lg p-6">
          <h3 className="text-foreground flex items-center gap-2 font-semibold">
            <FileText className="text-blue-dark size-5" />
            Sobre esta Avaliação
          </h3>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questionário:</span>
              <span className="font-medium">{inventory.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perguntas:</span>
              <span className="font-medium">{inventory.questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tempo estimado:</span>
              <span className="font-medium">
                ~{Math.ceil(inventory.questions.length * 0.5)} minutos
              </span>
            </div>
            {inventory.source && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Baseado em:</span>
                <span className="font-medium">{inventory.source}</span>
              </div>
            )}
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="bg-accent/10 border-accent/20 rounded-lg border p-6">
          <div className="flex items-start space-x-4">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsent(!!checked)}
              className="mt-1"
            />
            <div className="space-y-3">
              <Label
                htmlFor="consent"
                className="cursor-pointer text-base leading-none font-medium"
              >
                Eu autorizo o processamento dos meus dados de saúde mental
              </Label>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Eu compreendo que minhas respostas serão armazenadas de forma segura e criptografada
                para gerar uma avaliação personalizada. Posso revogar este consentimento a qualquer
                momento através do meu perfil.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Information */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div className="space-y-1">
              <h4 className="font-medium text-green-800 dark:text-green-300">Seus Direitos</h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                Você pode acessar, corrigir ou excluir seus dados a qualquer momento
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-800 dark:text-blue-300">Compartilhamento</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Seus dados nunca são compartilhados sem seu consentimento explícito
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        {inventory.disclaimer && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription className="text-sm">{inventory.disclaimer}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={!consentGiven} className="gap-2">
          <Heart className="h-4 w-4" />
          Iniciar Avaliação
        </Button>
      </CardFooter>
    </Card>
  </div>
);

// Enhanced Question Component
const QuestionCard = ({
  question,
  currentIndex,
  totalQuestions,
  currentResponse,
  onOptionSelect,
  onNext,
  onPrevious,
  isFirstQuestion,
  isLastQuestion,
  submitting,
}: {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  currentResponse: UserResponseOption | null;
  onOptionSelect: (value: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  submitting: boolean;
}) => {
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <Card className="bg-card/50 border-0 backdrop-blur-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            Pergunta {currentIndex + 1} de {totalQuestions}
          </Badge>
          {question.subscale && (
            <Badge variant="outline" className="text-xs">
              {question.subscale}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
        </div>

        <CardTitle className="mt-2 text-xl leading-relaxed">{question.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={currentResponse?.optionValue.toString() || ''}
          onValueChange={(value) => onOptionSelect(parseInt(value))}
          className="space-y-3"
        >
          {question.options.map((option, index) => (
            <div key={option.value} className="space-y-2">
              <RadioGroupItem
                key={index}
                value={option.value.toString()}
                className={cn(
                  'w-full rounded-lg border-2 p-4 transition-all duration-200',
                  'hover:border-primary/50 hover:bg-primary/5',
                  currentResponse?.optionValue === option.value &&
                    'border-primary bg-primary/10 shadow-sm',
                )}
              >
                <Label>{option.label}</Label>
              </RadioGroupItem>
            </div>
          ))}
        </RadioGroup>
      </CardContent>

      <CardFooter className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious} disabled={isFirstQuestion} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>

        <Button onClick={onNext} disabled={!currentResponse || submitting} className="gap-2">
          {isLastQuestion ? (
            submitting ? (
              <>
                <div className="border-primary-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Finalizar
              </>
            )
          ) : (
            <>
              Próxima
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Main Component
export default function InventoryPage({ params }: { params: Promise<{ slug: string }> }) {
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
        setError(null);
        const data = await InventoryService.getInventory(slug);
        setInventory(data);
        setCurrentInventory(data);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError(
          'Não foi possível carregar o questionário. Verifique sua conexão e tente novamente.',
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, [slug, setCurrentInventory]);

  // Get current question and response
  const currentQuestion = inventory?.questions[currentQuestionIndex];
  const getCurrentResponse = useCallback(() => {
    if (!currentQuestion) return null;
    return responses.find((r) => r.questionId === currentQuestion.id) ?? null;
  }, [currentQuestion, responses]);

  // Handle option selection
  const handleOptionSelect = useCallback(
    (optionValue: number) => {
      if (!currentQuestion) return;

      const option = currentQuestion.options.find((opt) => opt.value === optionValue);
      updateResponse(currentQuestion.id, optionValue, option?.label, currentQuestion.title);
    },
    [currentQuestion, updateResponse],
  );

  // Handle navigation
  const handleNext = useCallback(() => {
    if (!inventory) return;

    if (currentQuestionIndex < inventory.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  }, [inventory, currentQuestionIndex]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  // Handle submission
  const handleSubmit = async () => {
    if (!inventory) return;

    try {
      setSubmitting(true);

      // Validate all questions answered
      if (responses.length !== inventory.questions.length) {
        setError('Por favor, responda todas as perguntas antes de finalizar.');
        return;
      }

      // Submit responses
      const result = await InventoryService.submitResponse({
        inventoryId: inventory.id,
        responses: responses,
        consentGiven: consentGiven,
      });

      // Store results and navigate
      setResults(result.calculatedScores, result.interpretationResults);
      router.push(`/inventory/${slug}/result`);
    } catch (err) {
      console.error('Failed to submit responses:', err);
      setError('Não foi possível enviar suas respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle navigation
  const handleBack = () => router.push('/inventory');

  // Loading state
  if (loading) {
    return <Loading />;
  }

  // Error state
  if (error && !inventory) {
    return <ErrorState error={error} onBack={handleBack} />;
  }

  // Not found state
  if (!inventory) {
    return <ErrorState error="O questionário solicitado não foi encontrado." onBack={handleBack} />;
  }

  // Consent form
  if (showConsentForm) {
    return (
      <ConsentForm
        consentGiven={consentGiven}
        setConsent={setConsent}
        onBack={handleBack}
        onContinue={() => setShowConsentForm(false)}
        inventory={inventory}
      />
    );
  }

  // Main questionnaire
  return (
    <div className="from-background via-background to-muted/30 min-h-screen bg-gradient-to-br">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4 text-center">
          <h1 className="font-varela text-green-dark font-varela text-2xl font-bold lg:text-3xl">
            {inventory.title}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl">
            Responda com honestidade. Não há respostas certas ou erradas.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Question */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            currentIndex={currentQuestionIndex}
            totalQuestions={inventory.questions.length}
            currentResponse={getCurrentResponse()}
            onOptionSelect={handleOptionSelect}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstQuestion={currentQuestionIndex === 0}
            isLastQuestion={currentQuestionIndex === inventory.questions.length - 1}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
