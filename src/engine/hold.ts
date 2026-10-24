import { advanceCoolingTime, coolingTimeBetween, type ActiveHours, type Place } from './heat';

/** How hard it felt, 1 (barely) to 5 (all in). */
export type Effort = 1 | 2 | 3 | 4 | 5;

export const EFFORT_LABELS: Record<Effort, string> = { 1: 'Barely', 2: 'Light', 3: 'Steady', 4: 'Hard', 5: 'All in' };
export const EFFORT_FACTOR: Record<Effort, number> = { 1: 0.5, 2: 0.75, 3: 1, 4: 1.5, 5: 2 };

/** Shortest and longest hold, as a share of the area's normal cooling period. */
const FLOOR = 0.4;
const CEILING = 3;
/** Minutes of effort-weighted work for about two thirds of the way to the ceiling. */
const SCALE = 90;

/**
 * How many cooling periods a feeding holds the fire for. A minute of light effort holds a
 * little under half a period; an hour of hard effort holds more than two; it never passes three.
 */
export function holdMultiplier(minutes: number, effort: Effort): number {
  const score = Math.max(0, minutes) * EFFORT_FACTOR[effort];
  return FLOOR + (CEILING - FLOOR) * (1 - Math.exp(-score / SCALE));
}

/** Minutes the fire holds its level after a feeding, in the area's own cooling time. */
export function holdMinutesFor(minutes: number, effort: Effort, coolingMinutes: number): number {
  return Math.max(1, Math.round(coolingMinutes * holdMultiplier(minutes, effort)));
}

export interface FeedInput {
  minutes: number;
  effort: Effort;
  /** A time you chose for the next feeding. Overrides the automatic hold. */
  nextAt?: number;
}

export interface FeedPlan {
  holdMinutes: number;
  /** When the fire starts to drop: your chosen time, or the end of the automatic hold. */
  nextAt: number;
  custom: boolean;
}

export function planFeed(
  area: { place: Place; coolingMinutes: number },
  input: FeedInput,
  now: number,
  hours: ActiveHours,
): FeedPlan {
  if (input.nextAt !== undefined && input.nextAt > now) {
    const hold = Math.max(1, Math.round(coolingTimeBetween(now, input.nextAt, area.place, hours)));
    return { holdMinutes: hold, nextAt: input.nextAt, custom: true };
  }
  const hold = holdMinutesFor(input.minutes, input.effort, area.coolingMinutes);
  return { holdMinutes: hold, nextAt: advanceCoolingTime(now, hold, area.place, hours), custom: false };
}
