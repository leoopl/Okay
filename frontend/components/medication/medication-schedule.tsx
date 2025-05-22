'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { useMedicationStore, type ScheduleItem, type DoseStatus } from '@/store/medication-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Clock, XCircle, CalendarCheck, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type definitions for better type safety
interface LogData {
  time: string;
  status: DoseStatus;
  notes: string;
}

// Constants
const QUICK_LOG_MESSAGES = {
  taken: 'Quick logged as taken',
  skipped: 'Quick logged as skipped',
  delayed: 'Quick logged as delayed',
} as const;

const STATUS_CONFIG = {
  taken: {
    icon: CheckCircle,
    label: 'Taken',
    className: 'border-green-dark text-green-dark hover:bg-green-light/30',
    color: 'text-green-500',
  },
  skipped: {
    icon: XCircle,
    label: 'Skip',
    className: 'border-red-500 text-red-500 hover:bg-red-50',
    color: 'text-red-500',
  },
  delayed: {
    icon: Clock,
    label: 'Delay',
    className: 'border-amber-500 text-amber-500 hover:bg-amber-50',
    color: 'text-amber-500',
  },
} as const;

interface MedicationScheduleProps {
  className?: string;
}

export default function MedicationSchedule({ className }: MedicationScheduleProps) {
  const { todaySchedule, loadingStates, errors, fetchTodaySchedule, logDose } =
    useMedicationStore();

  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<ScheduleItem | null>(null);
  const [logData, setLogData] = useState<LogData>({
    time: '',
    status: 'taken',
    notes: '',
  });

  // Computed loading and error states
  const isLoading = loadingStates.todaySchedule || loadingStates.logging;
  const error = errors.todaySchedule?.message || errors.logging?.message;

  // Fetch today's schedule on component mount with cleanup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSchedule = async () => {
      try {
        if (isMounted) {
          await fetchTodaySchedule();
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load schedule:', error);
        }
      }
    };

    loadSchedule();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [fetchTodaySchedule]);

  // Optimized quick log handler with useCallback
  const handleQuickLog = useCallback(
    async (medicationId: string, scheduledTime: string, status: DoseStatus) => {
      try {
        await logDose({
          medicationId,
          status,
          timestamp: new Date(),
          scheduledTime,
          notes: QUICK_LOG_MESSAGES[status],
        });
      } catch (error) {
        console.error('Failed to quick log dose:', error);
      }
    },
    [logDose],
  );

  // Optimized dialog open handler
  const handleOpenLogDialog = useCallback((medication: ScheduleItem) => {
    setSelectedMedication(medication);
    setLogData({
      time: format(new Date(), 'HH:mm'),
      status: 'taken',
      notes: '',
    });
    setIsLogDialogOpen(true);
  }, []);

  // Optimized manual log handler
  const handleManualLog = useCallback(async () => {
    if (!selectedMedication) return;

    try {
      // Validate time format
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(logData.time)) {
        console.error('Invalid time format');
        return;
      }

      // Create timestamp from today's date and selected time
      const [hours, minutes] = logData.time.split(':').map(Number);
      const timestamp = new Date();
      timestamp.setHours(hours, minutes, 0, 0);

      await logDose({
        medicationId: selectedMedication.medicationId,
        status: logData.status,
        timestamp,
        scheduledTime: selectedMedication.scheduledTime,
        notes: logData.notes,
      });

      setIsLogDialogOpen(false);

      // Reset form
      setLogData({
        time: format(new Date(), 'HH:mm'),
        status: 'taken',
        notes: '',
      });
    } catch (error) {
      console.error('Failed to log dose manually:', error);
    }
  }, [selectedMedication, logData, logDose]);

  // Memoized schedule items to prevent unnecessary re-renders
  const scheduleItems = useMemo(() => {
    if (!todaySchedule || todaySchedule.length === 0) return [];

    return todaySchedule.map((dose, index) => ({
      ...dose,
      key: `${dose.medicationId}-${dose.time}-${index}`,
    }));
  }, [todaySchedule]);

  // Memoized action buttons to prevent re-renders
  const ActionButtons = useCallback(
    ({ dose }: { dose: ScheduleItem }) => (
      <div className="flex flex-col gap-2 md:flex-row">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={status}
              onClick={() =>
                handleQuickLog(dose.medicationId, dose.scheduledTime, status as DoseStatus)
              }
              variant="outline"
              size="sm"
              disabled={loadingStates.logging}
              className={cn('gap-1', config.className)}
              aria-label={`Mark as ${config.label.toLowerCase()}`}
            >
              {loadingStates.logging ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
              {config.label}
            </Button>
          );
        })}
        <Button
          onClick={() => handleOpenLogDialog(dose)}
          variant="secondary"
          size="sm"
          disabled={loadingStates.logging}
          className="gap-1"
          aria-label="Open manual log dialog"
        >
          Log
        </Button>
      </div>
    ),
    [handleQuickLog, handleOpenLogDialog, loadingStates.logging],
  );

  // Error state
  if (error) {
    return (
      <Card className={cn('bg-white/90', className)}>
        <CardContent className="p-6">
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-medium text-red-800">Unable to load schedule</h3>
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={fetchTodaySchedule} variant="outline" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('bg-white/90', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-green-dark flex items-center gap-2 text-xl">
            <CalendarCheck className="size-5" aria-hidden="true" />
            Today's Schedule
            {isLoading && <Loader2 className="ml-auto size-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && scheduleItems.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 className="text-green-dark mx-auto mb-4 h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Loading today's schedule...</p>
            </div>
          ) : scheduleItems.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <CalendarCheck className="text-green-dark/50 mx-auto mb-4 h-12 w-12" />
              <p className="font-medium">No medications scheduled for today!</p>
              <p className="mt-2 text-sm">
                All medications have been taken or you don't have any active medications scheduled
                for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduleItems.map((dose) => (
                <Card key={dose.key} className="border-grey-light">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <h3 className="text-green-dark font-medium">{dose.medicationName}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-blue-dark bg-[#A5DCF6]/20">
                            {dose.dosage}
                          </Badge>
                          <Badge variant="outline" className="text-beige-dark bg-[#F2DECC]/20">
                            <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                            <time dateTime={dose.time}>{dose.time}</time>
                          </Badge>
                        </div>
                        {dose.instructions && (
                          <p className="text-muted-foreground mt-1 text-sm">{dose.instructions}</p>
                        )}
                      </div>

                      <ActionButtons dose={dose} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Dose Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Medication Dose</DialogTitle>
          </DialogHeader>
          {selectedMedication && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <h3 className="font-medium">{selectedMedication.medicationName}</h3>
                <p className="text-muted-foreground text-sm">
                  Scheduled for{' '}
                  <time dateTime={selectedMedication.time}>{selectedMedication.time}</time>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-time">Time Taken</Label>
                <Input
                  id="log-time"
                  type="time"
                  value={logData.time}
                  onChange={(e) => setLogData((prev) => ({ ...prev, time: e.target.value }))}
                  aria-describedby="log-time-help"
                />
                <p id="log-time-help" className="text-muted-foreground text-xs">
                  Use 24-hour format (HH:MM)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-status">Status</Label>
                <Select
                  value={logData.status}
                  onValueChange={(value: DoseStatus) =>
                    setLogData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="log-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taken">Taken</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-notes">Notes (optional)</Label>
                <Textarea
                  id="log-notes"
                  placeholder="Add any notes about this dose"
                  value={logData.notes}
                  onChange={(e) => setLogData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsLogDialogOpen(false)}
                  disabled={loadingStates.logging}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualLog}
                  disabled={loadingStates.logging || !logData.time}
                  className="bg-green-dark hover:bg-green-medium text-white"
                >
                  {loadingStates.logging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Log'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
