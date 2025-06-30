'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Heart,
  Phone,
  MessageCircle,
  Calendar,
  BookOpen,
  Zap,
  Shield,
  Brain,
  Users,
  Activity,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  HeadphonesIcon,
  Stethoscope,
  PenTool,
  Wind,
  TrendingUp,
  Home,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface SeverityLevel {
  level: 'normal' | 'mild' | 'moderate' | 'severe' | 'crisis';
  score: number;
  percentage: number;
}

interface SubscaleScores {
  [key: string]: {
    score: number;
    severity: string;
    interpretation: {
      label: string;
      recommendation: string;
    };
  };
}

interface InterpretationResults {
  label: string;
  recommendation: string;
  severity?: string;
  subscaleInterpretations?: SubscaleScores;
}

// Add proper type for action cards
interface ActionCardConfig {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  action: string;
}

// Add proper type for feature names
type FeatureName = 'meditation' | 'journal' | 'resources' | 'professional' | 'cvv';

interface DynamicResultsProps {
  calculatedScores: any;
  interpretationResults: InterpretationResults;
  currentInventory: any;
  responses: any[];
  onFeatureAction: (feature: string, data?: any) => void;
}

// Severity Detection Logic
const detectSeverityLevel = (
  calculatedScores: any,
  interpretationResults: InterpretationResults,
  responses: any[],
): SeverityLevel => {
  // Check interpretation severity
  const severity = interpretationResults.severity?.toLowerCase();
  const totalScore = calculatedScores.total || 0;
  const maxScore = 100; // Adjust based on your scoring system
  const percentage = (totalScore / maxScore) * 100;

  if (severity === 'severe' || percentage >= 80) {
    return { level: 'severe', score: totalScore, percentage };
  }

  if (severity === 'moderate' || percentage >= 60) {
    return { level: 'moderate', score: totalScore, percentage };
  }

  if (severity === 'mild' || percentage >= 30) {
    return { level: 'mild', score: totalScore, percentage };
  }

  return { level: 'normal', score: totalScore, percentage };
};

// Feature Configuration by Severity
const getFeatureConfig = (severity: SeverityLevel['level']) => {
  const configs = {
    normal: {
      primaryColor: 'green',
      headerBg: 'bg-green-50 dark:bg-green-950/20',
      headerBorder: 'border-green-200 dark:border-green-800',
      accentColor: 'text-green-600 dark:text-green-400',
      buttonVariant: 'default' as const,
      tone: 'congratulatory',
      primaryFeatures: ['meditation', 'journal'],
      urgencyLevel: 'low',
    },
    mild: {
      primaryColor: 'blue',
      headerBg: 'bg-blue-50 dark:bg-blue-950/20',
      headerBorder: 'border-blue-200 dark:border-blue-800',
      accentColor: 'text-blue-600 dark:text-blue-400',
      buttonVariant: 'default' as const,
      tone: 'supportive',
      primaryFeatures: ['resources', 'meditation', 'journal'],
      urgencyLevel: 'low',
    },
    moderate: {
      primaryColor: 'yellow',
      headerBg: 'bg-yellow-50 dark:bg-yellow-950/20',
      headerBorder: 'border-yellow-200 dark:border-yellow-800',
      accentColor: 'text-yellow-600 dark:text-yellow-400',
      buttonVariant: 'default' as const,
      tone: 'encouraging',
      primaryFeatures: ['professional', 'resources', 'meditation'],
      urgencyLevel: 'medium',
    },
    severe: {
      primaryColor: 'orange',
      headerBg: 'bg-orange-50 dark:bg-orange-950/20',
      headerBorder: 'border-orange-200 dark:border-orange-800',
      accentColor: 'text-orange-600 dark:text-orange-400',
      buttonVariant: 'default' as const,
      tone: 'urgent',
      primaryFeatures: ['professional', 'cvv', 'emergency'],
      urgencyLevel: 'high',
    },
    crisis: {
      primaryColor: 'red',
      headerBg: 'bg-red-50 dark:bg-red-950/20',
      headerBorder: 'border-red-200 dark:border-red-800',
      accentColor: 'text-red-600 dark:text-red-400',
      buttonVariant: 'destructive' as const,
      tone: 'immediate',
      primaryFeatures: ['cvv-immediate', 'emergency', 'crisis-chat'],
      urgencyLevel: 'critical',
    },
  };

  return configs[severity];
};

