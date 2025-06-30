'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, BarChart4, ChevronRight } from 'lucide-react';
import type { InventoryResponse } from '@/lib/actions/supabase-inventories';
import { formatDate } from '@/lib/utils';

interface HistoricResultsMobileProps {
  responses: InventoryResponse[];
  onRowClick: (responseId: string, inventoryId: string) => void;
  onDeleteClick: (responseId: string, event: React.MouseEvent) => void;
}

export function HistoricResultsMobile({
  responses,
  onRowClick,
  onDeleteClick,
}: HistoricResultsMobileProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'mild':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'severe':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {responses.map((response) => {
        const inventory = (response as any).inventories;
        const result = response.interpretation_results as any;

        return (
          <Card
            key={response.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => onRowClick(response.id, response.inventory_id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <h4 className="text-base font-semibold">
                    {inventory?.title || 'Questionário não identificado'}
                  </h4>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(response.completed_at)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2 h-8 w-8"
                  onClick={(e) => onDeleteClick(response.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir resultado</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* {inventory?.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {inventory.description}
                  </p>
                )} */}

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {/* <Badge
                      className={`${getSeverityColor(result?.severity)} border-0`}
                      variant="secondary"
                    >
                      {result?.label || 'Resultado não disponível'}
                    </Badge> */}
                    {response.calculated_scores && (
                      <div className="text-muted-foreground flex items-center gap-1 text-sm">
                        <BarChart4 className="h-3 w-3" />
                        <span>Pontuação: {(response.calculated_scores as any).total || 0}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
