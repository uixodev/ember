import { SIDE_COOLING, type Place } from '../engine/heat';
import { formatLong } from '../engine/format';

const MAIN_STEP = 30;
const MAIN_MIN = 15;
const MAIN_MAX = 12 * 60;
const SIDE_MIN = 60; // one hour
const SIDE_MAX = 90 * 1440;
const DAY = 1440;

/** Steps for side fires: 6 h, 12 h, 1 d, 2 d, 3 d, 4 d, 5 d, 6 d, 1 wk, 10 d, 2 wk, 3 wk, 30 d, 45 d, 60 d. */
const SIDE_LADDER = [360, 720, 1440, 2880, 4320, 5760, 7200, 8640, 10080, 14400, 20160, 30240, 43200, 64800, 86400];

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** Big number on the stepper: "2.5 h" for the main fire, "3 days" or "12 h" for side fires. */
export function coolingValue(place: Place, minutes: number): string {
  if (place === 'main') return minutes < 60 ? `${minutes} min` : `${trim(minutes / 60)} h`;
  if (minutes < DAY) return minutes < 60 ? `${minutes} min` : `${trim(minutes / 60)} h`;
  return minutes % DAY === 0 ? `${minutes / DAY} ${minutes === DAY ? 'day' : 'days'}` : formatLong(minutes);
}

export function coolingCaption(place: Place): string {
  return place === 'main' ? 'during active hours' : 'counted around the clock, night included';
}

export function stepCooling(place: Place, minutes: number, dir: 1 | -1): number {
  if (place === 'main') {
    const next = Math.round((minutes + dir * MAIN_STEP) / MAIN_STEP) * MAIN_STEP;
    return Math.max(MAIN_MIN, Math.min(MAIN_MAX, next));
  }
  if (dir > 0) return SIDE_LADDER.find((m) => m > minutes) ?? minutes;
  return [...SIDE_LADDER].reverse().find((m) => m < minutes) ?? minutes;
}

export function canStep(place: Place, minutes: number, dir: 1 | -1): boolean {
  return stepCooling(place, minutes, dir) !== minutes;
}

export const SIDE_PRESETS = [
  { label: 'Daily', minutes: SIDE_COOLING.daily },
  { label: '3 days', minutes: SIDE_COOLING.threeDays },
  { label: 'Weekly', minutes: SIDE_COOLING.weekly },
  { label: '2 weeks', minutes: 20160 },
];

export interface Unit { value: string; label: string; minutes: number }

/** Units for typing an exact cooling time. */
export function unitsFor(place: Place): Unit[] {
  return place === 'main'
    ? [{ value: 'min', label: 'minutes', minutes: 1 }, { value: 'h', label: 'hours', minutes: 60 }]
    : [{ value: 'h', label: 'hours', minutes: 60 }, { value: 'd', label: 'days', minutes: DAY }];
}

/** Turn a typed amount and unit into minutes, or null when it is out of range. */
export function customToMinutes(place: Place, amount: number, unit: Unit): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const m = Math.round(amount * unit.minutes);
  const [lo, hi] = place === 'main' ? [MAIN_MIN, MAIN_MAX] : [SIDE_MIN, SIDE_MAX];
  return m >= lo && m <= hi ? m : null;
}

export function customHint(place: Place): string {
  return place === 'main' ? 'From 15 minutes to 12 hours.' : 'From 1 hour to 90 days.';
}
