'use client';

import { CheckCircle, Clock, Edit, Ellipsis, Pill, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { DoseLog, Medication } from './add-medication';

export default function MedicationList() {
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  // Get the latest log for a medication
  const getLatestLog = (medicationId: string) => {
    const medicationLogs = doseLogs.filter((log) => log.medicationId === medicationId);
    if (medicationLogs.length === 0) return null;

    return medicationLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-green-dark font-varela text-2xl font-bold">Seus Remédios</h2>
        <Button
        //   onClick={() => setIsAddDialogOpen(true)}
        //   className=""
        >
          <Plus /> Add Novo Medicamento
        </Button>
      </div>
      {medications.length === 0 ? (
        <div className="py-12 text-center">
          <div className="bg-grey-light/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Pill className="text-blue-dark h-8 w-8" />
          </div>
          <h3 className="text-beige-dark mb-2 text-xl font-medium">No medications found</h3>
          <p className="text-beige-dark mb-6">Start by adding your medications to track them</p>
          <Button>
            <Plus /> Adicione seu primeiro medicamento.
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medications.map((medication) => {
            const latestLog = getLatestLog(medication.id);
            return (
              <Card
                key={medication.id}
                className="hover:border-blue-dark border-grey-light overflow-hidden transition-colors"
              >
                <CardContent className="p-0">
                  <div className="border-grey-light border-b p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3
                        className="text-green-dark truncate text-lg font-bold"
                        title={medication.name}
                      >
                        {medication.name}
                      </h3>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-blue-light size-8 hover:bg-transparent"
                          //   onClick={() => handleOpenDetails(medication.id)}
                        >
                          <Edit className="size-4" />
                          <span className="sr-only">Edit medication</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-destructive size-8 hover:bg-transparent"
                          //   onClick={() => handleDelete(medication.id)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete medication</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="bg-[#F2DECC]/30 text-[#91857A]">
                        {medication.form}
                      </Badge>
                      <Badge variant="outline" className="bg-[#A5DCF6]/30 text-[#039BE5]">
                        {medication.dosage}
                      </Badge>
                    </div>

                    <div className="mb-3 flex items-center text-sm text-[#91857A]">
                      {latestLog ? (
                        <div className="mt-4 flex items-center gap-2 text-sm">
                          {latestLog.status === 'taken' && (
                            <CheckCircle className="text-green-dark size-4" />
                          )}
                          {latestLog.status === 'skipped' && (
                            <XCircle className="text-destructive size-4" />
                          )}
                          {latestLog.status === 'delayed' && (
                            <Clock className="text-yellow-medium size-4" />
                          )}
                          <span>
                            Last {latestLog.status}:{' '}
                            {format(new Date(latestLog.timestamp), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center gap-2 text-sm">
                          <Ellipsis className="mt-0.5 size-4" />
                          <span className="text-sm text-[#91857A]">No logs yet</span>
                        </div>
                      )}
                    </div>

                    {/* {medication.endDate && (
                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-xs text-[#91857A]">
                          <span>Course progress</span>
                          <span>
                            {calculateProgress(medication.startDate, medication.endDate)}%
                          </span>
                        </div>
                        <Progress
                          value={calculateProgress(medication.startDate, medication.endDate)}
                          className="h-2"
                        />
                      </div>
                    )} */}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-[#CBCFD7]/10 p-4">
                  {(medication.notes || medication.instructions) && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="notes">
                        <AccordionTrigger className="cursor-pointer text-sm hover:no-underline">
                          Notes & Instructions
                        </AccordionTrigger>
                        <AccordionContent>
                          {medication.notes && (
                            <div className="mb-2">
                              <p className="text-sm font-semibold">Notes:</p>
                              <p className="text-sm">{medication.notes}</p>
                            </div>
                          )}
                          {medication.instructions && (
                            <div>
                              <p className="text-sm font-semibold">Instructions:</p>
                              <p className="text-sm">{medication.instructions}</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
