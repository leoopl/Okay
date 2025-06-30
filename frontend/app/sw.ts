/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Initialize Serwist with configuration
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
      },
    ],
  },
});

// Register event listeners
serwist.addEventListeners();

// Cache configuration
const CACHE_NAMES = {
  offline: 'offline-data-v1',
  sync: 'sync-queue-v1',
};

// Handle push notifications
self.addEventListener('push', async (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title = 'Okay', body, icon, badge, tag, ...options } = data;

    const notificationOptions: NotificationOptions = {
      body: body || 'Você tem uma nova notificação',
      icon: icon || '/favicon/android-chrome-192x192.png',
      badge: badge || '/favicon/badge-72x72.png',
      tag: tag || 'okay-notification',
      data: options.data || {},
      requireInteraction: options.requireInteraction || false,
      silent: false,
    };

    event.waitUntil(self.registration.showNotification(title, notificationOptions));
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { data } = event.notification;
  let urlToOpen = data?.url || '/';

  // Handle specific deep links
  if (data?.medicationId) {
    urlToOpen = `/medication/${data.medicationId}`;
  } else if (data?.appointmentId) {
    urlToOpen = `/appointments/${data.appointmentId}`;
  }

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If not, open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Handle background sync
interface SyncEvent extends Event {
  tag: string;
  waitUntil(promise: Promise<any>): void;
}

self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as SyncEvent;

  switch (syncEvent.tag) {
    case 'sync-journal-entries':
      syncEvent.waitUntil(syncJournalEntries());
      break;
    case 'sync-questionnaire-responses':
      syncEvent.waitUntil(syncQuestionnaireResponses());
      break;
    case 'sync-medication-logs':
      syncEvent.waitUntil(syncMedicationLogs());
      break;
  }
});

// Sync journal entries
async function syncJournalEntries(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAMES.sync);
    const requests = await cache.keys();

    const journalRequests = requests.filter((req) => req.url.includes('/api/journal/sync'));

    for (const request of journalRequests) {
      const response = await cache.match(request);
      if (!response) continue;

      const data = await response.json();

      try {
        const serverResponse = await fetch('/api/journal/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (serverResponse.ok) {
          await cache.delete(request);

          // Notify clients of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: { type: 'journal', count: 1 },
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync journal entry:', error);
      }
    }
  } catch (error) {
    console.error('Journal sync error:', error);
  }
}

// Sync questionnaire responses
async function syncQuestionnaireResponses(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAMES.sync);
    const requests = await cache.keys();

    const questionnaireRequests = requests.filter((req) =>
      req.url.includes('/api/inventory-responses/sync'),
    );

    for (const request of questionnaireRequests) {
      const response = await cache.match(request);
      if (!response) continue;

      const data = await response.json();

      const serverResponse = await fetch('/api/inventory-responses/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (serverResponse.ok) {
        await cache.delete(request);

        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            data: { type: 'questionnaire', count: 1 },
          });
        });
      }
    }
  } catch (error) {
    console.error('Questionnaire sync error:', error);
  }
}

// Sync medication logs
async function syncMedicationLogs(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAMES.sync);
    const requests = await cache.keys();

    const medicationRequests = requests.filter((req) =>
      req.url.includes('/api/medications/logs/sync'),
    );

    for (const request of medicationRequests) {
      const response = await cache.match(request);
      if (!response) continue;

      const data = await response.json();

      const serverResponse = await fetch('/api/medications/logs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (serverResponse.ok) {
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('Medication sync error:', error);
  }
}

// Handle periodic sync
interface PeriodicSyncEvent extends Event {
  tag: string;
  waitUntil(promise: Promise<any>): void;
}

self.addEventListener('periodicsync', (event: Event) => {
  const periodicEvent = event as PeriodicSyncEvent;

  switch (periodicEvent.tag) {
    case 'medication-reminder':
      periodicEvent.waitUntil(checkMedicationReminders());
      break;
    case 'appointment-reminder':
      periodicEvent.waitUntil(checkAppointmentReminders());
      break;
  }
});

// Check medication reminders
async function checkMedicationReminders(): Promise<void> {
  try {
    const response = await fetch('/api/medications/check-reminders');
    if (!response.ok) return;

    const reminders = await response.json();

    for (const reminder of reminders) {
      await self.registration.showNotification('Lembrete de Medicação', {
        body: `Hora de tomar ${reminder.medication}`,
        icon: '/favicon/android-chrome-192x192.png',
        badge: '/favicon/badge-72x72.png',
        tag: `medication-${reminder.id}`,
        data: {
          url: '/medication',
          medicationId: reminder.id,
        },
      });
    }
  } catch (error) {
    console.error('Medication reminder error:', error);
  }
}

// Check appointment reminders
async function checkAppointmentReminders(): Promise<void> {
  try {
    const response = await fetch('/api/appointments/check-reminders');
    if (!response.ok) return;

    const reminders = await response.json();

    for (const reminder of reminders) {
      await self.registration.showNotification('Lembrete de Consulta', {
        body: `Consulta com ${reminder.professionalName} em ${reminder.time}`,
        icon: '/favicon/android-chrome-192x192.png',
        badge: '/favicon/badge-72x72.png',
        tag: `appointment-${reminder.id}`,
        data: {
          url: '/appointments',
          appointmentId: reminder.id,
        },
      });
    }
  } catch (error) {
    console.error('Appointment reminder error:', error);
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({
      type: 'VERSION',
      version: '1.0.0',
    });
  } else if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    });
  }
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  const currentCaches = Object.values(CACHE_NAMES);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              !currentCaches.includes(cacheName) &&
              !cacheName.includes('serwist') &&
              !cacheName.includes('next')
            ) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        // Claim all clients
        return self.clients.claim();
      }),
  );
});
