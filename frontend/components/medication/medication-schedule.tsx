'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useMedicationStore, ScheduleItem } from '@/lib/medication-store';
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
import { CheckCircle, Clock, XCircle, CalendarCheck } from 'lucide-react';

interface LogData {
  time: string;
  status: 'taken' | 'skipped' | 'delayed';
  notes: string;
}

export default function MedicationSchedule() {
  const { todaySchedule, fetchTodaySchedule, logDose } = useMedicationStore();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<ScheduleItem | null>(null);
  const [logData, setLogData] = useState<LogData>({
    time: '',
    status: 'taken',
    notes: '',
  });

  // Fetch today's schedule on component mount
  useEffect(() => {
    fetchTodaySchedule();
  }, [fetchTodaySchedule]);

  const handleQuickLog = async (
    medicationId: string,
    scheduledTime: string,
    status: 'taken' | 'skipped' | 'delayed',
  ) => {
    await logDose({
      medicationId,
      status,
      timestamp: new Date(),
      scheduledTime,
      notes: `Quick logged as ${status}`,
    });
  };

  const handleOpenLogDialog = (medication: ScheduleItem) => {
    setSelectedMedication(medication);
    setLogData({
      time: format(new Date(), 'HH:mm'),
      status: 'taken',
      notes: '',
    });
    setIsLogDialogOpen(true);
  };

  const handleManualLog = async () => {
    if (!selectedMedication) return;

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
  };

  return (
    <>
      <Card className="bg-white/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-dark flex items-center gap-2 text-xl">
            <CalendarCheck className="size-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <p>No medications scheduled for today!</p>
              <p className="mt-2 text-sm">
                All medications have been taken or you don't have any active medications scheduled
                for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaySchedule.map((dose, index) => (
                <Card key={`${dose.medicationId}-${dose.time}`} className="border-grey-light">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <h3 className="text-green-dark font-medium">{dose.medicationName}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-blue-dark bg-[#A5DCF6]/20">
                            {dose.dosage}
                          </Badge>
                          <Badge variant="outline" className="text-beige-dark bg-[#F2DECC]/20">
                            <Clock className="mr-1 h-3 w-3" />
                            {dose.time}
                          </Badge>
                        </div>
                        {dose.instructions && (
                          <p className="text-muted-foreground mt-1 text-sm">{dose.instructions}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 md:flex-row">
                        <Button
                          onClick={() =>
                            handleQuickLog(dose.medicationId, dose.scheduledTime, 'taken')
                          }
                          variant="outline"
                          size="sm"
                          className="border-green-dark text-green-dark hover:bg-green-light/30 gap-1"
                        >
                          <CheckCircle className="size-4" />
                          Taken
                        </Button>
                        <Button
                          onClick={() =>
                            handleQuickLog(dose.medicationId, dose.scheduledTime, 'skipped')
                          }
                          variant="outline"
                          size="sm"
                          className="gap-1 border-red-500 text-red-500 hover:bg-red-50"
                        >
                          <XCircle className="size-4" />
                          Skip
                        </Button>
                        <Button
                          onClick={() =>
                            handleQuickLog(dose.medicationId, dose.scheduledTime, 'delayed')
                          }
                          variant="outline"
                          size="sm"
                          className="gap-1 border-amber-500 text-amber-500 hover:bg-amber-50"
                        >
                          <Clock className="size-4" />
                          Delay
                        </Button>
                        <Button
                          onClick={() => handleOpenLogDialog(dose)}
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                        >
                          Log
                        </Button>
                      </div>
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
                  Scheduled for {selectedMedication.time}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-time">Time Taken</Label>
                <Input
                  id="log-time"
                  type="time"
                  value={logData.time}
                  onChange={(e) => setLogData({ ...logData, time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-status">Status</Label>
                <Select
                  value={logData.status}
                  onValueChange={(value: 'taken' | 'skipped' | 'delayed') =>
                    setLogData({ ...logData, status: value })
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
                  onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleManualLog}
                  className="bg-green-dark hover:bg-green-medium text-white"
                >
                  Save Log
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
