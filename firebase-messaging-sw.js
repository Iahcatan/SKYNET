// SKYNET 2.0 FCM + iPhone Web Push Service Worker — V110
// Firebase Messaging must be initialized in the service worker for background/closed-page handling.

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const FIREBASE_CONFIG_URL = 'https://bosstimer-ry18.onrender.com/api/firebase-config.json';
const DEFAULT_URL = 'https://iahcatan.github.io/SKYNET/';

function handleBackgroundPayload(payload) {
  const notification = (payload && payload.notification) || {};
  const data = (payload && payload.data) || {};
  const title = notification.title || data.title || 'SKYNET 2.0';
  const body = notification.body || data.body || 'มีการแจ้งเตือนจาก Boss Timer';
  const url = data.url || DEFAULT_URL;
  return self.registration.showNotification(title, {
    body,
    tag: notification.tag || data.tag || `skynet-${data.stage || 'notification'}-${data.eventKey || 'boss'}`,
    renotify: notification.renotify !== false,
    requireInteraction: !!notification.requireInteraction,
    data: { url }
  });
}

function isStandardSkyNetWebPushPayload(payload) {
  return !!(payload && payload.data && payload.data.skynetWebPush === '1');
}

const firebaseMessagingReady = fetch(FIREBASE_CONFIG_URL, { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error(`Firebase config HTTP ${response.status}`);
    return response.json();
  })
  .then((config) => {
    if (!config || !config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
      throw new Error('Firebase Web config is incomplete');
    }
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      // V113: Firebase automatically displays notification payloads in background.
      // Do not call showNotification again or Android/Chrome can receive duplicates.
      if (isStandardSkyNetWebPushPayload(payload)) return;
      if (payload && payload.notification) return;
      return handleBackgroundPayload(payload);
    });
    return true;
  })
  .catch((error) => {
    console.error('[SKYNET SW] Firebase Messaging initialization failed:', error);
    return false;
  });

// Fallback for a raw push event if it arrives before the Firebase Messaging handler is ready.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  event.waitUntil((async () => {
    try {
      const payload = event.data.json();
      if (isStandardSkyNetWebPushPayload(payload)) {
        await handleBackgroundPayload(payload);
        return;
      }
      const ready = await firebaseMessagingReady;
      if (ready) return;
      if (payload && payload.notification) return;
      if (payload && payload.data) await handleBackgroundPayload(payload);
    } catch (error) {
      console.warn('[SKYNET SW] Push event handling skipped:', error);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || DEFAULT_URL;
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client && client.url !== targetUrl) await client.navigate(targetUrl);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
