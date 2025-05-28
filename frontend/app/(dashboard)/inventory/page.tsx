'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Inventory, InventoryService } from '@/services/inventory-service';
import { useInventoryStore } from '@/store/inventory-store';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Users,
  ArrowRight,
  Heart,
  TriangleAlert,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Loading from './loading';

// Enhanced Error Component
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center">
    <div className="bg-destructive/10 rounded-full p-4">
      <AlertCircle className="text-destructive h-12 w-12" />
    </div>
    <div className="space-y-2">
      <h3 className="text-foreground text-lg font-semibold">Algo deu errado</h3>
      <p className="text-muted-foreground max-w-md">{error}</p>
    </div>
    <Button onClick={onRetry} variant="outline" className="gap-2">
      <ArrowRight className="h-4 w-4" />
      Tentar Novamente
    </Button>
  </div>
);

// Enhanced Empty State Component
const EmptyState = () => (
  <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center">
    <div className="bg-muted/50 rounded-full p-6">
      <BookOpen className="text-muted-foreground h-16 w-16" />
    </div>
    <div className="space-y-2">
      <h3 className="text-foreground text-lg font-semibold">Nenhum questionário disponível</h3>
      <p className="text-muted-foreground max-w-md">
        No momento não há questionários disponíveis. Volte em breve para novos conteúdos.
      </p>
    </div>
  </div>
);

// Enhanced Inventory Card Component
const InventoryCard = ({ inventory }: { inventory: Inventory }) => {
  const estimatedTime = Math.ceil(inventory.questions.length * 0.5); // 30 seconds per question

  return (
    <Card className="group bg-card/50 hover:shadow-primary/5 h-full overflow-hidden border-0 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-foreground group-hover:text-primary line-clamp-2 text-lg leading-tight font-semibold transition-colors">
            {inventory.title}
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {inventory.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <BookOpen className="text-primary h-4 w-4" />
            <span>{inventory.questions.length} perguntas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="text-secondary h-4 w-4" />
            <span>~{estimatedTime} min</span>
          </div>
        </div>

        {inventory.source && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Users className="h-3 w-3" />
            <span>Baseado em: {inventory.source}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4">
        <Link href={`/inventory/${inventory.id}`} className="w-full">
          <Button className="w-full gap-2 transition-all duration-200 hover:gap-3" size="default">
            <Heart className="h-4 w-4" />
            Iniciar Avaliação
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

// Main Page Component
export default function InventoriesPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resetState = useInventoryStore((state) => state.resetState);

  const fetchInventories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await InventoryService.getInventories();
      setInventories(data);
    } catch (err) {
      console.error('Failed to fetch inventories:', err);
      setError(
        'Não foi possível carregar os questionários. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resetState();
    fetchInventories();
  }, [resetState]);

  return (
    <div className="from-background via-background to-muted/30 min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Hero Section */}
          <div className="animate-fade-in space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              {/* <div className="bg-primary/10 text-primary inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
                <Heart className="mr-2 h-4 w-4" />
                Cuidado Personalizado
              </div> */}

              <h1 className="text-green-dark font-varela text-3xl font-bold md:text-4xl">
                Questionários de Saúde Mental
              </h1>

              <p className="text-muted-foreground text-lg leading-relaxed">
                Avalie seu bem-estar mental com questionários cientificamente validados. Seus dados
                são protegidos e você mantém controle total sobre suas informações.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Seguro e Privado</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span>Cientificamente Validado</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span>Resultado Imediato</span>
              </div>
            </div>

            {/* Info Section */}
            {!loading && !error && inventories.length > 0 && (
              <Card className="from-muted/50 to-accent/10 border-destructive rounded-sm border bg-gradient-to-r backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto max-w-2xl space-y-4">
                    <h3 className="text-green-dark font-varela flex items-center justify-center text-xl font-semibold">
                      <TriangleAlert className="text-destructive mr-2" />
                      Informações Importantes
                      <TriangleAlert className="text-destructive ml-2" />
                    </h3>
                    <p className="text-muted-foreground">
                      Estes questionários são ferramentas de rastreamento e não substituem uma
                      avaliação profissional completa. Se você está passando por dificuldades
                      significativas, recomendamos buscar ajuda de um profissional de saúde mental.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 text-sm"></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Illustration */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="from-primary/20 via-secondary/20 to-accent/20 absolute inset-0 rounded-3xl bg-gradient-to-r blur-3xl"></div>
              <Image
                src="/questionnaire.png"
                alt="Ilustração representando questionários de saúde mental"
                width={500}
                height={500}
                className="relative z-10 mx-auto max-w-sm drop-shadow-2xl lg:max-w-md xl:max-w-lg"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtgJyBzPZIQAAAABJRU5ErkJggg=="
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mt-16 space-y-8">
          {/* Section Header */}
          <div className="text-center">
            <h2 className="text-green-dark font-varela text-2xl font-bold lg:text-3xl">
              Escolha uma Avaliação
            </h2>
            <p className="text-muted-foreground mt-2">
              Selecione o questionário que melhor se adequa às suas necessidades
            </p>
          </div>

          {/* Error State */}
          {error && <ErrorState error={error} onRetry={fetchInventories} />}

          {/* Loading State */}
          {loading && !error && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Loading key={index} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && inventories.length === 0 && <EmptyState />}

          {/* Inventories Grid */}
          {!loading && !error && inventories.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {inventories.map((inventory) => (
                <InventoryCard key={inventory.id} inventory={inventory} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
