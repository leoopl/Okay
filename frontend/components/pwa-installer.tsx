'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }

  interface Window {
    gtag?: (
      command: string,
      action: string,
      parameters: {
        event_category?: string;
        event_label?: string;
        [key: string]: any;
      },
    ) => void;
  }
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as PWA
    if (window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show install banner after a delay
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 30000); // Show after 30 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      toast.success('Okay foi instalado com sucesso!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowInstallBanner(false);
        // Analytics tracking
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'pwa_install', {
            event_category: 'engagement',
            event_label: 'accepted',
          });
        }
      } else {
        // User dismissed, hide for this session
        setShowInstallBanner(false);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast.error('Erro ao instalar o aplicativo');
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');

    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'dismissed',
      });
    }
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showInstallBanner || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="animate-in slide-in-from-bottom-5 fixed right-4 bottom-4 left-4 z-50 duration-300 sm:right-6 sm:left-auto sm:w-96">
      <div className="bg-card rounded-lg p-4 shadow-lg ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <Download className="text-primary h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-semibold">Instale o Okay</h3>
            <p className="text-muted-foreground text-xs">
              Adicione o Okay à sua tela inicial para acesso rápido e funcionamento offline.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="h-8">
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8">
                Agora não
              </Button>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleDismiss}>
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
