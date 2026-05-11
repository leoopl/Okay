'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import MedicationHistoryReports from '@/components/medication/medication-history-reports';
import MedicationList from '@/components/medication/medication-list';
import MedicationSchedule from '@/components/medication/medication-schedule';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useMedicationStore } from '@/store/medication-store';
import { useMobile } from '@/hooks/use-mobile';
import { Loader2, AlertCircle, RefreshCw, Pill, Calendar, BarChart3 } from 'lucide-react';

// Type definitions
type TabValue = 'medications' | 'schedule' | 'history';

// Constants
const TABS_CONFIG = {
  medications: {
    label: 'Medicamentos',
    icon: Pill,
    description: 'Gerencie sua lista de medicamentos',
  },
  schedule: {
    label: 'Agenda',
    icon: Calendar,
    description: 'Visualize e registre as doses de hoje',
  },
  history: {
    label: 'Histórico e Relatórios',
    icon: BarChart3,
    description: 'Acompanhe a adesão e visualize relatórios',
  },
} as const;

const DEFAULT_TAB: TabValue = 'medications';

export default function MedicationPage() {
  const { loadingStates, errors, fetchMedications, fetchTodaySchedule, clearAllErrors } =
    useMedicationStore();
  const isMobile = useMobile();

  const [activeTab, setActiveTab] = useState<TabValue>(DEFAULT_TAB);

  // Computed loading and error states
  const isInitialLoading = loadingStates.medications && !Object.keys(errors).length;
  const hasGlobalError = errors.medications && !loadingStates.medications;
  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  // Initialize data
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const initializeData = async () => {
      try {
        if (isMounted) {
          // Clear any existing errors
          clearAllErrors();

          // Load initial data
          await Promise.allSettled([fetchMedications(), fetchTodaySchedule()]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Falha ao inicializar dados de medicamentos:', error);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [fetchMedications, fetchTodaySchedule, clearAllErrors]);

  // tab change handler
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TabValue);
  }, []);

  // Retry handler for global errors
  const handleRetry = useCallback(async () => {
    try {
      clearAllErrors();
      await Promise.allSettled([fetchMedications(), fetchTodaySchedule()]);
    } catch (error) {
      console.error('Tentativa falhou:', error);
    }
  }, [fetchMedications, fetchTodaySchedule, clearAllErrors]);

  // Memoized tab content to prevent unnecessary re-renders
  const TabContent = useMemo(
    () => ({
      medications: <MedicationList />,
      schedule: <MedicationSchedule />,
      history: <MedicationHistoryReports />,
    }),
    [],
  );

  if (isInitialLoading) {
    return (
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="py-16 text-center">
            <Loader2 className="text-accent-strong mx-auto mb-6 h-12 w-12 animate-spin" />
            <h2 className="text-accent-strong mb-2 text-xl font-semibold sm:text-2xl">
              Carregando Rastreador de Medicamentos
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Por favor, aguarde enquanto carregamos seus dados de medicamentos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Global error state
  if (hasGlobalError) {
    return (
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="py-16 text-center">
            <AlertCircle className="text-destructive mx-auto mb-6 h-16 w-16" />
            <h2 className="text-destructive mb-2 text-xl font-semibold sm:text-2xl">
              Não foi possível carregar o Rastreador de Medicamentos
            </h2>
            <p className="text-destructive mx-auto mb-6 max-w-md text-sm sm:text-base">
              {errors.medications?.message ||
                'Ocorreu um erro inesperado ao carregar seus dados de medicamentos.'}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={handleRetry}
                disabled={isAnyLoading}
                variant="outline"
                className="gap-2"
              >
                {isAnyLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Tentar Novamente
              </Button>
              <Button onClick={() => window.location.reload()} variant="secondary">
                Recarregar Página
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-accent-strong font-varela text-2xl font-bold sm:text-3xl md:text-4xl">
              Rastreador de Medicamentos
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {TABS_CONFIG[activeTab].description}
            </p>
          </div>

          {/* Global loading indicator */}
          {isAnyLoading && (
            <div className="text-accent-strong mt-4 flex items-center justify-center gap-2 sm:justify-start">
              <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
              <span className="text-sm font-medium">Atualizando...</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-2">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-muted/40 grid h-auto w-full grid-cols-3">
              {Object.entries(TABS_CONFIG).map(([value, config]) => {
                const IconComponent = config.icon;
                return (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="data-[state=active]:text-primary data-[state=active]:bg-background flex-col gap-1 px-2 py-3 text-xs transition-colors sm:flex-row sm:gap-2 sm:py-2 sm:text-sm"
                    aria-label={config.description}
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    <span className="truncate leading-tight">{isMobile ? null : config.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <Card className="border-border bg-card/80 min-h-150 p-4 sm:p-6">
              <TabsContent value="medications" className="mt-0">
                {TabContent.medications}
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 space-y-4">
                {TabContent.schedule}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                {TabContent.history}
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
