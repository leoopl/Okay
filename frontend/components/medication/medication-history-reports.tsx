'use client';

import { useState } from 'react';
import { useMedicationStore } from '@/lib/medication-store';
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

interface MedicationHistoryReportsProps {
  searchQuery: string;
}

export default function MedicationHistoryReports({ searchQuery }: MedicationHistoryReportsProps) {
  const { medications, getAllDoseHistory } = useMedicationStore();
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedMedication, setSelectedMedication] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get all dose history
  const allDoseHistory = getAllDoseHistory();

  // Filter by medication name if search query exists or medication is selected
  const filteredByMedication = searchQuery
    ? allDoseHistory.filter((entry: { medicationId: any }) => {
        const medication = medications.find((med) => med.id === entry.medicationId);
        return medication?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : selectedMedication === 'all'
      ? allDoseHistory
      : allDoseHistory.filter((entry) => entry.medicationId === selectedMedication);

  // Filter by time range
  const getDateRange = () => {
    const today = new Date();

    switch (timeRange) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case '7days':
        return { start: subDays(today, 6), end: today };
      case '30days':
        return { start: subDays(today, 29), end: today };
      case '90days':
        return { start: subDays(today, 89), end: today };
      case 'specific':
        return selectedDate
          ? { start: startOfDay(selectedDate), end: endOfDay(selectedDate) }
          : { start: startOfDay(today), end: endOfDay(today) };
      default:
        return { start: subDays(today, 6), end: today };
    }
  };

  const dateRange = getDateRange();

  const filteredHistory = filteredByMedication.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return isWithinInterval(entryDate, {
      start: dateRange.start,
      end: dateRange.end,
    });
  });

  // Sort by most recent first
  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Calculate summary data
  const taken = filteredHistory.filter((entry) => entry.status === 'taken').length;
  const skipped = filteredHistory.filter((entry) => entry.status === 'skipped').length;
  const delayed = filteredHistory.filter((entry) => entry.status === 'delayed').length;
  const total = taken + skipped + delayed;

  // Calculate adherence rate
  const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

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

  const getStatusClass = (status: string) => {
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

  const getMedicationName = (medicationId: string) => {
    const medication = medications.find((med) => med.id === medicationId);
    return medication ? medication.name : 'Unknown Medication';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold text-[#7F9463]">Medication History & Reports</h2>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select value={selectedMedication} onValueChange={setSelectedMedication}>
            <SelectTrigger className="w-full border-[#CBCFD7] focus:ring-[#039BE5] sm:w-[200px]">
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
            <SelectTrigger className="w-full border-[#CBCFD7] focus:ring-[#039BE5] sm:w-[180px]">
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
            <CardTitle className="text-lg text-[#7F9463]">Adherence Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[150px] flex-col items-center justify-center">
              <div className="text-5xl font-bold text-[#7F9463]">{adherenceRate}%</div>
              <p className="mt-2 text-[#91857A]">Doses taken as prescribed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#CBCFD7] md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#7F9463]">Dose Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[150px] items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-[#7F9463]">{taken}</div>
                <div className="mt-2 flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full bg-[#7F9463]"></div>
                  <p className="text-[#91857A]">Taken</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-[#F4B400]">{skipped}</div>
                <div className="mt-2 flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full bg-[#F4B400]"></div>
                  <p className="text-[#91857A]">Skipped</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-[#039BE5]">{delayed}</div>
                <div className="mt-2 flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full bg-[#039BE5]"></div>
                  <p className="text-[#91857A]">Delayed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="mt-6 text-xl font-medium text-[#7F9463]">Medication History</h3>

      {sortedHistory.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2DECC]/50">
            <CalendarIcon className="h-8 w-8 text-[#F4B400]" />
          </div>
          <h3 className="mb-2 text-xl font-medium text-[#7F9463]">No history found</h3>
          <p className="mb-6 text-[#91857A]">
            {searchQuery || selectedMedication !== 'all'
              ? 'Try a different search term, medication, or time range'
              : 'Start logging your medication doses to see your history'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedHistory.map((entry, index) => (
            <Card key={index} className="border-[#CBCFD7]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(entry.status)}</div>
                  <div className="flex-1">
                    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-medium text-[#7F9463]">
                          {getMedicationName(entry.medicationId)}
                        </h3>
                        <p className="text-sm text-[#797D89]">
                          {format(new Date(entry.timestamp), 'PPP')} at{' '}
                          {format(new Date(entry.timestamp), 'h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusClass(entry.status)}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </div>
                    {entry.notes && (
                      <p className="mt-2 rounded bg-[#CBCFD7]/10 p-2 text-sm text-[#91857A]">
                        {entry.notes}
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
