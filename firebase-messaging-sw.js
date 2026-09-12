// SKYNET 2.0 FCM Service Worker
// Firebase Web Messaging uses this file as the same-origin background worker.
// The page requests the FCM token; background notification messages are rendered here.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch (_) { payload = {}; }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'SKYNET 2.0';
  const body = notification.body || data.body || 'มีการแจ้งเตือนจาก Boss Timer';
  const url = data.url || (payload.fcmOptions && payload.fcmOptions.link) || 'https://iahcatan.github.io/SKYNET/';

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: notification.tag || data.tag || 'skynet-boss-notification',
    renotify: notification.renotify !== false,
    requireInteraction: !!notification.requireInteraction,
    data: { url }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    || 'https://iahcatan.github.io/SKYNET/';
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
