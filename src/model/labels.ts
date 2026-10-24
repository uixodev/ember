import { SIDE_COOLING } from '../engine/heat';
import { formatLong } from '../engine/format';
import { dayKey } from './streaks';
import type { Area, AreaEvent } from './types';

export function coolingLabel(area: Area): string {
  if (area.place === 'archive') return 'Archive';
  if (area.place === 'main') return 'Main';
  if (area.coolingMinutes === SIDE_COOLING.daily) return 'Daily';
  if (area.coolingMinutes === SIDE_COOLING.threeDays) return '3 days';
  if (area.coolingMinutes === SIDE_COOLING.weekly) return 'Weekly';
  return formatLong(area.coolingMinutes);
}

export function lastEventAt(events: AreaEvent[], areaId: string): number | undefined {
  let last: number | undefined;
  for (const e of events) if (e.areaId === areaId && (last === undefined || e.at > last)) last = e.at;
  return last;
}

const startOfDay = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

/** "fed today", "yesterday", "5 days ago", or "not fed yet". */
export function fedText(events: AreaEvent[], areaId: string, now: number): string {
  const last = lastEventAt(events, areaId);
  if (last === undefined) return 'not fed yet';
  const days = Math.round((startOfDay(now) - startOfDay(last)) / 86_400_000);
  if (days <= 0) return 'fed today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function fedToday(events: AreaEvent[], areaId: string, now: number): boolean {
  const key = dayKey(now);
  return events.some((e) => e.areaId === areaId && dayKey(e.at) === key);
}

export function shortDate(at: number): string {
  return new Date(at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
