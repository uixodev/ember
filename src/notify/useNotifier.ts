import { useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { permission, registerBackgroundCheck, saveDue } from './notify';
import { planDue } from './plan';

/** Ask the service worker to show whatever is due. It stays quiet while Ember is on screen. */
async function nudge(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'ember-check' });
  } catch {
    /* no service worker (for example in development) */
  }
}

/**
 * Keeps the reminder plan up to date for the service worker, sets a timer for the next reminder while
 * the app is alive, and checks whenever you leave the app. Mounted once, at the top.
 */
export function useNotifier(): void {
  const { data, now } = useStore();
  const { enabled, leadMinutes } = data.settings.notify;
  const hours = data.settings.activeHours;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!enabled || permission() !== 'granted') {
      void saveDue([]);
      return;
    }
    const t = Date.now();
    const items = planDue(data.areas, t, hours, leadMinutes);
    void saveDue(items);
    const next = items.find((i) => i.at > t);
    if (next) timer.current = window.setTimeout(() => void nudge(), Math.min(next.at - t + 500, 2_000_000_000));
    return () => window.clearTimeout(timer.current);
  }, [data.areas, hours, enabled, leadMinutes, now]);

  useEffect(() => {
    if (!enabled) return;
    void registerBackgroundCheck();
    const onHide = () => { if (document.visibilityState === 'hidden') void nudge(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [enabled]);
}
