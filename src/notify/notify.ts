import type { DueItem } from './plan';

/**
 * Showing reminders. Browsers only let a web page show a notification while it is running (or
 * while the browser lets its background script wake up), so this works in three ways:
 *  - the open app sets a timer for the next reminder;
 *  - the plan is copied to IndexedDB, where the service worker can read it when Android wakes it
 *    for a periodic check (only for installed apps, and only when Chrome decides);
 *  - "Add to calendar" gives a real phone alarm.
 */

const DB = 'ember-notify';
const STORE = 'kv';

export const notificationsSupported = (): boolean => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
export const permission = (): NotificationPermission | 'unsupported' => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result as T | undefined);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return undefined;
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* no IndexedDB: the in-app timer still works */
  }
}

export const saveDue = (items: DueItem[]) => kvSet('due', items);
export const getShown = async () => (await kvGet<Record<string, number>>('shown')) ?? {};
export async function markShown(id: string): Promise<void> {
  const shown = await getShown();
  const cutoff = Date.now() - 2 * 86_400_000;
  for (const k of Object.keys(shown)) if (shown[k] < cutoff) delete shown[k];
  shown[id] = Date.now();
  await kvSet('shown', shown);
}

/** Show one reminder through the service worker, so tapping it opens Ember at the right page. */
export async function showNotification(item: Pick<DueItem, 'id' | 'title' | 'body' | 'path'>): Promise<boolean> {
  if (permission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const base = reg.scope;
    await reg.showNotification(item.title, {
      body: item.body,
      tag: item.id,
      icon: `${base}icons/icon-192.png`,
      badge: `${base}favicon.png`,
      data: { url: `${base}#${item.path}` },
    });
    return true;
  } catch {
    try {
      new Notification(item.title, { body: item.body, tag: item.id });
      return true;
    } catch {
      return false;
    }
  }
}

/** Ask Chrome on Android to wake the service worker now and then. It may say no, and it often waits many hours. */
export async function registerBackgroundCheck(): Promise<boolean> {
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> };
    };
    if (!reg.periodicSync) return false;
    await reg.periodicSync.register('ember-check', { minInterval: 60 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundCheck(): Promise<void> {
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      periodicSync?: { unregister: (tag: string) => Promise<void> };
    };
    await reg.periodicSync?.unregister('ember-check');
  } catch {
    /* nothing to undo */
  }
}
