'use client';

import React, { use, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Tag, Smile, Cloud, CloudOff } from 'lucide-react';
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
import { createDefaultTipTapContent, validateTipTapContent } from '@/lib/tiptap-utils';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { JournalEditor } from '@/components/journal/journal-editor';
interface JournalEditorPageProps {
  params: Promise<{ slug: string }>;
}

// Mood options for journal entries
const MOOD_OPTIONS = [
  { value: 'happy', label: '😊 Feliz' },
  { value: 'sad', label: '😢 Triste' },
  { value: 'excited', label: '🤩 Animado' },
  { value: 'anxious', label: '😰 Ansioso' },
  { value: 'calm', label: '😌 Calmo' },
  { value: 'angry', label: '😠 Irritado' },
  { value: 'grateful', label: '🙏 Grato' },
  { value: 'confused', label: '😕 Confuso' },
  { value: 'proud', label: '😎 Orgulhoso' },
  { value: 'tired', label: '😴 Cansado' },
  { value: 'neutral', label: '😐 Neutro' },
];

export default function JournalEditorPage({ params }: JournalEditorPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const isNewEntry = slug === 'new';

  // Store state and actions
  const { isLoading, error, getJournalById, createJournal, updateJournal, clearError } =
    useJournalStore();

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

  // Offline sync
  const { isOnline, updateOffline } = useOfflineSync();

  // Helper function to compare tag arrays (order-independent)
  const tagsAreEqual = useCallback((a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
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
    message: 'Você tem alterações não salvas. Deseja salvá-las antes de sair?',
  });

  // Load entry data
  useEffect(() => {
    async function loadEntry() {
      if (isNewEntry) {
        // Set default values for new entry
        const defaultContent = JSON.stringify(createDefaultTipTapContent());
        setTitle('Dê um título aos seus pensamentos...');
        setContent(defaultContent);
        setTags([]);
        setMood('');
        setInitialValues({
          title: 'Dê um título aos seus pensamentos...',
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
        } catch (_error) {
          toast.error('Falha ao carregar entrada do diário');
          router.push('/journal');
        }
      }
    }

    loadEntry();
  }, [slug, isNewEntry, getJournalById, router]);

  // Auto-save when content changes
  // useEffect(() => {
  //   if (!isNewEntry && hasUnsavedChanges && !isFirstLoad) {
  //     autoSave(slug, {
  //       title,
  //       content,
  //       tags,
  //       mood: mood || undefined,
  //     });
  //   }
  // }, [title, content, tags, mood, hasUnsavedChanges, isFirstLoad, isNewEntry, slug, autoSave]);

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
      toast.error('Por favor, insira um título para sua entrada');
      return;
    }

    if (!content.trim() || !validateTipTapContent(content)) {
      toast.error('Por favor, insira algum conteúdo para sua entrada');
      return;
    }

    try {
      const journalData = {
        title: title.trim(),
        content,
        tags,
        mood: mood || undefined,
      };

      if (isNewEntry) {
        const newEntry = await createJournal(journalData);

        // Update initial values
        setInitialValues({
          title: newEntry.title,
          content: newEntry.content,
          tags: newEntry.tags,
          mood: newEntry.mood || '',
        });

        toast.success('Entrada criada com sucesso');
        router.replace(`/journal/${newEntry.id}`);
      } else {
        if (isOnline) {
          await updateJournal(slug, journalData);
        } else {
          await updateOffline(slug, journalData);
        }

        // Update initial values
        setInitialValues({
          title: title.trim(),
          content,
          tags,
          mood: mood || '',
        });

        toast.success(isOnline ? 'Entrada salva com sucesso' : 'Salvo offline');
      }
    } catch (error) {
      toast.error('Falha ao salvar entrada');
      console.error('Erro ao salvar entrada do diário:', error);
    }
  }, [
    title,
    content,
    tags,
    mood,
    isNewEntry,
    isOnline,
    createJournal,
    updateJournal,
    updateOffline,
    slug,
    router,
  ]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    const shouldShowDialog = checkAndShowDialog(() => {
      router.push('/journal');
    });

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
            <div className="border-accent-strong mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
            <p className="text-muted-foreground">Carregando entrada...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} className="hover:bg-primary/20">
          <ArrowLeft size={18} className="mr-2" />
          Voltar ao Diário
        </Button>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            {isOnline ? (
              <>
                <div className="text-accent-strong flex items-center gap-1">
                  <Cloud size={16} />
                  <span>Conectado</span>
                </div>
              </>
            ) : (
              <div className="text-primary flex items-center gap-1">
                <CloudOff size={16} />
                <span>Offline</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasUnsavedChanges}
              className="bg-primary hover:bg-primary/80 font-varela text-primary-foreground disabled:opacity-50"
            >
              <Save size={18} className="mb-0.5" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="font-varela text-accent-strong! placeholder:text-accent-strong/50! focus-visible:border-accent-strong/30! h-auto! border-b-2! border-none! border-transparent! bg-transparent! px-0! py-4! text-4xl! leading-tight! font-bold! tracking-tight! shadow-none! transition-colors! duration-200! focus-visible:ring-0!"
        placeholder="Dê um título aos seus pensamentos..."
      />

      {/* Metadata Section */}
      <div className="border-border bg-muted/20 mb-6 space-y-4 rounded-lg border p-4">
        {/* Mood Selector */}
        <div className="space-y-2">
          <Label
            htmlFor="mood"
            className="text-accent-strong flex items-center text-sm font-medium"
          >
            <Smile size={16} className="mr-2" />
            Como você está se sentindo?
          </Label>
          <Select value={mood || undefined} onValueChange={(value) => setMood(value || '')}>
            <SelectTrigger className="border-border focus:ring-ring w-full">
              <SelectValue placeholder="Selecione seu humor..." />
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
          <Label
            htmlFor="tags"
            className="text-accent-strong flex items-center text-sm font-medium"
          >
            <Tag size={16} className="mr-2" />
            Tags
          </Label>

          {/* Tag Input */}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              placeholder="Adicionar tag..."
              className="border-border focus-visible:ring-ring"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              className="border-primary text-primary font-varela hover:bg-primary hover:text-primary-foreground"
            >
              Adicionar
            </Button>
          </div>

          {/* Display Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-primary hover:bg-primary/80 text-primary-foreground cursor-pointer"
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
      <div className="border-border bg-card min-h-[60vh] rounded-lg border p-4">
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
            <AlertDialogTitle>Alterações Não Salvas</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80">
              Você tem alterações não salvas. Deseja salvá-las antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="hover:bg-muted text-foreground" onClick={handleCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await handleSave();
                  handleContinue();
                } catch (error) {
                  console.error('Failed to save:', error);
                  toast.error('Falha ao salvar. Por favor, tente novamente.');
                }
              }}
              className="bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Salvar e Continuar
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleContinue}
              className="bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground"
            >
              Descartar Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
