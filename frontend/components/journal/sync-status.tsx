'use client';

import React from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SyncStatusIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync: Date | null;
  compact?: boolean;
}

export function SyncStatusIndicator({
  isOnline,
  isSyncing,
  pendingChanges,
  lastSync,
  compact = false,
}: SyncStatusIndicatorProps) {
  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff size={16} className="text-muted-foreground" />;
    }

    if (isSyncing) {
      return <RefreshCw size={16} className="animate-spin text-secondary" />;
    }

    if (pendingChanges > 0) {
      return <Cloud size={16} className="text-primary" />;
    }

    return <Cloud size={16} className="text-accent-strong" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }

    if (isSyncing) {
      return 'Sincronizando...';
    }

    if (pendingChanges > 0) {
      return `${pendingChanges} pendente${pendingChanges > 1 ? 's' : ''}`;
    }

    if (lastSync) {
      return `Sincronizado ${formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}`;
    }

    return 'Sincronizado';
  };

  const getTooltipContent = () => {
    const lines = [];

    if (!isOnline) {
      lines.push('Você está offline');
      lines.push('As alterações serão sincronizadas quando a conexão for restaurada');
    } else if (isSyncing) {
      lines.push('Sincronizando seus dados...');
    } else if (pendingChanges > 0) {
      lines.push(
        `${pendingChanges} ${pendingChanges === 1 ? 'alteração aguardando' : 'alterações aguardando'} sincronização`,
      );
    } else if (lastSync) {
      lines.push(
        `Última sincronização ${formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}`,
      );
    } else {
      lines.push('Todas as alterações foram sincronizadas');
    }

    return lines.join('\\n');
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help items-center justify-center rounded-full p-2 transition-colors hover:bg-muted">
              {getStatusIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm whitespace-pre-line">{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-help items-center gap-2 rounded-full bg-muted px-3 py-1.5 transition-colors hover:bg-muted/80">
            {getStatusIcon()}
            <span className="text-sm text-foreground">{getStatusText()}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm whitespace-pre-line">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
