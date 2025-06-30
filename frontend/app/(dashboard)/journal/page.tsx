'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { JournalCard } from '@/components/journal/journal-card';
import { AdvancedJournalSearch } from '@/components/journal/journal-search';
import { useJournalStore } from '@/store/journal-store';
import type { Journal } from '@/store/journal-store';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { SyncStatusIndicator } from '@/components/journal/sync-status';
import { useMobile } from '@/hooks/use-mobile';
import { useIsMobileDevice } from '@/hooks/use-virtual-keyboard';

export default function JournalPage() {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const isMobile = useMobile();
  const isMobileDevice = useIsMobileDevice();

  // Store state and actions
  const {
    entries,
    isLoading,
    error,
    getAllJournals,
    createJournal,
    deleteJournal,
    clearError,
    searchFilters,
  } = useJournalStore();

  // Offline sync
  const { isOnline, isSyncing, pendingChanges, lastSync, syncNow, initializeOfflineStorage } =
    useOfflineSync();

  // Initialize offline storage and load data
  useEffect(() => {
    const init = async () => {
      try {
        await initializeOfflineStorage();
        await getAllJournals();
        setIsInitialized(true);
      } catch (error) {
        console.error('Falha ao inicializar:', error);
        toast.error('Falha ao inicializar o diário. Por favor, atualize a página.');
      }
    };

    init();
  }, [initializeOfflineStorage, getAllJournals]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingChanges > 0) {
      syncNow();
    }
  }, [isOnline, pendingChanges, syncNow]);

  // Filter entries based on search filters
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by search query
    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase();
      filtered = filtered.filter((entry) => {
        const searchableText = [
          entry.title,
          JSON.stringify(entry.content),
          entry.mood || '',
          ...(entry.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Filter by mood
    if (searchFilters.mood) {
      filtered = filtered.filter((entry) => entry.mood === searchFilters.mood);
    }

    // Filter by tags
    if (searchFilters.tags && searchFilters.tags.length > 0) {
      filtered = filtered.filter((entry) =>
        searchFilters.tags!.some((tag) => entry.tags.includes(tag)),
      );
    }

    // Filter by date range
    if (searchFilters.startDate) {
      filtered = filtered.filter(
        (entry) => new Date(entry.created_at) >= new Date(searchFilters.startDate!),
      );
    }

    if (searchFilters.endDate) {
      filtered = filtered.filter(
        (entry) => new Date(entry.created_at) <= new Date(searchFilters.endDate!),
      );
    }

    return filtered;
  }, [entries, searchFilters]);

  // Sort entries by creation date (most recent first)
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [filteredEntries]);

  // Handle creating a new journal entry
  const handleCreateEntry = async () => {
    try {
      const newEntry = await createJournal();
      toast.success('Nova entrada criada com sucesso');
      router.push(`/journal/${newEntry.id}`);
    } catch (error) {
      toast.error('Falha ao criar entrada no diário');
      console.error('Erro ao criar entrada do diário:', error);
    }
  };

  // Handle deleting a journal entry
  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteJournal(id);
      toast.success('Entrada deletada com sucesso');
    } catch (error) {
      toast.error('Falha ao deletar entrada');
      console.error('Error deleting journal:', error);
    }
  };

  // Handle clicking on a journal entry
  const handleEntryClick = (entry: Journal) => {
    router.push(`/journal/${entry.id}`);
  };

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      await syncNow();
      toast.success('Sincronização concluída com sucesso');
    } catch (error) {
      toast.error('Sincronização falhou. Tente novamente.');
    }
  };

  if (!isInitialized) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#7F9463] border-t-transparent"></div>
            <p className="text-beige-medium">Inicializando diário...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header with sync status */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-green-dark font-varela text-3xl font-bold md:text-4xl">Diário</h1>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingChanges={pendingChanges}
              lastSync={lastSync}
              compact={isMobileDevice}
            />
            <Button
              onClick={handleCreateEntry}
              className="font-varela font-bold"
              disabled={isLoading}
            >
              <Plus size={18} className="mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Offline indicator */}
        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-100 p-3">
            <WifiOff size={18} className="text-yellow-700" />
            <span className="text-sm text-yellow-700">
              Você está offline. Suas alterações serão sincronizadas quando a conexão for
              restaurada.
            </span>
            {pendingChanges > 0 && (
              <span className="ml-auto text-sm font-medium text-yellow-700">
                {pendingChanges}{' '}
                {pendingChanges === 1 ? 'alteração pendente' : 'alterações pendentes'}
              </span>
            )}
          </div>
        )}

        {/* Manual sync button when there are pending changes */}
        {isOnline && pendingChanges > 0 && !isSyncing && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
            <span className="text-sm text-blue-700">
              Você tem {pendingChanges}{' '}
              {pendingChanges === 1 ? 'alteração não salva' : 'alterações não salvas'}.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSync}
              className="border-blue-400 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw size={14} className="mr-2" />
              Sincronizar Agora
            </Button>
          </div>
        )}
      </div>

      {/* Advanced search */}
      <AdvancedJournalSearch className="mb-6" />

      {/* Loading State */}
      {isLoading && entries.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#7F9463] border-t-transparent"></div>
            <p className="text-beige-medium">Carregando suas entradas...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedEntries.length === 0 && !searchFilters.query && (
        <div className="py-12 text-center">
          <div className="bg-beige-light/40 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
            <Plus size={32} className="text-blue-dark" />
          </div>
          <h3 className="text-grey-dark mb-2 text-lg font-medium">Nenhuma entrada ainda</h3>
          <p className="text-beige-dark mb-4">
            Comece a documentar seus pensamentos e experiências.
          </p>
          <Button
            onClick={handleCreateEntry}
            className="font-varela font-bold"
            disabled={isLoading}
          >
            <Plus size={18} className="mr-2" />
            Criar Primeira Entrada
          </Button>
        </div>
      )}

      {/* No Search Results */}
      {!isLoading &&
        sortedEntries.length === 0 &&
        (searchFilters.query || searchFilters.mood || searchFilters.tags) && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#F2DECC]/20">
              <Search size={32} className="text-[#7F9463]" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-[#797D89]">Nenhuma entrada encontrada</h3>
            <p className="mb-4 text-[#91857A]">
              Nenhuma entrada corresponde aos seus critérios de busca.
            </p>
            <Button
              onClick={() => {
                // Clear search by triggering a new search with empty filters
                const store = useJournalStore.getState();
                store.searchJournals({});
              }}
              variant="outline"
              className="border-[#7F9463] text-[#7F9463] hover:bg-[#7F9463] hover:text-white"
            >
              Limpar Busca
            </Button>
          </div>
        )}

      {/* Journal Entries List */}
      {!isLoading && sortedEntries.length > 0 && (
        <div className="space-y-4">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="relative">
              <JournalCard
                entry={entry}
                onDelete={handleDeleteEntry}
                onClick={() => handleEntryClick(entry)}
              />
              {/* Sync status indicator for individual entries */}
              {entry._syncStatus === 'pending' && (
                <div className="absolute top-2 right-2">
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"
                    title="Sincronização pendente"
                  />
                </div>
              )}
              {entry._syncStatus === 'error' && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" title="Erro de sincronização" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search Results Count */}
      {(searchFilters.query || searchFilters.mood || searchFilters.tags) &&
        sortedEntries.length > 0 && (
          <div className="text-beige-dark mt-6 text-center text-sm">
            {sortedEntries.length === 1
              ? 'Encontrada 1 entrada'
              : `Encontradas ${sortedEntries.length} entradas`}
          </div>
        )}
    </div>
  );
}
