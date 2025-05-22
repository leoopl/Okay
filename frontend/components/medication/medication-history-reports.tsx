'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMedicationStore, type AdherenceStats, type DoseLog } from '@/store/medication-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type definitions for better type safety
type TimeRange = 'today' | '7days' | '30days' | '90days' | 'specific';
type DoseStatus = 'taken' | 'skipped' | 'delayed';

// Constants to avoid magic numbers
const TIME_RANGES = {
  today: { label: 'Today', days: 1 },
  '7days': { label: 'Last 7 days', days: 7 },
  '30days': { label: 'Last 30 days', days: 30 },
  '90days': { label: 'Last 90 days', days: 90 },
  specific: { label: 'Specific date', days: 1 },
} as const;

const DEFAULT_TIME_RANGE: TimeRange = '7days';
const ALL_MEDICATIONS = 'all';

interface MedicationHistoryReportsProps {
  className?: string;
}

export default function MedicationHistoryReports({ className }: MedicationHistoryReportsProps) {
  const {
    medications,
    doseLogs,
    adherenceStats,
    loadingStates,
    errors,
    fetchMedications,
    fetchDoseLogs,
    fetchAdherenceStats,
  } = useMedicationStore();

  // Computed loading and error states
  const isLoading =
    loadingStates.doseLogs || loadingStates.adherenceStats || loadingStates.medications;
  const error =
    errors.medications?.message || errors.doseLogs?.message || errors.adherenceStats?.message;

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [selectedMedication, setSelectedMedication] = useState<string>(ALL_MEDICATIONS);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Memoized medication lookup for performance
  const medicationMap = useMemo(() => {
    return new Map(medications.map((med) => [med.id, med]));
  }, [medications]);

  // Memoized filter parameters calculation
  const filterParams = useMemo(() => {
    const selectedMedicationId =
      selectedMedication === ALL_MEDICATIONS ? undefined : selectedMedication;
    const today = new Date();

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let daysBack: number | undefined;

    switch (timeRange) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'specific':
        startDate = selectedDate;
        endDate = selectedDate;
        break;
      default:
        daysBack = TIME_RANGES[timeRange].days;
    }

    return {
      medicationId: selectedMedicationId,
      startDate,
      endDate,
      daysBack,
    };
  }, [timeRange, selectedMedication, selectedDate]);

  // Optimized filter change handler with useCallback
  const handleFilterChange = useCallback(async () => {
    const { medicationId, startDate, endDate, daysBack } = filterParams;

    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const [doseLogsResult, adherenceStatsResult] = await Promise.allSettled([
        fetchDoseLogs(medicationId, startDate, endDate, daysBack),
        fetchAdherenceStats(medicationId, daysBack || 1),
      ]);

      // Log any failures without breaking the UI
      if (doseLogsResult.status === 'rejected') {
        console.error('Failed to fetch dose logs:', doseLogsResult.reason);
      }
      if (adherenceStatsResult.status === 'rejected') {
        console.error('Failed to fetch adherence stats:', adherenceStatsResult.reason);
      }
    } catch (error) {
      console.error('Unexpected error in filter change:', error);
    }
  }, [filterParams, fetchDoseLogs, fetchAdherenceStats]);

  // Initial data loading
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        await fetchMedications();
        if (isMounted) {
          await handleFilterChange();
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [fetchMedications, handleFilterChange]);

  // Handle filter changes with proper cleanup
  useEffect(() => {
    const controller = new AbortController();

    handleFilterChange().catch((error) => {
      if (!controller.signal.aborted) {
        console.error('Filter change failed:', error);
      }
    });

    return () => {
      controller.abort();
    };
  }, [handleFilterChange]);

  // Memoized helper functions
  const getMedicationName = useCallback(
    (medicationId: string): string => {
      const medication = medicationMap.get(medicationId);
      return medication?.name ?? 'Unknown Medication';
    },
    [medicationMap],
  );

  const getStatusIcon = useCallback((status: DoseStatus) => {
    const iconMap = {
      taken: <CheckCircle className="h-4 w-4 text-green-500" aria-label="Dose taken" />,
      skipped: <XCircle className="h-4 w-4 text-red-500" aria-label="Dose skipped" />,
      delayed: <Clock className="h-4 w-4 text-amber-500" aria-label="Dose delayed" />,
    };
    return (
      iconMap[status] || (
        <AlertCircle className="h-4 w-4 text-gray-500" aria-label="Unknown status" />
      )
    );
  }, []);

  const getStatusClass = useCallback((status: DoseStatus): string => {
    const statusClasses = {
      taken: 'bg-green-100 text-green-800 border-green-200',
      skipped: 'bg-red-100 text-red-800 border-red-200',
      delayed: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  // Memoized components for better performance
  const AdherenceCard = useMemo(
    () => (
      <Card className="border-[#CBCFD7]">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-dark text-lg">Adherence Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[150px] flex-col items-center justify-center">
            {loadingStates.adherenceStats ? (
              <Loader2 className="text-green-dark h-8 w-8 animate-spin" />
            ) : (
              <>
                <div
                  className="text-green-dark text-5xl font-bold"
                  aria-label={`Adherence rate: ${adherenceStats?.adherenceRate ?? 0} percent`}
                >
                  {adherenceStats?.adherenceRate ?? 0}%
                </div>
                <p className="text-beige-dark mt-2">Doses taken as prescribed</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    ),
    [adherenceStats, loadingStates.adherenceStats],
  );

  const DoseSummaryCard = useMemo(
    () => (
      <Card className="border-[#CBCFD7] md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-dark text-lg">Dose Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStates.adherenceStats ? (
            <div className="flex h-[150px] items-center justify-center">
              <Loader2 className="text-green-dark h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex h-[150px] items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div
                  className="text-green-dark text-3xl font-bold"
                  aria-label={`${adherenceStats?.taken ?? 0} doses taken`}
                >
                  {adherenceStats?.taken ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-green-dark mr-2 h-3 w-3 rounded-full" aria-hidden="true"></div>
                  <p className="text-beige-dark">Taken</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className="text-yellow-dark text-3xl font-bold"
                  aria-label={`${adherenceStats?.skipped ?? 0} doses skipped`}
                >
                  {adherenceStats?.skipped ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div
                    className="bg-yellow-dark mr-2 h-3 w-3 rounded-full"
                    aria-hidden="true"
                  ></div>
                  <p className="text-beige-dark">Skipped</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className="text-blue-dark text-3xl font-bold"
                  aria-label={`${adherenceStats?.delayed ?? 0} doses delayed`}
                >
                  {adherenceStats?.delayed ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-blue-dark mr-2 h-3 w-3 rounded-full" aria-hidden="true"></div>
                  <p className="text-beige-dark">Delayed</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    [adherenceStats, loadingStates.adherenceStats],
  );

  // Error boundary fallback
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h3 className="mb-2 text-xl font-medium text-red-800">Something went wrong</h3>
          <p className="mb-4 text-red-600">{error}</p>
          <Button onClick={handleFilterChange} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-green-dark text-2xl font-bold">Medication History & Reports</h2>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select
            value={selectedMedication}
            onValueChange={setSelectedMedication}
            disabled={loadingStates.medications || loadingStates.doseLogs}
          >
            <SelectTrigger className="focus:ring-green-dark w-full border-[#CBCFD7] sm:w-[200px]">
              <SelectValue placeholder="Select medication" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MEDICATIONS}>All medications</SelectItem>
              {medications.map((med) => (
                <SelectItem key={med.id} value={med.id}>
                  {med.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={timeRange}
            onValueChange={(value: TimeRange) => setTimeRange(value)}
            disabled={loadingStates.doseLogs}
          >
            <SelectTrigger className="focus:ring-green-dark w-full border-[#CBCFD7] sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIME_RANGES).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {timeRange === 'specific' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={loadingStates.doseLogs}
                  className={cn(
                    'w-full justify-start border-[#CBCFD7] text-left font-normal sm:w-[180px]',
                    !selectedDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {AdherenceCard}
        {DoseSummaryCard}
      </div>

      <h3 className="text-green-dark mt-6 text-xl font-medium">Medication History</h3>

      {loadingStates.doseLogs && !doseLogs.length ? (
        <div className="py-12 text-center">
          <Loader2 className="text-green-dark mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-beige-dark">Loading medication history...</p>
        </div>
      ) : !doseLogs || doseLogs.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2DECC]/50">
            <CalendarIcon className="text-yellow-dark h-8 w-8" />
          </div>
          <h3 className="text-green-dark mb-2 text-xl font-medium">No history found</h3>
          <p className="text-beige-dark mb-6">
            {selectedMedication !== ALL_MEDICATIONS
              ? 'Try a different medication or time range'
              : 'Start logging your medication doses to see your history'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {doseLogs.map((log, index) => (
            <Card key={log.id || `log-${index}`} className="border-[#CBCFD7]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(log.status)}</div>
                  <div className="flex-1">
                    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-green-dark font-medium">
                          {getMedicationName(log.medicationId)}
                        </h3>
                        <p className="text-sm text-[#797D89]">
                          {format(new Date(log.timestamp), 'PPP')} at{' '}
                          {format(new Date(log.timestamp), 'h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusClass(log.status)}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="text-beige-dark mt-2 rounded bg-[#CBCFD7]/10 p-2 text-sm">
                        {log.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
