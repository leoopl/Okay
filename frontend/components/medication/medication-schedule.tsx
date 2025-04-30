import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X } from 'lucide-react';
import { DoseLog, Medication } from './add-medication';
import { toast } from 'sonner';

interface TodayScheduleProps {
  medications: Medication[];
  doseLogs: DoseLog[];
  onLogDose: (doseLog: DoseLog) => void;
}

const MedicationSchedule: React.FC<TodayScheduleProps> = ({ medications, doseLogs, onLogDose }) => {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Helper function to determine if medication should be taken today based on schedule
  const shouldTakeMedicationToday = (medication: Medication): boolean => {
    // If specific times are defined, check if any are scheduled for today
    if (medication.schedule) {
      return medication.specificTimes.some(
        (timeSlot) => !timeSlot.days || timeSlot.days.includes(dayOfWeek),
      );
    }

    // Default to true for daily medications
    return true;
  };

  // Filter medications that should be taken today
  const todaysMedications = medications.filter((med) => {
    // Check if today is within the medication's active date range
    const isActive = isToday(new Date(med.startDate)) || new Date(med.startDate) < today;

    const isExpired = med.endDate ? new Date(med.endDate) < today : false;

    if (!isActive || isExpired) return false;

    // Check if medication should be taken today based on schedule
    return shouldTakeMedicationToday(med);
  });

  // Gather all scheduled medication doses for today
  const scheduledDoses = todaysMedications.flatMap((med) => {
    if (med.scheduleType === 'daily') {
      return med.timeOfDay.map((time) => ({
        medication: med,
        scheduledTime: time,
        displayTime: time.replace('_', ' '),
        sortOrder: getSortOrder(time),
      }));
    }

    if (med.scheduleType === 'specific_times' && med.specificTimes) {
      return med.specificTimes
        .filter((timeSlot) => !timeSlot.days || timeSlot.days.includes(dayOfWeek))
        .map((timeSlot) => ({
          medication: med,
          scheduledTime: timeSlot.time,
          displayTime: formatTimeString(timeSlot.time),
          sortOrder: getTimeSort(timeSlot.time),
        }));
    }

    return [];
  });

  // Filter out doses that have already been logged today
  const remainingDoses = scheduledDoses
    .filter((dose) => {
      const todayLogs = doseLogs.filter(
        (log) =>
          log.medicationId === dose.medication.id &&
          isSameDay(new Date(log.timestamp), today) &&
          log.scheduledTime === dose.scheduledTime,
      );
      return todayLogs.length === 0;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function formatTimeString(time: string): string {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, 'h:mm a');
    } catch (e) {
      return time;
    }
  }

  function getTimeSort(time: string): number {
    try {
      const [hours, minutes] = time.split(':');
      return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    } catch (e) {
      return 1440; // Default to end of day
    }
  }

  const handleLogDose = (medicationId: string, scheduledTime: string, status: DoseStatus) => {
    onLogDose({
      medicationId,
      status,
      timestamp: new Date(),
      scheduledTime,
    });

    toast(`Medication ${status}`, {
      description: `${status === 'taken' ? '✓' : '×'} at ${format(new Date(), 'h:mm a')}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {remainingDoses.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            <p>No more medications scheduled for today!</p>
            <p className="mt-2 text-sm">All medications have been taken or skipped.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {remainingDoses.map((dose) => (
              <Card key={`${dose.medication.id}-${dose.scheduledTime}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{dose.medication.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="bg-okay-blue-light/20">
                          {dose.medication.dosage}
                        </Badge>
                        <Badge variant="outline" className="bg-okay-neutral-light/20">
                          <Clock className="mr-1 h-3 w-3" />
                          {dose.displayTime}
                        </Badge>
                      </div>
                      {dose.medication.instructions && (
                        <p className="text-muted-foreground mt-2 text-sm">
                          {dose.medication.instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between bg-[#CBCFD7]/10 p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#ABB899] text-[#7F9463] hover:bg-[#D1DBC3]/20"
                        onClick={() => handleOpenLogDose(medication.id)}
                      >
                        Log Dose
                      </Button>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#797D89] hover:bg-green-50 hover:text-green-500"
                          onClick={() => handleQuickLog(medication.id, 'taken')}
                          title="Mark as taken"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span className="sr-only">Mark as taken</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#797D89] hover:bg-amber-50 hover:text-amber-500"
                          onClick={() => handleQuickLog(medication.id, 'delayed')}
                          title="Mark as delayed"
                        >
                          <Clock className="h-4 w-4" />
                          <span className="sr-only">Mark as delayed</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#797D89] hover:bg-red-50 hover:text-red-500"
                          onClick={() => handleQuickLog(medication.id, 'skipped')}
                          title="Mark as skipped"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Mark as skipped</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicationSchedule;
