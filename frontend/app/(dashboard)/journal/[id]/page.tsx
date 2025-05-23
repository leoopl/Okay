import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
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
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { toast } from 'sonner';

export const metadata = {
  title: 'Journal Entry | Okay',
  description: 'Edit your journal entry',
};
export default function JournalEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { entries, updateEntry } = useJournalStore();

  const entry = entries.find((e) => e.id === slug) || {
    id: slug,
    title: 'New Page',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [initialTitle] = useState(entry.title);
  const [initialContent] = useState(entry.content);

  const hasUnsavedChanges = title !== initialTitle || content !== initialContent;

  const { showDialog, handleContinue, handleCancel } = useUnsavedChanges(hasUnsavedChanges);

  const handleSave = () => {
    updateEntry(slug, { title, content });
    toast.success('Journal entry saved', {
      description: 'Your journal entry has been saved successfully.',
    });
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      // This is handled by the useUnsavedChanges hook
    } else {
      router.push('/journal');
    }
  };
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-grey-dark hover:bg-[#D1DBC3]/20 hover:text-[#7F9463]"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Journal
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className="text-black disabled:opacity-50"
        >
          <Save size={18} className="mr-2" />
          Save
        </Button>
      </div>

      <div className="mb-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-none px-0 text-2xl font-bold text-[#7F9463] shadow-none focus-visible:ring-0"
          placeholder="Enter title..."
        />
      </div>

      <div className="min-h-[60vh] rounded-lg border border-[#CBCFD7] bg-white p-4">
        <SimpleEditor content={entry.content} />
      </div>

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
              onClick={() => {
                handleSave();
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
