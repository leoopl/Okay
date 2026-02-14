'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined') return 'default';
    if ('Notification' in window) return Notification.permission;
    return 'default';
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Notificações não são suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeUser();
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão para notificações foi negada');
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return false;
    }
  };

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''),
      });

      setSubscription(subscription);

      // Send subscription to backend
      await saveSubscriptionToBackend(subscription);

      toast.success('Notificações ativadas com sucesso!');
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      toast.error('Erro ao ativar notificações');
    }
  };

  const unsubscribeUser = async () => {
    try {
      if (!subscription) return;

      await subscription.unsubscribe();
      await removeSubscriptionFromBackend(subscription);

      setSubscription(null);
      toast.success('Notificações desativadas');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
    }
  };

  const saveSubscriptionToBackend = async (subscription: PushSubscription) => {
    const subscriptionJson = subscription.toJSON() as PushSubscriptionJSON;

    const response = await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionJson,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }
  };

  const removeSubscriptionFromBackend = async (subscription: PushSubscription) => {
    const subscriptionJson = subscription.toJSON() as PushSubscriptionJSON;

    await fetch('/api/push-subscriptions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
      }),
    });
  };

  return {
    permission,
    subscription,
    isSupported,
    requestPermission,
    unsubscribeUser,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
