import { SIDE_COOLING, type Place } from '../engine/heat';
import { formatLong } from '../engine/format';

const MAIN_STEP = 30;
const MAIN_MIN = 30;
const MAIN_MAX = 8 * 60;
const DAY = 1440;
const SIDE_MAX_DAYS = 30;

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** Big number on the stepper: "2.5 h" for the main fire, "3 days" for side fires. */
export function coolingValue(place: Place, minutes: number): string {
  if (place === 'main') return minutes < 60 ? `${minutes} min` : `${trim(minutes / 60)} h`;
  return minutes % DAY === 0 ? `${minutes / DAY} ${minutes === DAY ? 'day' : 'days'}` : formatLong(minutes);
}

export function coolingCaption(place: Place): string {
  return place === 'main' ? 'during active hours' : 'counted in whole days, night included';
}

export function stepCooling(place: Place, minutes: number, dir: 1 | -1): number {
  if (place === 'main') {
    const next = Math.round((minutes + dir * MAIN_STEP) / MAIN_STEP) * MAIN_STEP;
    return Math.max(MAIN_MIN, Math.min(MAIN_MAX, next));
  }
  const days = Math.round(minutes / DAY) + dir;
  return Math.max(1, Math.min(SIDE_MAX_DAYS, days)) * DAY;
}

/** Fire cools faster as the number shrinks, so "+" means more time and "-" less. */
export function canStep(place: Place, minutes: number, dir: 1 | -1): boolean {
  return stepCooling(place, minutes, dir) !== minutes;
}

export const SIDE_PRESETS = [
  { label: 'Daily', minutes: SIDE_COOLING.daily },
  { label: '3 days', minutes: SIDE_COOLING.threeDays },
  { label: 'Weekly', minutes: SIDE_COOLING.weekly },
];
