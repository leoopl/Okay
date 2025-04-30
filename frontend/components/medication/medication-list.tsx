'use client';

import { useState, useEffect } from 'react';
import { useMedicationStore } from '@/lib/medication-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pill, PlusCircle, Edit, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import AddMedicationForm from './add-medication';
import { Input } from '@/components/ui/input';
import { Medication } from '@/lib/medication-store';

export default function MedicationList() {
  const { medications, fetchMedications, deleteMedication, logDose } = useMedicationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch medications on component mount
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleOpenAddDialog = () => {
    setSelectedMedication(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (medication: Medication) => {
    setSelectedMedication(medication);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (medication: Medication) => {
    setSelectedMedication(medication);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (selectedMedication) {
      await deleteMedication(selectedMedication.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleLogDose = async (medicationId: string, status: 'taken' | 'skipped' | 'delayed') => {
    await logDose({
      medicationId,
      status,
      timestamp: new Date(),
      notes: `Quick logged as ${status}`,
    });
  };

  // Filter medications based on search term
  const filteredMedications = medications.filter(
    (med: { name: string; dosage: string }) =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.dosage.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-green-dark font-varela text-2xl font-bold">Your Medications</h2>
        <Button
          onClick={handleOpenAddDialog}
          className="bg-green-dark hover:bg-green-medium gap-2 text-white"
        >
          <PlusCircle className="size-4" />
          Add New Medication
        </Button>
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="Search medications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <Pill className="text-muted-foreground absolute top-2.5 left-3 size-5" />
      </div>

      {medications.length === 0 ? (
        <div className="py-12 text-center">
          <div className="bg-green-light/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Pill className="text-green-dark h-8 w-8" />
          </div>
          <h3 className="text-green-dark mb-2 text-xl font-medium">No medications found</h3>
          <p className="text-beige-dark mb-6">Start by adding your medications to track them</p>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-green-dark hover:bg-green-medium gap-2 text-white"
          >
            <PlusCircle className="size-4" />
            Add your first medication
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMedications.map((medication: Medication) => (
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
                        onClick={() => handleOpenEditDialog(medication)}
                      >
                        <Edit className="size-4" />
                        <span className="sr-only">Edit medication</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive size-8 hover:bg-transparent"
                        onClick={() => handleOpenDeleteDialog(medication)}
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

                  <div className="flex flex-col text-sm text-[#91857A]">
                    <div className="flex justify-between">
                      <span>Start date:</span>
                      <span>{format(medication.startDate, 'MMM d, yyyy')}</span>
                    </div>
                    {medication.endDate && (
                      <div className="flex justify-between">
                        <span>End date:</span>
                        <span>{format(medication.endDate, 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 p-4">
                <div className="flex w-full gap-2">
                  <Button
                    onClick={() => handleLogDose(medication.id, 'taken')}
                    variant="outline"
                    size="sm"
                    className="border-green-dark text-green-dark hover:bg-green-light/30 flex-1 gap-1"
                  >
                    <CheckCircle className="size-4" />
                    Taken
                  </Button>
                  <Button
                    onClick={() => handleLogDose(medication.id, 'skipped')}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 border-red-500 text-red-500 hover:bg-red-50"
                  >
                    <XCircle className="size-4" />
                    Skip
                  </Button>
                  <Button
                    onClick={() => handleLogDose(medication.id, 'delayed')}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 border-amber-500 text-amber-500 hover:bg-amber-50"
                  >
                    <Clock className="size-4" />
                    Delay
                  </Button>
                </div>

                {(medication.notes || medication.instructions) && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="notes" className="border-none">
                      <AccordionTrigger className="py-2 text-sm hover:no-underline">
                        Notes & Instructions
                      </AccordionTrigger>
                      <AccordionContent>
                        {medication.notes && (
                          <div className="mb-2">
                            <p className="text-sm font-semibold">Notes:</p>
                            <p className="text-muted-foreground text-sm">{medication.notes}</p>
                          </div>
                        )}
                        {medication.instructions && (
                          <div>
                            <p className="text-sm font-semibold">Instructions:</p>
                            <p className="text-muted-foreground text-sm">
                              {medication.instructions}
                            </p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Medication Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Add New Medication</DialogTitle>
          </DialogHeader>
          <AddMedicationForm onClose={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Medication Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
          </DialogHeader>
          {selectedMedication && (
            <AddMedicationForm
              medication={selectedMedication}
              onClose={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete {selectedMedication?.name}?</p>
            <p className="text-muted-foreground mt-2 text-sm">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