// Messages by Severity
const getMessagesConfig = (severity: SeverityLevel['level']) => {
  const messages = {
    normal: {
      title: '🎉 Excelente Trabalho!',
      subtitle: 'Seus resultados indicam que você está gerenciando bem seu bem-estar mental.',
      description:
        'Continue priorizando seu autocuidado. As ferramentas abaixo podem ajudar a manter esse equilíbrio positivo.',
      ctaText: 'Experimente uma meditação.',
    },
    mild: {
      title: '💙 Você Está no Caminho Certo',
      subtitle: 'Seus resultados mostram alguns desafios que você está enfrentando.',
      description:
        'Isso é mais comum do que imagina. Continue cuidando da sua saúde mental com hábitos saudáveis. Considere iniciar um diário de gratidão para manter o foco positivo.',
      ctaText: 'Registre seus pensamentos',
    },
    moderate: {
      title: '🤝 Apoio Disponível Para Você',
      subtitle:
        'Seus resultados mostram que você está lidando com dificuldades emocionais mais significativas que muitas pessoas enfrentam.',
      description:
        'É importante buscar apoio adicional. Você deu um passo importante, e estamos aqui para apoiar.',
      ctaText: 'Explore nosso conteúdo educacional',
    },
    severe: {
      title: '🛟 Você precisa de apoio profissional',
      subtitle: 'Suas respostas indicam desafios que estão impactando sua vida.',
      description:
        'Sua saúde mental é uma prioridade. Por favor, conecte-se com os recursos de apoio profissional disponíveis.',
      ctaText: 'Buscar Ajuda Profissional Agora',
    },
    crisis: {
      title: '🚨 Você não está sozinho(a). Estamos aqui para ajudar.',
      subtitle:
        'Suas respostas mostram que você está passando por um momento extremamente difícil. O que você sente é sério, mas tratável. A ajuda está disponível.',
      description:
        'Existem pessoas que querem te ouvir. Que tal ligar para o seu contato de emergência ou com pessoas que podem te ajudar?',
      ctaText: 'Falar com Alguém Agora',
    },
  };

  return messages[severity];
};

// Action Cards Component
const ActionCard = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  urgent = false,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  action: string;
  variant?: 'default' | 'outline' | 'destructive';
  urgent?: boolean;
  onClick: () => void;
}) => (
  <Card
    className={cn(
      'cursor-pointer transition-all duration-200 hover:shadow-md',
      urgent && 'animate-pulse shadow-lg ring-2 ring-red-500',
    )}
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'rounded-full p-3',
            urgent ? 'bg-red-100 dark:bg-red-950/20' : 'bg-primary/10',
          )}
        >
          <Icon className={cn('h-6 w-6', urgent ? 'text-red-600' : 'text-primary')} />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-muted-foreground text-sm">{description}</p>
          <Button variant={variant} size="sm" className="w-full gap-2">
            {title}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Crisis Interface Component
const CrisisInterface = ({ onFeatureAction }: { onFeatureAction: (feature: string) => void }) => (
  <div className="space-y-6">
    <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">Apoio Imediato Disponível</AlertTitle>
      <AlertDescription className="mt-2 text-base">
        Sua segurança é o mais importante neste momento. Pessoas treinadas estão disponíveis para
        conversar com você agora mesmo.
      </AlertDescription>
    </Alert>

    <div className="grid gap-4 md:grid-cols-2">
      <ActionCard
        icon={Phone}
        title="Ligar para CVV"
        description="Apoio emocional gratuito 24h - 188"
        action="call_cvv"
        variant="destructive"
        urgent={true}
        onClick={() => onFeatureAction('call_cvv')}
      />

      <ActionCard
        icon={MessageCircle}
        title="Chat CVV"
        description="Conversa por chat anônima e sigilosa"
        action="chat_cvv"
        variant="destructive"
        urgent={true}
        onClick={() => onFeatureAction('chat_cvv')}
      />

      <ActionCard
        icon={PhoneCall}
        title="Emergência 192"
        description="Serviços de emergência médica"
        action="emergency_call"
        variant="outline"
        onClick={() => onFeatureAction('emergency_call')}
      />

      <ActionCard
        icon={Stethoscope}
        title="Profissional Urgente"
        description="Conectar com psicólogo/psiquiatra"
        action="urgent_professional"
        variant="outline"
        onClick={() => onFeatureAction('urgent_professional')}
      />
    </div>

    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <Heart className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-blue-800 dark:text-blue-300">
            Lembre-se: Isso Vai Passar
          </h4>
        </div>
        <p className="text-sm leading-relaxed text-blue-700 dark:text-blue-400">
          Crises são temporárias. Você já passou por momentos difíceis antes e pode passar por este
          também. Não hesite em buscar ajuda - é um sinal de força, não de fraqueza.
        </p>
      </CardContent>
    </Card>
  </div>
);

