'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventoryStore } from '@/store/inventory-store';
import { deleteInventoryResponse } from '@/lib/actions/supabase-inventories';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, History, Calendar, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { DeleteResponseDialog } from './delete-response-dialog';
import { HistoricResultsMobile } from './historic-results-mobile';
import { HistoricResultsTable } from './historic-results-table';

export function HistoricResultsTab() {
  const router = useRouter();
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    historicResponses,
    isLoadingHistory,
    historyError,
    fetchHistoricResponses,
    deleteHistoricResponse,
  } = useInventoryStore();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch historic responses on mount
  useEffect(() => {
    fetchHistoricResponses();
  }, [fetchHistoricResponses]);

  const handleRowClick = (responseId: string, inventoryId: string) => {
    router.push(`/inventory/${inventoryId}/result/${responseId}`);
  };

  const handleDeleteClick = (responseId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedResponseId(responseId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedResponseId) {
      try {
        // Call the API to delete
        const result = await deleteInventoryResponse(selectedResponseId);

        if (result.success) {
          // Update local state
          deleteHistoricResponse(selectedResponseId);
          toast.success('Resultado excluído com sucesso');
        } else {
          toast.error(result.error || 'Falha ao excluir resultado');
        }
      } catch (error) {
        console.error('Failed to delete response:', error);
        toast.error('Falha ao excluir resultado');
      }

      setIsDeleteDialogOpen(false);
      setSelectedResponseId(null);
      // Refetch to ensure UI is in sync
      await fetchHistoricResponses();
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="space-y-4">
        <div className="mb-4 flex items-center gap-2">
          <History className="text-muted-foreground h-5 w-5" />
          <h3 className="text-lg font-semibold">Carregando histórico...</h3>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card/50">
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (historyError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar histórico</AlertTitle>
        <AlertDescription>{historyError}</AlertDescription>
      </Alert>
    );
  }

  if (historicResponses.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <div className="bg-muted/50 mx-auto w-fit rounded-full p-6">
          <Calendar className="text-muted-foreground h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Nenhum histórico encontrado</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            Você ainda não completou nenhum questionário. Complete sua primeira avaliação para ver
            seus resultados aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center gap-2">
        <History className="text-primary h-5 w-5" />
        <h3 className="text-lg font-semibold">Histórico de Avaliações</h3>
      </div>

      {isMobile ? (
        <HistoricResultsMobile
          responses={historicResponses}
          onRowClick={handleRowClick}
          onDeleteClick={handleDeleteClick}
        />
      ) : (
        <HistoricResultsTable
          responses={historicResponses}
          onRowClick={handleRowClick}
          onDeleteClick={handleDeleteClick}
        />
      )}

      <DeleteResponseDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
