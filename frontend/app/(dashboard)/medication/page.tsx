'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import MedicationHistoryReports from '@/components/medication/medication-history-reports';
import MedicationList from '@/components/medication/medication-list';
import MedicationSchedule from '@/components/medication/medication-schedule';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { useMedicationStore } from '@/store/medication-store';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type definitions
type TabValue = 'medications' | 'schedule' | 'history';

interface MedicationPageProps {
  className?: string;
}

// Constants
const TABS_CONFIG = {
  medications: {
    label: 'Medications',
    description: 'Manage your medication list',
  },
  schedule: {
    label: 'Schedule',
    description: "View and log today's doses",
  },
  history: {
    label: 'History & Reports',
    description: 'Track adherence and view reports',
  },
} as const;

const DEFAULT_TAB: TabValue = 'medications';

export default function MedicationPage({ className }: MedicationPageProps) {
  const { loadingStates, errors, fetchMedications, fetchTodaySchedule, clearAllErrors } =
    useMedicationStore();

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
          console.error('Failed to initialize medication data:', error);
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
      console.error('Retry failed:', error);
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
      <main className={cn('container mx-auto px-4 py-8 md:py-12', className)}>
        <div className="mx-auto max-w-7xl">
          <div className="py-16 text-center">
            <Loader2 className="text-green-dark mx-auto mb-6 h-12 w-12 animate-spin" />
            <h2 className="text-green-dark mb-2 text-2xl font-semibold">
              Loading Medication Tracker
            </h2>
            <p className="text-muted-foreground">
              Please wait while we load your medication data...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Global error state
  if (hasGlobalError) {
    return (
      <main className={cn('container mx-auto px-4 py-8 md:py-12', className)}>
        <div className="mx-auto max-w-7xl">
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-6 h-16 w-16 text-red-500" />
            <h2 className="mb-2 text-2xl font-semibold text-red-800">
              Unable to Load Medication Tracker
            </h2>
            <p className="mx-auto mb-6 max-w-md text-red-600">
              {errors.medications?.message ||
                'An unexpected error occurred while loading your medication data.'}
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
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="secondary">
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={cn('container mx-auto px-4 py-8 md:py-12', className)}>
      {/* Global Toast Notifications */}
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-green-dark font-varela text-3xl font-bold md:text-4xl">
              Medication Tracker
            </h1>
            <p className="text-muted-foreground mt-2">{TABS_CONFIG[activeTab].description}</p>
          </div>

          {/* Global loading indicator */}
          {isAnyLoading && (
            <div className="text-green-dark flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Updating...</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-2">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-grey-light/40 grid w-full grid-cols-3">
              {Object.entries(TABS_CONFIG).map(([value, config]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:text-blue-dark data-[state=active]:bg-background transition-colors"
                  aria-label={config.description}
                >
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Card className="border-grey-light min-h-[600px] bg-white/80 p-6">
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
