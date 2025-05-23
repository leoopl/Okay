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
  { value: '', label: 'Select mood...' },
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

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (isFirstLoad) return false;

    return (
      title !== initialValues.title ||
      content !== initialValues.content ||
      JSON.stringify(tags.sort()) !== JSON.stringify(initialValues.tags.sort()) ||
      mood !== initialValues.mood
    );
  }, [title, content, tags, mood, initialValues, isFirstLoad]);

  // Unsaved changes hook
  const { showDialog, handleContinue, handleCancel } = useUnsavedChanges({
    hasUnsavedChanges,
    message: 'You have unsaved changes. Do you want to save them before leaving?',
  });

  // Load entry data
  useEffect(() => {
    async function loadEntry() {
      if (isNewEntry) {
        // Set default values for new entry
        const defaultContent = createDefaultTipTapContent();
        setTitle('New Journal Entry');
        setContent(defaultContent);
        setTags([]);
        setMood('');
        setInitialValues({
          title: 'New Journal Entry',
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
      if (isNewEntry) {
        const newEntry = await createJournal({
          title: title.trim(),
          content,
          tags,
          mood,
        });

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
        await updateJournal(slug, {
          title: title.trim(),
          content,
          tags,
          mood,
        });

        // Update initial values
        setInitialValues({
          title: title.trim(),
          content,
          tags,
          mood,
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
    if (hasUnsavedChanges) {
      // This will trigger the unsaved changes dialog
      router.push('/journal');
    } else {
      router.push('/journal');
    }
  }, [hasUnsavedChanges, router]);

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
            <p className="text-[#91857A]">Loading journal entry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-grey-dark hover:bg-[#D1DBC3]/20 hover:text-[#7F9463]"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Journal
        </Button>

        <div className="flex gap-2">
          {!isNewEntry && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={18} className="mr-2" />
              Delete
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isLoading || !hasUnsavedChanges}
            className="bg-[#7F9463] text-white hover:bg-[#ABB899] disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-none px-0 text-2xl font-bold text-[#7F9463] shadow-none focus-visible:ring-0"
          placeholder="Enter title..."
        />
      </div>

      {/* Metadata Section */}
      <div className="mb-6 space-y-4 rounded-lg border border-[#CBCFD7] bg-[#F2DECC]/10 p-4">
        {/* Mood Selector */}
        <div className="space-y-2">
          <Label htmlFor="mood" className="flex items-center text-sm font-medium text-[#7F9463]">
            <Smile size={16} className="mr-2" />
            How are you feeling?
          </Label>
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger className="w-full border-[#CBCFD7] focus:ring-[#78C7EE]">
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
          <Label htmlFor="tags" className="flex items-center text-sm font-medium text-[#7F9463]">
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
              className="border-[#CBCFD7] focus-visible:ring-[#78C7EE]"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              className="border-[#7F9463] text-[#7F9463] hover:bg-[#7F9463] hover:text-white"
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
                  className="cursor-pointer bg-[#7F9463] text-white hover:bg-[#ABB899]"
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
      <div className="min-h-[60vh] rounded-lg border border-[#CBCFD7] bg-white p-4">
        <JournalEditor content={content} onUpdate={handleContentChange} />
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleSave();
                handleContinue();
              }}
              className="bg-[#7F9463] text-white hover:bg-[#ABB899]"
            >
              Save & Continue
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleContinue}
              className="bg-[#C2B2A3] text-white hover:bg-[#91857A]"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
