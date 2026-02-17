'use client';

import { useNetworkStatus } from '@/providers/network-status-provider';
import { getSyncService } from '@/service/sync-service';
import { useState } from 'react';

interface OfflineBannerProps {
  pendingChanges?: number;
}

export function OfflineBanner({ pendingChanges }: OfflineBannerProps) {
  const { isOnline, isChecking, checkNow } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  // Only render when offline
  if (isOnline) return null;

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      checkNow(); // Re-check connectivity first
      await getSyncService().syncAll();
    } catch {
      // Sync errors are handled inside syncAll()
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900"
    >
      <span>
        {isChecking ? 'Verificando conexão...' : 'Você está offline. Alterações serão sincronizadas automaticamente.'}
        {pendingChanges !== undefined && pendingChanges > 0 && (
          <span className="ml-1">({pendingChanges} pendente{pendingChanges !== 1 ? 's' : ''})</span>
        )}
      </span>

      <button
        onClick={handleSyncNow}
        disabled={isSyncing || isChecking}
        className="shrink-0 rounded bg-yellow-700 px-3 py-1 text-xs text-white transition-colors hover:bg-yellow-800 disabled:opacity-50"
      >
        {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
      </button>
    </div>
  );
}
