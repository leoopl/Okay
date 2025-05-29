'use client';

import { useCallback, useTransition, memo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Progress } from '@/components/ui/progress';
import { UserCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useProfileCompletionContext } from '@/providers/profile-completion-provider';
import { useProfileCompletion } from '@/hooks/use-profile-completion';

/**
 * Presentational component for displaying missing fields
 * Memoized to prevent unnecessary re-renders
 */
const MissingFieldsAlert = memo(({ items }: { items: string[] }) => {
  if (!items.length) return null;

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-yellow-800">Informações pendentes:</p>
          <ul className="space-y-0.5 text-xs text-yellow-700">
            {items.map((name) => (
              <li key={name}>• {name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

MissingFieldsAlert.displayName = 'MissingFieldsAlert';

/**
 *  Profile Completion Dialog
 *
 * Features:
 * - Uses centralized state from context
 * - Memoized components to prevent unnecessary renders
 * - Proper error handling and loading states
 * - Accessibility improvements
 * - Performance optimized with transitions
 */
export function ProfileCompletionDialog() {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Get all profile completion state from context
  const { isDialogOpen, completionStatus, missingFieldsDisplay, closeDialog, dismissDialog } =
    useProfileCompletionContext();

  // Handle navigation to profile completion
  const handleComplete = useCallback(() => {
    startTransition(() => {
      dismissDialog();
      router.push('/profile?complete=true');
    });
  }, [dismissDialog, router]);

  // Handle dialog dismissal
  const handleDismiss = useCallback(() => {
    dismissDialog();
  }, [dismissDialog]);

  // Don't render if no user or dialog shouldn't be open
  if (!user || !isDialogOpen) {
    return null;
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={closeDialog}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <UserCircle className="text-primary h-6 w-6" />
            <AlertDialogTitle>Complete seu Perfil</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Bem-vindo ao Okay! Para personalizar sua experiência e fornecer o melhor suporte
              possível, precisamos de algumas informações adicionais.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso do perfil</span>
                <span className="font-medium">{completionStatus.completionPercentage}%</span>
              </div>
              <Progress
                value={completionStatus.completionPercentage}
                className="h-2"
                aria-label={`Progresso do perfil: ${completionStatus.completionPercentage}%`}
              />
            </div>

            <MissingFieldsAlert items={missingFieldsDisplay} />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss} disabled={isPending}>
            Lembrar mais tarde
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleComplete} disabled={isPending}>
            {isPending ? 'Aguarde...' : 'Completar Perfil'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Alternative component that accepts props directly (for cases where context isn't available)
interface StandaloneProfileCompletionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function StandaloneProfileCompletionDialog({
  isOpen,
  onOpenChange,
  onComplete,
  onDismiss,
}: StandaloneProfileCompletionDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Use the hook directly if not using the provider
  const { completionStatus, missingFieldsDisplay } = useProfileCompletion({ user });

  const handleComplete = useCallback(() => {
    startTransition(() => {
      onComplete?.();
      router.push('/profile?complete=true');
    });
  }, [onComplete, router]);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
    onOpenChange(false);
  }, [onDismiss, onOpenChange]);

  if (!user) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <UserCircle className="text-primary h-6 w-6" />
            <AlertDialogTitle>Complete seu Perfil</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Bem-vindo ao Okay! Para personalizar sua experiência e fornecer o melhor suporte
              possível, precisamos de algumas informações adicionais.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso do perfil</span>
                <span className="font-medium">{completionStatus.completionPercentage}%</span>
              </div>
              <Progress
                value={completionStatus.completionPercentage}
                className="h-2"
                aria-label={`Progresso do perfil: ${completionStatus.completionPercentage}%`}
              />
            </div>

            <MissingFieldsAlert items={missingFieldsDisplay} />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss} disabled={isPending}>
            Lembrar mais tarde
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleComplete} disabled={isPending}>
            {isPending ? 'Aguarde...' : 'Completar Perfil'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
