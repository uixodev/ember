/* Extra service worker code for reminders. Loaded by the generated service worker (importScripts).
   Plain JavaScript on purpose: the service worker is not bundled with the app. */

const DB = 'ember-notify';
const STORE = 'kv';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function get(db, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function put(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Show every reminder that is due, was not shown yet, and is not stale (a reminder from last night is no use).
async function checkReminders(force) {
  if (self.Notification && self.Notification.permission !== 'granted') return;
  // If Ember is on screen, you are already looking at it: say nothing and keep the reminder for later.
  if (!force) {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (open.some((c) => c.visibilityState === 'visible')) return;
  }
  const db = await openDb();
  const due = (await get(db, 'due')) || [];
  const shown = (await get(db, 'shown')) || {};
  const now = Date.now();
  const scope = self.registration.scope;
  for (const item of due) {
    if (item.at > now || now - item.at > 6 * 3600 * 1000 || shown[item.id]) continue;
    await self.registration.showNotification(item.title, {
      body: item.body,
      tag: item.id,
      icon: scope + 'icons/icon-192.png',
      badge: scope + 'favicon.png',
      data: { url: scope + '#' + item.path },
    });
    shown[item.id] = now;
  }
  for (const k of Object.keys(shown)) if (now - shown[k] > 2 * 86400 * 1000) delete shown[k];
  await put(db, 'shown', shown);
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ember-check') event.waitUntil(checkReminders());
});

// The app can also ask for a check (and tests use this).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ember-check') event.waitUntil(checkReminders(event.data.force === true));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
