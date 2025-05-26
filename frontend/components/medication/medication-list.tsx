'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Pill, PlusCircle, Edit, Trash2, Clock, Search, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import AddMedicationForm from './add-medication';
import { Input } from '@/components/ui/input';
import { type Medication, useMedicationStore, type DoseStatus } from '@/store/medication-store';
import { cn } from '@/lib/utils';

interface MedicationListProps {
  className?: string;
}

const SEARCH_PLACEHOLDER = 'Search medications by name or dosage...';
const SEARCH_DEBOUNCE_MS = 300;

export default function MedicationList({ className }: MedicationListProps) {
  const { medications, loadingStates, errors, fetchMedications, deleteMedication, logDose } =
    useMedicationStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Computed loading and error states
  const isLoading = loadingStates.medications;
  const isDeleting = loadingStates.deleting;
  const error = errors.medications?.message;

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch medications on component mount with cleanup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadMedications = async () => {
      try {
        if (isMounted) {
          await fetchMedications();
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load medications:', error);
        }
      }
    };

    loadMedications();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [fetchMedications]);

  // Memoized filtered medications for performance
  const filteredMedications = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return medications;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return medications.filter(
      (med) =>
        med.name.toLowerCase().includes(searchLower) ||
        med.dosage.toLowerCase().includes(searchLower) ||
        med.form.toLowerCase().includes(searchLower),
    );
  }, [medications, debouncedSearchTerm]);

  // Optimized dialog handlers with useCallback
  const handleOpenAddDialog = useCallback(() => {
    setSelectedMedication(null);
    setIsAddDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((medication: Medication) => {
    setSelectedMedication(medication);
    setIsEditDialogOpen(true);
  }, []);

  const handleOpenDeleteDialog = useCallback((medication: Medication) => {
    setSelectedMedication(medication);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleCloseDialogs = useCallback(() => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedMedication(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedMedication) return;

    try {
      await deleteMedication(selectedMedication.id);
      setIsDeleteDialogOpen(false);
      setSelectedMedication(null);
    } catch (error) {
      console.error('Failed to delete medication:', error);
    }
  }, [selectedMedication, deleteMedication]);

  const handleLogDose = useCallback(
    async (medicationId: string, status: DoseStatus) => {
      try {
        await logDose({
          medicationId,
          status,
          timestamp: new Date(),
          notes: `Quick logged as ${status}`,
        });
      } catch (error) {
        console.error('Failed to log dose:', error);
      }
    },
    [logDose],
  );

  // Memoized medication card component
  const MedicationCard = useCallback(
    ({ medication }: { medication: Medication }) => {
      const isActive = !medication.endDate || medication.endDate > new Date();

      return (
        <Card
          className={cn(
            'hover:border-blue-dark border-grey-light overflow-hidden transition-colors',
            !isActive && 'opacity-60',
          )}
        >
          <CardContent className="p-0">
            <div className="border-grey-light border-b p-4">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-green-dark truncate text-lg font-bold" title={medication.name}>
                  {medication.name}
                </h3>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-blue-light size-8 hover:bg-transparent"
                    onClick={() => handleOpenEditDialog(medication)}
                    disabled={isDeleting}
                    aria-label={`Edit ${medication.name}`}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-destructive size-8 hover:bg-transparent"
                    onClick={() => handleOpenDeleteDialog(medication)}
                    disabled={isDeleting}
                    aria-label={`Delete ${medication.name}`}
                  >
                    {isDeleting && selectedMedication?.id === medication.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="text-beige-dark bg-beige-light/40">
                  {medication.form}
                </Badge>
                <Badge variant="outline" className="text-blue-dark bg-blue-medium/30">
                  {medication.dosage}
                </Badge>
                {!isActive && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-500">
                    Expired
                  </Badge>
                )}
              </div>

              <div className="text-beige-dark flex flex-col space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Start date:</span>
                  <time dateTime={medication.startDate.toISOString()}>
                    {format(medication.startDate, 'MMM d, yyyy')}
                  </time>
                </div>
                {medication.endDate && (
                  <div className="flex justify-between">
                    <span>End date:</span>
                    <time dateTime={medication.endDate.toISOString()}>
                      {format(medication.endDate, 'MMM d, yyyy')}
                    </time>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-4">
            {medication.schedule && medication.schedule.length > 0 ? (
              <div className="w-full space-y-2">
                <p className="text-sm font-semibold">Schedule:</p>
                {medication.schedule.map((scheduleItem, index) => (
                  <div
                    key={index}
                    className="border-grey-light bg-grey-light/10 flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="text-beige-dark size-4" aria-hidden="true" />
                      <time className="text-beige-dark text-sm font-medium">
                        {scheduleItem.time}
                      </time>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {scheduleItem.days.map((day) => (
                        <Badge
                          key={day}
                          variant="outline"
                          className="border-blue-light bg-blue-light/10 text-beige-dark px-1.5 py-0.5 text-[10px] font-normal"
                        >
                          {day.substring(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex w-full items-center justify-center rounded-md border border-dashed border-gray-300 p-3">
                <p className="text-sm text-gray-500">No schedule defined for this medication.</p>
              </div>
            )}

            {(medication.notes || medication.instructions) && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="notes" className="border-none">
                  <AccordionTrigger className="cursor-pointer py-2 text-sm hover:no-underline">
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
                        <p className="text-muted-foreground text-sm">{medication.instructions}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardFooter>
        </Card>
      );
    },
    [handleOpenEditDialog, handleOpenDeleteDialog, isDeleting, selectedMedication],
  );

  // Error state
  if (error && !medications.length) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h3 className="mb-2 text-xl font-medium text-red-800">Unable to load medications</h3>
          <p className="mb-4 text-red-600">{error}</p>
          <Button onClick={fetchMedications} variant="outline" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-green-dark font-varela text-2xl font-bold">Your Medications</h2>
          {isLoading && <Loader2 className="text-green-dark size-5 animate-spin" />}
        </div>
        <Button onClick={handleOpenAddDialog} disabled={isLoading} className="gap-2">
          <PlusCircle className="mb-0.5 size-4" />
          Add New Medication
        </Button>
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder={SEARCH_PLACEHOLDER}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          disabled={isLoading}
          aria-label="Search medications"
        />
        <Search
          className="text-muted-foreground absolute top-2.5 left-3 size-5"
          aria-hidden="true"
        />
        {debouncedSearchTerm && (
          <div className="text-muted-foreground mt-2 text-sm">
            {filteredMedications.length} of {medications.length} medications shown
          </div>
        )}
      </div>

      {isLoading && medications.length === 0 ? (
        <div className="py-12 text-center">
          <Loader2 className="text-green-dark mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading your medications...</p>
        </div>
      ) : medications.length === 0 ? (
        <div className="py-12 text-center">
          <div className="bg-green-light/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Pill className="text-green-dark h-8 w-8" />
          </div>
          <h3 className="text-green-dark mb-2 text-xl font-medium">No medications found</h3>
          <p className="text-beige-dark mb-6">Start by adding your medications to track them</p>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 mb-0.5 size-4" />
            Add your first medication
          </Button>
        </div>
      ) : filteredMedications.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-medium">No medications match your search</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms or browse all medications
          </p>
          <Button variant="outline" onClick={() => setSearchTerm('')}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMedications.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      )}

      {/* Add Medication Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Add New Medication</DialogTitle>
          </DialogHeader>
          <AddMedicationForm onClose={handleCloseDialogs} />
        </DialogContent>
      </Dialog>

      {/* Edit Medication Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
          </DialogHeader>
          {selectedMedication && (
            <AddMedicationForm medication={selectedMedication} onClose={handleCloseDialogs} />
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
            <p>
              Are you sure you want to delete <strong>{selectedMedication?.name}</strong>?
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              This action cannot be undone and will remove all associated dose logs.
            </p>
          </div>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
