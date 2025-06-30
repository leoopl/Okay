/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }

  const self: ServiceWorkerGlobalScope;
}

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: {
    url?: string;
    action?: string;
    medicationId?: string;
    appointmentId?: string;
    [key: string]: any;
  };
}

export interface SyncData {
  type: 'journal' | 'questionnaire' | 'medication';
  payload: any;
  timestamp: number;
  retryCount: number;
}

export interface CacheNames {
  precache: string;
  runtime: string;
  offline: string;
  api: string;
  images: string;
}

export {};
