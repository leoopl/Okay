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

// ─── Sync coordination ───────────────────────────────────────────────────────
//
// Design: When a background sync event fires, prefer delegating to an active
// client tab (which uses SyncService with Web Locks for proper coordination).
// Only fall back to direct SW fetch-based sync when zero client tabs are open.
//
// The MessageChannel ack ensures the SW knows a client received the trigger.
// If no ack arrives within 10s (e.g. background tab throttled by OS), we throw
// so the browser retries the background sync event rather than marking it done.

interface SyncEvent extends Event {
  tag: string;
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Attempt to delegate sync to an active client tab via postMessage.
 * Sends TRIGGER_SYNC to all clients; first client acks via MessageChannel.
 * Returns true if delegation succeeded, false if no clients are available.
 * Throws if clients exist but no ack received within 10s (triggers browser retry).
 */
async function delegateToClient(): Promise<boolean> {
  const clients = await self.clients.matchAll({ type: 'window' });

  if (clients.length === 0) {
    return false; // No tabs open — caller must do SW-based fallback
  }

  // Send with ack port to first client
  const { port1, port2 } = new MessageChannel();
  clients[0].postMessage({ type: 'TRIGGER_SYNC' }, [port2]);

  // Broadcast to remaining clients — Web Locks in SyncService will serialize execution
  for (let i = 1; i < clients.length; i++) {
    clients[i].postMessage({ type: 'TRIGGER_SYNC' });
  }

  // Wait for ack from first client
  await new Promise<void>((resolve, reject) => {
    port1.start();
    const timeout = setTimeout(() => {
      port1.close();
      // Throw so browser queues a retry rather than marking sync complete
      reject(new Error('[SW] Client sync ack timeout — client may be throttled by OS'));
    }, 10_000);

    port1.onmessage = () => {
      clearTimeout(timeout);
      port1.close();
      resolve();
    };
  });

  return true;
}

/**
 * Run sync: delegate to client if possible, otherwise fall back to SW fetch.
 */
async function runSync(fallbackFn: () => Promise<void>): Promise<void> {
  const delegated = await delegateToClient();
  if (!delegated) {
    await fallbackFn();
  }
}

self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as SyncEvent;

  switch (syncEvent.tag) {
    case 'sync-journal-entries':
      syncEvent.waitUntil(runSync(syncJournalEntries));
      break;
    case 'sync-questionnaire-responses':
      syncEvent.waitUntil(runSync(syncQuestionnaireResponses));
      break;
    case 'sync-medication-logs':
      syncEvent.waitUntil(runSync(syncMedicationLogs));
      break;
  }
});

// ─── SW fallback sync functions (only run when no client tabs are open) ──────

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (serverResponse.ok) {
          await cache.delete(request);
          const activeClients = await self.clients.matchAll();
          activeClients.forEach((client) => {
            client.postMessage({ type: 'SYNC_SUCCESS', data: { type: 'journal', count: 1 } });
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync journal entry:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Journal sync error:', error);
  }
}

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (serverResponse.ok) {
        await cache.delete(request);
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_SUCCESS', data: { type: 'questionnaire', count: 1 } });
        });
      }
    }
  } catch (error) {
    console.error('[SW] Questionnaire sync error:', error);
  }
}

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (serverResponse.ok) {
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('[SW] Medication sync error:', error);
  }
}

// ─── Periodic sync (progressive enhancement — not available on iOS Safari) ───
// NOTE: PeriodicSync is unavailable on iOS Safari. Medication reminders on iOS
// rely on visibilitychange/focus sync triggered by the NetworkStatusProvider.

interface PeriodicSyncEvent extends Event {
  tag: string;
  waitUntil(promise: Promise<unknown>): void;
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
        data: { url: '/medication', medicationId: reminder.id },
      });
    }
  } catch (error) {
    console.error('[SW] Medication reminder error:', error);
  }
}

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
        data: { url: '/appointments', appointmentId: reminder.id },
      });
    }
  } catch (error) {
    console.error('[SW] Appointment reminder error:', error);
  }
}

// ─── Client messages ──────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ type: 'VERSION', version: '1.0.0' });
  } else if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    });
  }
});

// ─── Activate: cache cleanup + IndexedDB temp_ ID migration ──────────────────

self.addEventListener('activate', (event) => {
  const currentCaches = Object.values(CACHE_NAMES);

  event.waitUntil(
    Promise.all([
      // Clean up stale caches
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (
              !currentCaches.includes(cacheName) &&
              !cacheName.includes('serwist') &&
              !cacheName.includes('next')
            ) {
              return caches.delete(cacheName);
            }
          }),
        ),
      ),
      // Migrate legacy temp_-prefixed IDs to proper UUIDs in IndexedDB.
      // Background Sync tags are browser-managed and don't need migration.
      migrateTemporaryIds(),
    ]).then(() => self.clients.claim()),
  );
});

/**
 * Best-effort migration of records whose id starts with "temp_" to proper UUIDs.
 * This handles the transition from the old Date.now()-based IDs to crypto.randomUUID().
 * Failures are non-fatal — online-only degradation kicks in if the DB is inaccessible.
 */
async function migrateTemporaryIds(): Promise<void> {
  try {
    // Open the DB without specifying a version — if it doesn't exist yet, skip migration
    const db = await new Promise<IDBDatabase | null>((resolve) => {
      const req = indexedDB.open('OkayJournalDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      // If onupgradeneeded fires, DB didn't exist — nothing to migrate
      req.onupgradeneeded = () => {
        // Abort the empty upgrade so onerror fires instead of onsuccess
        req.transaction?.abort();
      };
    });

    if (!db) return;

    const storeNames = ['journals', 'syncQueue', 'inventoryResponses'];
    const existingStores = Array.from(db.objectStoreNames);

    for (const storeName of storeNames) {
      if (!existingStores.includes(storeName)) continue;

      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const getAllReq = store.getAll();

          getAllReq.onsuccess = () => {
            const records: { id?: string; [key: string]: unknown }[] = getAllReq.result || [];
            for (const record of records) {
              if (typeof record?.id === 'string' && record.id.startsWith('temp_')) {
                try {
                  store.delete(record.id);
                  store.put({ ...record, id: crypto.randomUUID() });
                } catch {
                  // Best-effort — don't block activation
                }
              }
            }
          };

          getAllReq.onerror = () => resolve();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    db.close();
  } catch (error) {
    console.error('[SW] Temp ID migration error (non-fatal):', error);
  }
}
