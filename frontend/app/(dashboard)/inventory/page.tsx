'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function InventoriesPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const resetState = useInventoryStore((state) => state.resetState);

  useEffect(() => {
    // Reset inventory state when listing page loads
    resetState();

    async function fetchInventories() {
      try {
        setLoading(true);
        const data = await InventoryService.getInventories();
        setInventories(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch inventories:', err);
        setError(
          'Não foi possível carregar os questionários. Por favor, tente novamente mais tarde.',
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInventories();
  }, [resetState]);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div className="animate-fade-in flex flex-col gap-8 text-center">
          <h1 className="font-varela small-caps text-green-dark mb-4 text-center text-4xl leading-9 font-bold tracking-tight">
            Questionários de Saúde Mental
          </h1>
          <p className="text-base text-gray-700">
            Escolha um questionário para avaliar sua saúde mental. Seus dados são protegidos e você
            pode revogar seu consentimento a qualquer momento.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {inventories.map((inventory) => (
              <Card
                key={inventory.id}
                className="shadow-soft-md hover:shadow-soft-lg flex h-full flex-col transition-shadow"
              >
                <CardHeader>
                  <CardTitle>{inventory.title}</CardTitle>
                  <CardDescription>{inventory.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-sm">
                    {inventory.questions.length} perguntas
                  </p>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Link href={`/inventory/${inventory.id}`} className="w-full">
                    <Button variant="default" className="w-full">
                      Iniciar Questionário
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Image
            src="/questionnaire.png"
            alt="Brain with flowers"
            width={500}
            height={500}
            className="mx-auto"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            placeholder="blur" // Add placeholder for non-SVG images
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtgJyBzPZIQAAAABJRU5ErkJggg=="
          />
        </div>
      </div>
    </div>
  );
}
