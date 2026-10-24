import type { AreaEvent } from './types';

const DAY = 86_400_000;

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(at: number): Date {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local days (as keys) on which the area got at least one spark or big session. */
export function keptDays(events: AreaEvent[], areaId: string): Set<string> {
  const s = new Set<string>();
  for (const e of events) if (e.areaId === areaId) s.add(dayKey(e.at));
  return s;
}

function prevDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
}

/**
 * Consecutive kept days ending today. If today is not kept yet, the streak is
 * still alive and counts back from yesterday.
 */
export function currentStreak(days: Set<string>, now: number): number {
  let d = startOfDay(now);
  if (!days.has(dayKey(d.getTime()))) d = prevDay(d);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d = prevDay(d);
  }
  return n;
}

export function longestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of sorted) {
    const [y, m, d] = k.split('-').map(Number);
    const t = Date.UTC(y, m - 1, d);
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export type DayStatus = 'kept' | 'big' | 'missed' | 'today' | 'upcoming';

export interface WeekDay {
  label: string;
  status: DayStatus;
}

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday to Sunday of the week containing `now`. */
export function weekRow(events: AreaEvent[], areaId: string, now: number): WeekDay[] {
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const big = new Set<string>();
  const kept = keptDays(events, areaId);
  for (const e of events) if (e.areaId === areaId && e.type === 'big') big.add(dayKey(e.at));
  return LABELS.map((label, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset + i);
    const key = dayKey(d.getTime());
    const rel = d.getTime() - today.getTime();
    let status: DayStatus;
    if (big.has(key)) status = 'big';
    else if (kept.has(key)) status = 'kept';
    else if (rel === 0) status = 'today';
    else if (rel > 0) status = 'upcoming';
    else status = 'missed';
    return { label, status };
  });
}

export function sparksToday(events: AreaEvent[], now: number): number {
  const key = dayKey(now);
  return events.filter((e) => dayKey(e.at) === key).length;
}

export interface DayGroup {
  key: string;
  at: number;
  sparks: number;
  big: number;
}

/** Newest first, one row per day. */
export function dayGroups(events: AreaEvent[], areaId: string): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of events) {
    if (e.areaId !== areaId) continue;
    const key = dayKey(e.at);
    const g = map.get(key) ?? { key, at: e.at, sparks: 0, big: 0 };
    if (e.type === 'spark') g.sparks++;
    else g.big++;
    g.at = Math.max(g.at, e.at);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}