// Main Component
export const DynamicResultsInterface = ({
  calculatedScores,
  interpretationResults,
  currentInventory,
  responses,
  onFeatureAction,
}: DynamicResultsProps) => {
  const router = useRouter();
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [messages, setMessages] = useState<any>(null);

  useEffect(() => {
    const detectedSeverity = detectSeverityLevel(
      calculatedScores,
      interpretationResults,
      responses,
    );
    setSeverity(detectedSeverity);
    setConfig(getFeatureConfig(detectedSeverity.level));
    setMessages(getMessagesConfig(detectedSeverity.level));
  }, [calculatedScores, interpretationResults, responses]);

  if (!severity || !config || !messages) {
    return <div>Carregando...</div>;
  }

  // Crisis mode renders completely different interface
  if (severity.level === 'crisis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold text-red-800 dark:text-red-300">
              {messages.title}
            </h1>
            <p className="mb-2 text-xl text-red-700 dark:text-red-400">{messages.subtitle}</p>
            <p className="text-red-600 dark:text-red-500">{messages.description}</p>
          </div>

          <CrisisInterface onFeatureAction={onFeatureAction} />
        </div>
      </div>
    );
  }

  // Regular interface for other severity levels
  const getActionCards = (): ActionCardConfig[] => {
    const baseCards: Record<FeatureName, ActionCardConfig> = {
      meditation: {
        icon: Wind,
        title: 'Exercícios de Respiração',
        description: 'Técnicas para relaxamento imediato',
        action: 'meditation',
      },
      journal: {
        icon: PenTool,
        title: 'Diário Pessoal',
        description: 'Expresse seus pensamentos e sentimentos',
        action: 'journal',
      },
      resources: {
        icon: BookOpen,
        title: 'Recursos Educativos',
        description: 'Materiais sobre saúde mental',
        action: 'resources',
      },
      professional: {
        icon: Users,
        title: 'Conectar com Profissional',
        description: 'Psicólogos e psiquiatras qualificados',
        action: 'professional',
      },
      cvv: {
        icon: HeadphonesIcon,
        title: 'CVV - Centro de Valorização da Vida',
        description: 'Apoio emocional gratuito 24h',
        action: 'cvv',
      },
    };

    return config.primaryFeatures
      .map((feature: string) => baseCards[feature as FeatureName])
      .filter((card: ActionCardConfig | undefined): card is ActionCardConfig => Boolean(card));
  };

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br',
        severity.level === 'normal' &&
          'from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20',
        severity.level === 'mild' &&
          'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20',
        severity.level === 'moderate' &&
          'from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20',
        severity.level === 'severe' &&
          'from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20',
      )}
    >
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-medium shadow-sm">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Avaliação Concluída
          </div>

          <h1 className={cn('mb-4 text-4xl font-bold', config.accentColor)}>{messages.title}</h1>
          <p className="mb-2 text-xl">{messages.subtitle}</p>
          <p className="text-muted-foreground mx-auto max-w-2xl">{messages.description}</p>
        </div>

        {/* Score Display */}
        <Card className={cn('mb-8', config.headerBg, config.headerBorder)}>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <TrendingUp className={cn('h-5 w-5', config.accentColor)} />
              Resultado da Avaliação
            </CardTitle>
            <CardDescription>
              {currentInventory?.title} - {new Date().toLocaleDateString('pt-BR')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center">
              <div className="text-3xl font-bold">{interpretationResults.label}</div>
              <div className="text-muted-foreground text-lg">
                Pontuação: {severity.score} ({severity.percentage.toFixed(1)}%)
              </div>
              <div className="mx-auto max-w-2xl">
                <p className="text-sm leading-relaxed">{interpretationResults.recommendation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary CTA */}
        <div className="mb-8 text-center">
          <Button
            size="lg"
            className="gap-2 px-8 py-6 text-lg"
            variant={config.buttonVariant}
            onClick={() => onFeatureAction(config.primaryFeatures[0])}
          >
            <Heart className="h-5 w-5" />
            {messages.ctaText}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Action Cards */}
        <div className="space-y-6">
          <h2 className="mb-6 text-center text-2xl font-semibold">
            Recursos Recomendados Para Você
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {getActionCards().map((card: ActionCardConfig, index: number) => (
              <ActionCard
                key={index}
                icon={card.icon}
                title={card.title}
                description={card.description}
                action={card.action}
                onClick={() => onFeatureAction(card.action)}
              />
            ))}
          </div>
        </div>

        {/* Safety Notice */}
        <Card className="border-accent/20 bg-accent/5 mt-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-accent/20 rounded-full p-2">
                <Shield className="text-accent-foreground h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground font-semibold">Importante Lembrar</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Este resultado é uma ferramenta de autoavaliação e não substitui uma consulta com
                  profissional de saúde mental. Se você está enfrentando dificuldades
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

        {/* Navigation */}
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Button variant="outline" onClick={() => router.push('/inventory')} className="gap-2">
            <Home className="h-4 w-4" />
            Outras Avaliações
          </Button>
          {severity.level !== 'normal' && (
            <Button
              variant="outline"
              onClick={() => onFeatureAction('schedule_followup')}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Agendar Acompanhamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
