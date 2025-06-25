'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export function IncompleteProfileDialog() {
  const { profile } = useAuth();
  const isAuthenticated = !!profile;
  const isProfileComplete = !!(profile && profile.surname && profile.profilePictureUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownDialog, setHasShownDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we should show the dialog
    if (isAuthenticated && profile && !isProfileComplete && !hasShownDialog) {
      // Check if the user has already seen the dialog this session
      const sessionKey = `profile-warning-${profile.id}`;
      const hasSeenThisSession = sessionStorage.getItem(sessionKey);

      if (!hasSeenThisSession) {
        setIsOpen(true);
        setHasShownDialog(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [isAuthenticated, profile, isProfileComplete, hasShownDialog]);

  const handleGoToProfile = () => {
    setIsOpen(false);
    router.push('/profile');
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  // Don't render if user is not authenticated or profile is complete
  if (!isAuthenticated || !profile || isProfileComplete) {
    return null;
  }

  // Determine what's missing
  const missingFields: string[] = [];
  if (!profile.surname) missingFields.push('sobrenome');
  if (!profile.profilePictureUrl) missingFields.push('foto de perfil');
  if (!profile.birthdate) missingFields.push('data de nascimento');
  if (!profile.gender) missingFields.push('gênero');

  const missingFieldsText = missingFields.join(', ');

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <UserCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <AlertDialogTitle>Complete seu perfil</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            Olá {profile.name}! Notamos que seu perfil está incompleto. Para ter uma experiência
            completa na plataforma, por favor adicione as seguintes informações:
            <strong className="mt-2 block text-sm">{missingFieldsText}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            onClick={handleDismiss}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Lembrar mais tarde
          </button>
          <AlertDialogAction onClick={handleGoToProfile}>Completar perfil</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
