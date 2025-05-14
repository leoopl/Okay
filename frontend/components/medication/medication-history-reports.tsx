'use client';

import { useState, useEffect } from 'react';
import { useMedicationStore, AdherenceStats, DoseLog } from '@/lib/medication-store';
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
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MedicationHistoryReports() {
  const {
    medications,
    doseLogs,
    adherenceStats,
    fetchMedications,
    fetchDoseLogs,
    fetchAdherenceStats,
  } = useMedicationStore();
  const [timeRange, setTimeRange] = useState<string>('7days');
  const [selectedMedication, setSelectedMedication] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    fetchMedications();
    handleFilterChange();
  }, [fetchMedications]);

  // Handle filter changes
  const handleFilterChange = () => {
    // Determine approach based on selected time range
    const selectedMedicationId = selectedMedication === 'all' ? undefined : selectedMedication;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let daysBackValue: number | undefined;

    const today = new Date();

    switch (timeRange) {
      case 'today':
        // Use explicit date for today
        startDate = today;
        endDate = today;
        break;
      case '7days':
        // Use daysBack for predefined periods
        daysBackValue = 7;
        break;
      case '30days':
        daysBackValue = 30;
        break;
      case '90days':
        daysBackValue = 90;
        break;
      case 'specific':
        // Use explicit date for user-selected date
        startDate = selectedDate;
        endDate = selectedDate;
        break;
      default:
        daysBackValue = 7; // Default to 7 days
    }

    // Fetch dose logs with selected filters
    if (startDate || endDate) {
      // Use explicit dates
      fetchDoseLogs(selectedMedicationId, startDate, endDate);
    } else {
      // Use daysBack parameter (simpler approach)
      fetchDoseLogs(selectedMedicationId, undefined, undefined, daysBackValue);
    }

    // Fetch adherence stats with same filters
    fetchAdherenceStats(
      selectedMedicationId,
      timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 1,
    );
  };

  useEffect(() => {
    handleFilterChange();
  }, [timeRange, selectedMedication, selectedDate]);

  // Get medication name from ID
  const getMedicationName = (medicationId: string): string => {
    const medication = medications.find((med) => med.id === medicationId);
    return medication ? medication.name : 'Unknown Medication';
  };

  // Helper functions for UI
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'delayed':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-[#797D89]" />;
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'taken':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'skipped':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'delayed':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-green-dark text-2xl font-bold">Medication History & Reports</h2>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select value={selectedMedication} onValueChange={setSelectedMedication}>
            <SelectTrigger className="focus:ring-green-dark w-full border-[#CBCFD7] sm:w-[200px]">
              <SelectValue placeholder="Select medication" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All medications</SelectItem>
              {medications.map((med) => (
                <SelectItem key={med.id} value={med.id}>
                  {med.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="focus:ring-green-dark w-full border-[#CBCFD7] sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="specific">Specific date</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === 'specific' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
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
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-[#CBCFD7]">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-dark text-lg">Adherence Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[150px] flex-col items-center justify-center">
              <div className="text-green-dark text-5xl font-bold">
                {adherenceStats?.adherenceRate ?? 0}%
              </div>
              <p className="text-beige-dark mt-2">Doses taken as prescribed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#CBCFD7] md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-dark text-lg">Dose Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[150px] items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-green-dark text-3xl font-bold">
                  {adherenceStats?.taken ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-green-dark mr-2 h-3 w-3 rounded-full"></div>
                  <p className="text-beige-dark">Taken</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-yellow-dark text-3xl font-bold">
                  {adherenceStats?.skipped ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-yellow-dark mr-2 h-3 w-3 rounded-full"></div>
                  <p className="text-beige-dark">Skipped</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-blue-dark text-3xl font-bold">
                  {adherenceStats?.delayed ?? 0}
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-blue-dark mr-2 h-3 w-3 rounded-full"></div>
                  <p className="text-beige-dark">Delayed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-green-dark mt-6 text-xl font-medium">Medication History</h3>

      {!doseLogs || doseLogs.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2DECC]/50">
            <CalendarIcon className="text-yellow-dark h-8 w-8" />
          </div>
          <h3 className="text-green-dark mb-2 text-xl font-medium">No history found</h3>
          <p className="text-beige-dark mb-6">
            {selectedMedication !== 'all'
              ? 'Try a different medication or time range'
              : 'Start logging your medication doses to see your history'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Debug info - remove in production */}
          <div className="mb-2 text-xs text-gray-500">Found {doseLogs.length} logs</div>

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
