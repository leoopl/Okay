'use client';

import { useEffect, useRef, useState, startTransition } from 'react';
import { useActionState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  CircleUser,
  Trash2,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  ImageIcon,
  Crop,
} from 'lucide-react';
import { toast } from 'sonner';
import { getUserInitials, cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/actions/server-profile';
import { useRouter } from 'next/navigation';

interface ProfilePictureUploadProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatusIndicator?: boolean;
  allowDelete?: boolean;
}

const sizeClasses = {
  sm: 'size-12',
  md: 'size-16',
  lg: 'size-20',
  xl: 'size-24',
};

const borderSizes = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-3',
  xl: 'border-4',
};

// File validation function
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Formato de arquivo não suportado. Use apenas JPG, PNG, GIF ou WEBP.',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Arquivo muito grande. O tamanho máximo permitido é 5MB.',
    };
  }

  return { isValid: true };
};

// Upload progress component
const UploadProgress = ({ progress, status }: { progress: number; status: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50">
    <div className="space-y-2 text-center">
      <Progress value={progress} className="w-16" />
      <span className="text-xs font-medium text-white">{status}</span>
    </div>
  </div>
);

// Status indicator component
const StatusIndicator = ({ status }: { status: 'success' | 'error' | 'uploading' }) => {
  const configs = {
    success: { icon: CheckCircle, color: 'text-green-500 bg-green-100', size: 'size-3' },
    error: { icon: AlertCircle, color: 'text-red-500 bg-red-100', size: 'size-3' },
    uploading: { icon: Loader2, color: 'text-blue-500 bg-blue-100', size: 'size-3 animate-spin' },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div
      className={`absolute -top-1 -right-1 rounded-full p-1 ${config.color} border-background border-2`}
    >
      <Icon className={config.size} />
    </div>
  );
};

export function ProfilePictureUpload({
  className = '',
  size = 'xl',
  showStatusIndicator = true,
  allowDelete = true,
}: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | 'uploading' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadState, uploadAction, isUploadPending] = useActionState(
    uploadProfilePicture,
    undefined,
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteProfilePicture,
    undefined,
  );

  // Update local image URL when user changes
  useEffect(() => {
    setCurrentImageUrl(user?.profilePictureUrl || null);
    setError(null);
  }, [user?.profilePictureUrl]);

  // Handle upload success/error
  useEffect(() => {
    if (uploadState?.success) {
      toast.success('Foto atualizada', {
        description: uploadState.message,
      });
      setIsUploading(false);
      setUploadStatus('success');
      setError(null);

      // Update local state with new URL
      if (uploadState.profilePictureUrl) {
        setCurrentImageUrl(uploadState.profilePictureUrl);
      }

      // Force a router refresh to update the server session
      router.refresh();

      // Clear success status after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000);
    } else if (uploadState && !uploadState.success && uploadState.message) {
      toast.error('Erro no upload', {
        description: uploadState.message,
      });
      setIsUploading(false);
      setUploadStatus('error');
      setError(uploadState.message);
    }
  }, [uploadState, router]);

  // Handle delete success/error
  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Foto removida', {
        description: deleteState.message,
      });
      setCurrentImageUrl(null);
      setError(null);
      setUploadStatus(null);
      router.refresh();
    } else if (deleteState && !deleteState.success && deleteState.message) {
      toast.error('Erro ao remover', {
        description: deleteState.message,
      });
      setError(deleteState.message);
    }
  }, [deleteState, router]);

  // Simulate upload progress
  useEffect(() => {
    if (isUploading) {
      setUploadStatus('uploading');
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isUploading]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.error('Arquivo inválido', {
        description: validation.error,
      });
      setError(validation.error || 'Arquivo inválido');
      return;
    }

    // Create form data and submit
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

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
    setError(null);
    startTransition(() => {
      deleteAction(formData);
    });
  };

  // Get the profile picture URL with fallback
  const getProfilePictureUrl = () => {
    // Use local state first, then user data, then fallback
    const imageUrl = currentImageUrl || user?.profilePictureUrl;

    if (imageUrl) {
      // Add timestamp to prevent caching issues
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}t=${Date.now()}`;
    }

    // Fallback to ui-avatars.com
    return `https://ui-avatars.com/api/?name=${user?.name}+${user?.surname || ''}&background=7F9463&color=fff&size=128`;
  };

  const isPending = isUploading || isUploadPending || isDeletePending;
  const hasProfilePicture = currentImageUrl || user?.profilePictureUrl;

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isPending}
        aria-label="Selecionar arquivo de imagem para foto de perfil"
      />

      {/* Avatar with dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-auto rounded-full p-0 hover:bg-transparent"
            disabled={isPending}
            aria-label="Alterar foto de perfil"
          >
            <div className="group relative">
              <Avatar
                className={cn(
                  sizeClasses[size],
                  'transition-all duration-200',
                  isPending ? 'opacity-50' : 'group-hover:opacity-80',
                  'ring-background shadow-lg ring-2',
                )}
              >
                <AvatarImage
                  src={getProfilePictureUrl()}
                  alt={`Foto de perfil de ${user?.name}`}
                  className="object-cover"
                  onError={(e) => {
                    // If image fails to load, try without timestamp
                    const target = e.target as HTMLImageElement;
                    const originalSrc = currentImageUrl || user?.profilePictureUrl;
                    if (originalSrc && target.src.includes('?t=')) {
                      target.src = originalSrc;
                    }
                  }}
                />
                <AvatarFallback className="bg-muted">
                  {user ? (
                    getUserInitials(user)
                  ) : (
                    <CircleUser className="text-muted-foreground size-6" />
                  )}
                </AvatarFallback>
              </Avatar>

              {/* Camera overlay */}
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200',
                  'group-hover:opacity-100',
                  isPending && 'opacity-100',
                )}
              >
                {isUploading ? (
                  <UploadProgress
                    progress={uploadProgress}
                    status={uploadProgress < 90 ? 'Enviando...' : 'Processando...'}
                  />
                ) : isPending ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  <Camera className="size-5 text-white" />
                )}
              </div>

              {/* Status indicator */}
              {showStatusIndicator && uploadStatus && !isPending && (
                <StatusIndicator status={uploadStatus} />
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem onClick={handleUploadClick} disabled={isPending}>
            <Upload className="mr-2 size-4" />
            {hasProfilePicture ? 'Alterar foto' : 'Fazer upload da foto'}
          </DropdownMenuItem>

          {hasProfilePicture && allowDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteClick}
                disabled={isPending}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Remover foto
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload guidelines */}
      {size === 'xl' && (
        <div className="mt-3 text-center">
          <p className="text-muted-foreground text-xs">JPG, PNG ou GIF até 5MB</p>
          <p className="text-muted-foreground text-xs">Recomendado: 400x400px</p>
        </div>
      )}
    </div>
  );
}
