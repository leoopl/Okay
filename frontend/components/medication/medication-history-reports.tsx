'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMedicationStore } from '@/store/medication-store';
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
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, AlertCircle, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/use-mobile';

// Type definitions for better type safety
type TimeRange = 'today' | '7days' | '30days' | '90days' | 'specific';
type DoseStatus = 'taken' | 'skipped' | 'delayed';

// Constants to avoid magic numbers
const TIME_RANGES = {
  today: { label: 'Hoje', days: 1 },
  '7days': { label: 'Últimos 7 dias', days: 7 },
  '30days': { label: 'Últimos 30 dias', days: 30 },
  '90days': { label: 'Últimos 90 dias', days: 90 },
  specific: { label: 'Data específica', days: 1 },
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
  const error =
    errors.medications?.message || errors.doseLogs?.message || errors.adherenceStats?.message;

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [selectedMedication, setSelectedMedication] = useState<string>(ALL_MEDICATIONS);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const isMobile = useMobile();

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
      return medication?.name ?? 'Medicamento Desconhecido';
    },
    [medicationMap],
  );

  const getStatusIcon = useCallback((status: DoseStatus) => {
    const iconMap = {
      taken: <CheckCircle className="text-accent-strong h-4 w-4" aria-label="Dose tomada" />,
      skipped: <XCircle className="text-destructive h-4 w-4" aria-label="Dose pulada" />,
      delayed: <Clock className="text-primary h-4 w-4" aria-label="Dose atrasada" />,
    };
    return (
      iconMap[status] || (
        <AlertCircle className="text-muted-foreground h-4 w-4" aria-label="Status desconhecido" />
      )
    );
  }, []);

  const getStatusClass = useCallback((status: DoseStatus): string => {
    const statusClasses = {
      taken: 'bg-success-bg text-success border-success/30',
      skipped: 'bg-destructive/10 text-destructive border-destructive/30',
      delayed: 'bg-primary/10 text-accent-strong border-primary/30',
    };
    return statusClasses[status] || 'bg-muted text-muted-foreground border-border';
  }, []);

  // Memoized components for better performance
  const AdherenceCard = useMemo(
    () => (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-accent-strong text-lg">Taxa de Adesão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-37.5 flex-col items-center justify-center">
            {loadingStates.adherenceStats ? (
              <Loader2 className="text-accent-strong h-8 w-8 animate-spin" />
            ) : (
              <>
                <div
                  className="text-accent-strong text-5xl font-bold"
                  aria-label={`Taxa de adesão: ${adherenceStats?.adherenceRate ?? 0} por cento`}
                >
                  {adherenceStats?.adherenceRate ?? 0}%
                </div>
                <p className="text-muted-foreground mt-2">Doses tomadas conforme prescrito</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    ),
    [adherenceStats, loadingStates.adherenceStats],
  );

  const DoseSummaryCard = (
    <Card className="border-border md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-accent-strong text-lg">Resumo do Status de Doses</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingStates.adherenceStats ? (
          <div className="flex h-37.5 items-center justify-center">
            <Loader2 className="text-accent-strong h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex h-37.5 items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <div
                className="text-accent-strong text-3xl font-bold"
                aria-label={`${adherenceStats?.taken ?? 0} doses tomadas`}
              >
                {adherenceStats?.taken ?? 0}
              </div>
              <div className="mt-2 flex items-center">
                <div
                  className="bg-accent-strong mr-2 h-3 w-3 rounded-full"
                  aria-hidden="true"
                ></div>
                <p className="text-muted-foreground">Tomados</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="text-primary text-3xl font-bold"
                aria-label={`${adherenceStats?.skipped ?? 0} doses puladas`}
              >
                {adherenceStats?.skipped ?? 0}
              </div>
              <div className="mt-2 flex items-center">
                <div className="bg-primary mr-2 h-3 w-3 rounded-full" aria-hidden="true"></div>
                <p className="text-muted-foreground">Pulados</p>
              </div>
            </div>
            {isMobile ? null : (
              <div className="flex flex-col items-center">
                <div
                  className="text-secondary text-3xl font-bold"
                  aria-label={`${adherenceStats?.delayed ?? 0} doses atrasadas`}
                >
                  {adherenceStats?.delayed ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-secondary mr-2 h-3 w-3 rounded-full" aria-hidden="true"></div>
                  <p className="text-muted-foreground">Atrasadas</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Error boundary fallback
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="py-12 text-center">
          <AlertCircle className="text-destructive mx-auto mb-4 h-16 w-16" />
          <h3 className="text-destructive mb-2 text-xl font-medium">Algo deu errado</h3>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={handleFilterChange} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-accent-strong text-2xl font-bold">
          Histórico e Relatórios de Medicamentos
        </h2>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select
            value={selectedMedication}
            onValueChange={setSelectedMedication}
            disabled={loadingStates.medications || loadingStates.doseLogs}
          >
            <SelectTrigger className="focus:ring-accent-strong border-border w-full sm:w-50">
              <SelectValue placeholder="Selecionar medicamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MEDICATIONS}>Todos os medicamentos</SelectItem>
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
            <SelectTrigger className="focus:ring-accent-strong border-border w-full sm:w-45">
              <SelectValue placeholder="Selecionar período" />
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
                    'border-border w-full justify-start text-left font-normal sm:w-45',
                    !selectedDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, 'PPP', { locale: ptBR })
                  ) : (
                    <span>Escolha uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={ptBR}
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

      <h3 className="text-accent-strong mt-6 text-xl font-medium">Histórico de Medicamentos</h3>

      {loadingStates.doseLogs && !doseLogs.length ? (
        <div className="py-12 text-center">
          <Loader2 className="text-accent-strong mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Carregando histórico de medicamentos...</p>
        </div>
      ) : !doseLogs || doseLogs.length === 0 ? (
        <div className="py-12 text-center">
          <div className="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <CalendarIcon className="text-primary h-8 w-8" />
          </div>
          <h3 className="text-accent-strong mb-2 text-xl font-medium">
            Nenhum histórico encontrado
          </h3>
          <p className="text-muted-foreground mb-6">
            {selectedMedication !== ALL_MEDICATIONS
              ? 'Tente um medicamento ou período diferente'
              : 'Comece registrando suas doses de medicamentos para ver seu histórico'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {doseLogs.map((log, index) => (
            <Card key={log.id || `log-${index}`} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(log.status)}</div>
                  <div className="flex-1">
                    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-accent-strong font-medium">
                          {getMedicationName(log.medicationId)}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {format(new Date(log.timestamp), 'PPP', { locale: ptBR })} às{' '}
                          {format(new Date(log.timestamp), 'HH:mm')}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusClass(log.status)}>
                        {log.status === 'taken' && 'Tomado'}
                        {log.status === 'skipped' && 'Pulado'}
                        {log.status === 'delayed' && 'Atrasado'}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="text-muted-foreground bg-border/10 mt-2 rounded p-2 text-sm">
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
