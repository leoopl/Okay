'use client';

import React, { use, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Tag, Smile } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJournalStore } from '@/store/journal-store';
import { createDefaultTipTapContent, validateTipTapContent } from '@/services/journal-service';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { JournalEditor } from '@/components/journal/journal-editor';

interface JournalEditorPageProps {
  params: Promise<{ slug: string }>;
}

// Mood options for journal entries
const MOOD_OPTIONS = [
  { value: 'happy', label: '😊 Happy' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'excited', label: '🤩 Excited' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'calm', label: '😌 Calm' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'grateful', label: '🙏 Grateful' },
  { value: 'confused', label: '😕 Confused' },
  { value: 'proud', label: '😎 Proud' },
  { value: 'tired', label: '😴 Tired' },
  { value: 'neutral', label: '😐 Neutral' },
];

export default function JournalEditorPage({ params }: JournalEditorPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const isNewEntry = slug === 'new';

  // Store state and actions
  const {
    currentEntry,
    isLoading,
    error,
    getJournalById,
    createJournal,
    updateJournal,
    deleteJournal,
    setCurrentEntry,
    clearError,
  } = useJournalStore();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [newTag, setNewTag] = useState('');

  // Initial values for unsaved changes detection
  const [initialValues, setInitialValues] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    mood: '',
  });

  // Track if this is the first load
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Helper function to compare tag arrays (order-independent)
  const tagsAreEqual = useCallback((a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;

    // Create sets for O(1) lookup instead of sorting
    const setA = new Set(a);
    const setB = new Set(b);

    // Check if all items in A exist in B
    for (const item of setA) {
      if (!setB.has(item)) return false;
    }

    return true;
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (isFirstLoad) return false;

    return (
      title !== initialValues.title ||
      content !== initialValues.content ||
      !tagsAreEqual(tags, initialValues.tags) ||
      mood !== initialValues.mood
    );
  }, [title, content, tags, mood, initialValues, isFirstLoad, tagsAreEqual]);

  // Unsaved changes hook
  const { showDialog, handleContinue, handleCancel, checkAndShowDialog } = useUnsavedChanges({
    hasUnsavedChanges,
    message: 'You have unsaved changes. Do you want to save them before leaving?',
  });

  useEffect(() => {
    // Additional protection for browser events
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return ''; // Required for some browsers
      }
    };

    const handleUnload = () => {
      if (hasUnsavedChanges) {
        // Attempt to save data to localStorage as a backup
        localStorage.setItem(
          'unsaved_journal_backup',
          JSON.stringify({
            title,
            content,
            tags,
            mood,
            timestamp: Date.now(),
          }),
        );
      }
    };

    // Listen for browser events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [hasUnsavedChanges, title, content, tags, mood]);

  // Optional: Add this useEffect to recover from localStorage on page load
  useEffect(() => {
    // Check for backup data on page load
    const backup = localStorage.getItem('unsaved_journal_backup');
    if (backup && isNewEntry) {
      try {
        const backupData = JSON.parse(backup);
        const backupAge = Date.now() - backupData.timestamp;

        // Only restore if backup is less than 1 hour old
        if (backupAge < 60 * 60 * 1000) {
          // Show option to restore
          if (
            confirm(
              'We found unsaved changes from your previous session. Would you like to restore them?',
            )
          ) {
            setTitle(backupData.title);
            setContent(backupData.content);
            setTags(backupData.tags);
            setMood(backupData.mood);
          }
        }

        // Clear the backup
        localStorage.removeItem('unsaved_journal_backup');
      } catch (error) {
        console.error('Error restoring backup:', error);
        localStorage.removeItem('unsaved_journal_backup');
      }
    }
  }, [isNewEntry]);

  // Clear backup when saving successfully
  useEffect(() => {
    if (!hasUnsavedChanges) {
      localStorage.removeItem('unsaved_journal_backup');
    }
  }, [hasUnsavedChanges]);

  // Load entry data
  useEffect(() => {
    async function loadEntry() {
      if (isNewEntry) {
        // Set default values for new entry
        const defaultContent = createDefaultTipTapContent();
        setTitle('Give your thoughts a title...');
        setContent(defaultContent);
        setTags([]);
        setMood('');
        setInitialValues({
          title: 'Give your thoughts a title...',
          content: defaultContent,
          tags: [],
          mood: '',
        });
        setIsFirstLoad(false);
      } else {
        try {
          const entry = await getJournalById(slug);
          if (entry) {
            setTitle(entry.title);
            setContent(entry.content);
            setTags(entry.tags);
            setMood(entry.mood || '');
            setInitialValues({
              title: entry.title,
              content: entry.content,
              tags: entry.tags,
              mood: entry.mood || '',
            });
          }
          setIsFirstLoad(false);
        } catch (error) {
          toast.error('Failed to load journal entry');
          router.push('/journal');
        }
      }
    }

    loadEntry();
  }, [slug, isNewEntry, getJournalById, router]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Handle saving
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your journal entry');
      return;
    }

    if (!content.trim() || !validateTipTapContent(content)) {
      toast.error('Please enter some content for your journal entry');
      return;
    }

    try {
      // Prepare the data object
      const journalData = {
        title: title.trim(),
        content,
        tags,
        mood,
      };

      // Only include mood if it's not empty
      if (mood && mood.trim()) {
        journalData.mood = mood;
      }

      if (isNewEntry) {
        const newEntry = await createJournal(journalData);

        // Update initial values
        setInitialValues({
          title: newEntry.title,
          content: newEntry.content,
          tags: newEntry.tags,
          mood: newEntry.mood || '',
        });

        toast.success('Journal entry created successfully');
        router.replace(`/journal/${newEntry.id}`);
      } else {
        await updateJournal(slug, journalData);

        // Update initial values
        setInitialValues({
          title: title.trim(),
          content,
          tags,
          mood: mood || '',
        });

        toast.success('Journal entry saved successfully');
      }
    } catch (error) {
      toast.error('Failed to save journal entry');
      console.error('Error saving journal:', error);
    }
  }, [title, content, tags, mood, isNewEntry, createJournal, updateJournal, slug, router]);

  // Handle deleting
  const handleDelete = useCallback(async () => {
    if (isNewEntry) return;

    try {
      await deleteJournal(slug);
      toast.success('Journal entry deleted');
      router.push('/journal');
    } catch (error) {
      toast.error('Failed to delete journal entry');
      console.error('Error deleting journal:', error);
    }
  }, [deleteJournal, slug, router, isNewEntry]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    const shouldShowDialog = checkAndShowDialog(() => {
      router.push('/journal');
    });

    // If no unsaved changes, navigate immediately
    if (!shouldShowDialog) {
      router.push('/journal');
    }
  }, [checkAndShowDialog, router]);

  // Handle adding tags
  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags((prev) => [...prev, trimmedTag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  // Handle removing tags
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  // Handle key press for adding tags
  const handleTagKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  // Handle TipTap content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#7F9463] border-t-transparent"></div>
            <p className="text-beige-dark">Loading journal entry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} className="hover:bg-yellow-light">
          <ArrowLeft size={18} className="mr-2" />
          Back to Journal
        </Button>

        <div className="flex gap-2">
          {!isNewEntry && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-destructive hover:bg-destructive font-varela text-destructive hover:text-red-700"
            >
              <Trash2 size={18} className="mb-0.5" />
              Delete
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isLoading || !hasUnsavedChanges}
            className="bg-yellow-dark hover:bg-yellow-medium font-varela text-black disabled:opacity-50"
          >
            <Save size={18} className="mb-0.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="font-varela !text-green-dark placeholder:!text-green-dark/50 focus-visible:!border-green-dark/30 !h-auto !border-b-2 !border-none !border-transparent !bg-transparent !px-0 !py-4 !text-4xl !leading-tight !font-bold !tracking-tight !shadow-none !transition-colors !duration-200 focus-visible:!ring-0"
        placeholder="Give your thoughts a title..."
      />

      {/* Metadata Section */}
      <div className="border-grey-light bg-beige-light/20 mb-6 space-y-4 rounded-lg border p-4">
        {/* Mood Selector */}
        <div className="space-y-2">
          <Label htmlFor="mood" className="text-green-dark flex items-center text-sm font-medium">
            <Smile size={16} className="mr-2" />
            How are you feeling?
          </Label>
          <Select
            value={mood || undefined} // Convert empty string to undefined for placeholder
            onValueChange={(value) => setMood(value || '')} // Convert back to empty string internally
          >
            <SelectTrigger className="border-grey-light focus:ring-blue-dark w-full">
              <SelectValue placeholder="Select your mood..." />
            </SelectTrigger>
            <SelectContent>
              {MOOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags Section */}
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-green-dark flex items-center text-sm font-medium">
            <Tag size={16} className="mr-2" />
            Tags
          </Label>

          {/* Tag Input */}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              placeholder="Add a tag..."
              className="border-grey-light focus-visible:ring-blue-medium"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              className="border-yellow-dark text-yellow-dark font-varela hover:bg-yellow-dark hover:text-black"
            >
              Add
            </Button>
          </div>

          {/* Display Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-yellow-medium hover:bg-yellow-light cursor-pointer text-black"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Editor */}
      <div className="border-grey-light min-h-[60vh] rounded-lg border bg-white p-4">
        <JournalEditor content={content} onUpdate={handleContentChange} />
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog
        open={showDialog}
        onOpenChange={() => {
          /* Prevent closing via overlay */
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-black/80">
              You have unsaved changes. Do you want to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="hover:bg-beige-dark text-black" onClick={handleCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await handleSave();
                  handleContinue();
                } catch (error) {
                  // If save fails, don't navigate
                  console.error('Failed to save:', error);
                  toast.error('Failed to save. Please try again.');
                }
              }}
              className="bg-yellow-dark hover:bg-yellow-medium text-black"
            >
              Save & Continue
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleContinue}
              className="hover:bg-destructive bg-red-200 text-black"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
