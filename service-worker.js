const CACHE_NAME = 'mech-freunde-v13-web-push-open-fix';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './Parts.js',
  './Mech.js', './Pilot.js', './Renderer.js', './Store.js', './TrainingBattle.js', './TrainingBots.js',
  './OnlineService.js', './online-config.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(name => name.startsWith('mech-freunde-') && name !== CACHE_NAME)
      .map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || /\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => await caches.match(request) || (request.mode === 'navigate' ? await caches.match('./index.html') : null) || Response.error()));
  } else {
    event.respondWith(caches.match(request).then(async cached => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }));
  }
});

// Echte Push-Nachrichten auch bei geschlossenem Tab.
// Ohne Spielernamen, private Raumdaten oder persönliche Angaben auf dem Sperrbildschirm.
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('🤖 Mech-Freunde', {
    body: '🔔 Es gibt Neuigkeiten zu einer Duell-Einladung! Tippe zum Nachsehen.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'mf-duel-invite',
    renotify: true,
    data: { url: new URL('./index.html#online', self.registration.scope).href }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target=event.notification.data?.url || new URL('./index.html#online', self.registration.scope).href;
  event.waitUntil((async () => {
    const windows=await clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) {
        if (typeof client.navigate === 'function') await client.navigate(target);
        await client.focus();
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
