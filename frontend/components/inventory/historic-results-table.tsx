'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Calendar, BarChart4, FileText } from 'lucide-react';
import type { InventoryResponse } from '@/lib/actions/supabase-inventories';
import { formatDate } from '@/lib/utils';

interface HistoricResultsTableProps {
  responses: InventoryResponse[];
  onRowClick: (responseId: string, inventoryId: string) => void;
  onDeleteClick: (responseId: string, event: React.MouseEvent) => void;
}

export function HistoricResultsTable({
  responses,
  onRowClick,
  onDeleteClick,
}: HistoricResultsTableProps) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Questionário
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <BarChart4 className="h-4 w-4" />
                Resultado
              </div>
            </TableHead>
            <TableHead className="w-[100px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response) => {
            const inventory = (response as any).inventories;

            return (
              <TableRow
                key={response.id}
                className="hover:bg-accent/5 cursor-pointer"
                onClick={() => onRowClick(response.id, response.inventory_id)}
              >
                <TableCell className="font-medium">{formatDate(response.completed_at)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {inventory?.title || 'Questionário não identificado'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {/* <Badge
                      className={`${getSeverityColor(result?.severity)} border-0`}
                      variant="secondary"
                    >
                      {result?.label || 'Resultado não disponível'}
                    </Badge> */}
                    {response.calculated_scores && (
                      <p className="text-muted-foreground text-sm">
                        Pontuação: {(response.calculated_scores as any).total || 0}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={(e) => onDeleteClick(response.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir resultado</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
