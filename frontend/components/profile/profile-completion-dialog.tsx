'use client';

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
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
import {
  checkProfileCompletion,
  dismissProfileCompletionPrompt,
  getFieldDisplayName,
  shouldShowProfileCompletionPrompt,
} from '@/lib/profile-completion-utils';
import type { UserProfile } from '@/lib/definitions';

// Presentational subcomponent for missing fields
function MissingFieldsAlert({ items }: { items: string[] }) {
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
}

// Hook to manage prompt visibility logic
function useProfilePrompt(user: UserProfile | null) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user && shouldShowProfileCompletionPrompt(user)) {
      const timer = window.setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismiss = useCallback(() => {
    if (user) dismissProfileCompletionPrompt(user.id);
    setIsOpen(false);
  }, [user]);

  return { isOpen, dismiss };
}

export function ProfileCompletionDialog({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const { isOpen, dismiss } = useProfilePrompt(user);
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  // Memoize computation for performance
  const completionStatus = useMemo(() => checkProfileCompletion(user), [user]);
  const missingDisplayNames = useMemo(
    () => completionStatus.missingFields.map(getFieldDisplayName),
    [completionStatus.missingFields],
  );

  const handleComplete = useCallback(() => {
    dismiss();
    startTransition(() => {
      router.push('/profile?complete=true');
      onComplete?.();
    });
  }, [dismiss, router, onComplete]);

  return (
    <AlertDialog open={isOpen} onOpenChange={dismiss}>
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
              <Progress value={completionStatus.completionPercentage} className="h-2" />
            </div>

            {missingDisplayNames.length > 0 && <MissingFieldsAlert items={missingDisplayNames} />}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>Lembrar mais tarde</AlertDialogCancel>
          <AlertDialogAction onClick={handleComplete} disabled={isPending}>
            {isPending ? 'Aguarde...' : 'Completar Perfil'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
