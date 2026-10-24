import type { Level } from './heat';

export const LEVEL_NAMES: Record<Level, string> = { 3: 'Hot', 2: 'Warm', 1: 'Embers', 0: 'Cold' };

/** "40 min", "1 h 40", "2 h 05" for main fires (minutes). */
export function formatShort(minutes: number): string {
  const m = Math.max(0, Math.ceil(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')}`;
}

/** "5 h", "1 day", "2 days 4 h" for side fires, where the scale is days. */
export function formatLong(minutes: number): string {
  const m = Math.max(0, Math.ceil(minutes));
  if (m < 1440) return m < 60 ? `${m} min` : `${Math.ceil(m / 60)} h`;
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const days = `${d} ${d === 1 ? 'day' : 'days'}`;
  return h > 0 ? `${days} ${h} h` : days;
}
