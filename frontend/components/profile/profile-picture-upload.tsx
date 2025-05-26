'use client';

import { useEffect, useRef, useState, startTransition } from 'react';
import { useActionState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, CircleUser, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getUserInitials } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/actions/server-profile';

interface ProfilePictureUploadProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'size-12',
  md: 'size-16',
  lg: 'size-20',
  xl: 'size-24',
};

export function ProfilePictureUpload({ className = '', size = 'xl' }: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, uploadAction, isUploadPending] = useActionState(
    uploadProfilePicture,
    undefined,
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteProfilePicture,
    undefined,
  );

  // Handle upload success/error
  useEffect(() => {
    if (uploadState?.success) {
      toast.success('Foto atualizada', {
        description: uploadState.message,
      });
      setIsUploading(false);
    } else if (uploadState && !uploadState.success && uploadState.message) {
      toast.error('Erro no upload', {
        description: uploadState.message,
      });
      setIsUploading(false);
    }
  }, [uploadState]);

  // Handle delete success/error
  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Foto removida', {
        description: deleteState.message,
      });
    } else if (deleteState && !deleteState.success && deleteState.message) {
      toast.error('Erro ao remover', {
        description: deleteState.message,
      });
    }
  }, [deleteState]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Arquivo inválido', {
        description: 'Use apenas arquivos JPG, PNG, GIF ou WEBP',
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 5MB',
      });
      return;
    }

    // Create form data and submit
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    startTransition(() => {
      uploadAction(formData);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteClick = () => {
    const formData = new FormData();
    startTransition(() => {
      deleteAction(formData);
    });
  };

  // Get the profile picture URL or fallback
  const getProfilePictureUrl = () => {
    // If user has a profile picture URL, use it
    if (user?.profilePictureUrl) {
      return user.profilePictureUrl;
    }

    // Fallback to ui-avatars.com
    return `https://ui-avatars.com/api/?name=${user?.name}+${user?.surname || ''}&background=7F9463&color=fff`;
  };

  const isPending = isUploading || isUploadPending || isDeletePending;

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isPending}
      />

      {/* Avatar with dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="group relative cursor-pointer">
            <Avatar
              className={`${sizeClasses[size]} transition-all duration-200 ${isPending ? 'opacity-50' : 'group-hover:opacity-80'}`}
            >
              <AvatarImage
                src={getProfilePictureUrl()}
                alt={`${user?.name}'s profile picture`}
                className="object-cover"
              />
              <AvatarFallback>{user ? getUserInitials(user) : <CircleUser />}</AvatarFallback>
            </Avatar>

            {/* Camera overlay */}
            <div
              className={`bg-opacity-40 absolute inset-0 flex items-center justify-center rounded-full bg-black opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${isPending ? 'opacity-100' : ''}`}
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem onClick={handleUploadClick} disabled={isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {user?.profilePictureUrl ? 'Alterar foto' : 'Fazer upload da foto'}
          </DropdownMenuItem>

          {user?.profilePictureUrl && (
            <DropdownMenuItem
              onClick={handleDeleteClick}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover foto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading indicator for small sizes */}
      {isPending && size === 'sm' && (
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <div className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent bg-white" />
        </div>
      )}
    </div>
  );
}
