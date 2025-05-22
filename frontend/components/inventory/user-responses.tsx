'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryService, InventoryResponse } from '@/services/inventory-service';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { AlertCircle, BarChart4, Clock, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserResponses() {
  const [responses, setResponses] = useState<InventoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingConsent, setWithdrawingConsent] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchResponses() {
      try {
        setLoading(true);
        const data = await InventoryService.getUserResponses();
        setResponses(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch user responses:', err);
        setError(
          'Não foi possível carregar seus questionários respondidos. Por favor, tente novamente mais tarde.',
        );
      } finally {
        setLoading(false);
      }
    }

    fetchResponses();
  }, []);

  const handleViewResult = (responseId: string, inventoryId: string) => {
    router.push(`/inventory/${inventoryId}/result`);
  };

  const handleWithdrawConsent = async (responseId: string) => {
    try {
      setWithdrawingConsent(responseId);
      await InventoryService.withdrawConsent(responseId);

      // Remove from list
      setResponses(responses.filter((r) => r.id !== responseId));
    } catch (err) {
      console.error('Failed to withdraw consent:', err);
      setError('Não foi possível revogar o consentimento. Por favor, tente novamente.');
    } finally {
      setWithdrawingConsent(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </CardContent>
            <CardFooter>
              <Skeleton className="mr-2 h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (responses.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Nenhum questionário respondido</AlertTitle>
        <AlertDescription>
          Você ainda não respondeu nenhum questionário. Acesse a página de questionários para
          começar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <Card key={response.id}>
          <CardHeader>
            <CardTitle>{response.inventoryTitle}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Completado em {formatDate(response.completedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <BarChart4 className="text-primary h-4 w-4" />
              <span className="font-medium">Resultado:</span>
              <Badge variant="outline">{response.interpretationResults.label}</Badge>
            </div>

            {/* Show subscales if available */}
            {response.interpretationResults.subscaleInterpretations &&
              Object.keys(response.interpretationResults.subscaleInterpretations).length > 0 && (
                <div className="text-muted-foreground mt-2 text-sm">
                  <p>Categorias avaliadas:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(response.interpretationResults.subscaleInterpretations).map(
                      ([key, value]) => (
                        <Badge key={key} variant="secondary" className="capitalize">
                          {key}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="default"
              onClick={() => handleViewResult(response.id, response.inventoryId)}
            >
              Ver Resultado
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revogar Consentimento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja revogar seu consentimento para este questionário? Seus
                    dados serão anonimizados e você não poderá mais acessar este resultado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleWithdrawConsent(response.id)}
                    disabled={withdrawingConsent === response.id}
                  >
                    {withdrawingConsent === response.id
                      ? 'Processando...'
                      : 'Revogar Consentimento'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
