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

/** "45 min", "2 h 05", "1 day 4 h": any span of minutes, for "holds for ...". */
export function formatSpan(minutes: number): string {
  return minutes >= 1440 ? formatLong(minutes) : formatShort(minutes);
}

const clock = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** "today 19:05", "tomorrow 08:00", "Mon 18:00", "Oct 30, 18:00". */
export function formatWhen(at: number, now: number): string {
  const d = new Date(at);
  const startOf = (t: number) => { const x = new Date(t); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
  const days = Math.round((startOf(at) - startOf(now)) / 86_400_000);
  if (days === 0) return `today ${clock(d)}`;
  if (days === 1) return `tomorrow ${clock(d)}`;
  if (days > 1 && days < 7) return `${d.toLocaleDateString('en', { weekday: 'short' })} ${clock(d)}`;
  return `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}, ${clock(d)}`;
}
