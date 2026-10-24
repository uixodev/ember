/**
 * Heat engine: pure functions, no timers, no storage.
 * Stored state is only { level, levelSince }; the current heat is computed on read.
 * All times are epoch milliseconds. Active hours use the device's local time.
 */

export type Level = 0 | 1 | 2 | 3;
export type Place = 'main' | 'side' | 'archive';

export const HOT: Level = 3;
export const WARM: Level = 2;
export const EMBERS: Level = 1;
export const COLD: Level = 0;

const MIN = 60_000;

/** Minutes since local midnight. `start === end` means the whole day is active. */
export interface ActiveHours {
  start: number;
  end: number;
}

export const DEFAULT_ACTIVE_HOURS: ActiveHours = { start: 8 * 60, end: 23 * 60 };
export const DEFAULT_MAIN_COOLING = 150;
export const SIDE_COOLING = { daily: 1440, threeDays: 4320, weekly: 10080 } as const;

/** The part of an area the engine needs. */
export interface HeatState {
  place: Place;
  coolingMinutes: number;
  level: Level;
  levelSince: number;
  /**
   * How long the fire holds its level before the first drop. Later drops follow every
   * `coolingMinutes`. Unset means one normal cooling period.
   */
  holdMinutes?: number;
}

export interface Heat {
  level: Level;
  /** Minutes until the next drop; 0 when cold or frozen. */
  remainingMinutes: number;
  /** 1 = full rim, 0 = empty. Drives the ring. */
  progress: number;
  /** Main fire outside active hours, or an archived fire: the clock is stopped. */
  paused: boolean;
  /** Archived: level is frozen and never cools. */
  frozen: boolean;
}

export function clampLevel(n: number): Level {
  return Math.max(0, Math.min(3, Math.round(n))) as Level;
}

function atLocal(day: Date, minutes: number, dayOffset = 0): number {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() + dayOffset,
    0,
    minutes,
  ).getTime();
}

/** Active windows that start on the local day of `day` (an end past midnight spills into the next day). */
function windowsStartingOn(day: Date, hours: ActiveHours): [number, number][] {
  if (hours.start === hours.end) return [[atLocal(day, 0), atLocal(day, 0, 1)]];
  const start = atLocal(day, hours.start);
  const end = hours.end > hours.start ? atLocal(day, hours.end) : atLocal(day, hours.end, 1);
  return [[start, end]];
}

/** Minutes of [from, to] that fall inside the daily active window. Handles windows crossing midnight and multi-day gaps. */
export function activeMinutesBetween(from: number, to: number, hours: ActiveHours): number {
  if (to <= from) return 0;
  let total = 0;
  const first = new Date(from);
  // Start one day early: a window that began yesterday evening may run past midnight into `from`.
  const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() - 1);
  while (day.getTime() <= to) {
    for (const [ws, we] of windowsStartingOn(day, hours)) {
      const overlap = Math.min(we, to) - Math.max(ws, from);
      if (overlap > 0) total += overlap;
    }
    day.setDate(day.getDate() + 1);
  }
  return total / MIN;
}

export function isWithinActiveHours(at: number, hours: ActiveHours): boolean {
  if (hours.start === hours.end) return true;
  const d = new Date(at);
  const m = d.getHours() * 60 + d.getMinutes();
  return hours.start < hours.end ? m >= hours.start && m < hours.end : m >= hours.start || m < hours.end;
}

/** Cooling time between two instants: main counts only active minutes, side counts wall-clock minutes. */
export function coolingTimeBetween(
  from: number,
  to: number,
  place: Place,
  hours: ActiveHours,
): number {
  if (to <= from) return 0;
  return place === 'main' ? activeMinutesBetween(from, to, hours) : (to - from) / MIN;
}

export function computeHeat(state: HeatState, now: number, hours: ActiveHours): Heat {
  if (state.place === 'archive') {
    return { level: state.level, remainingMinutes: 0, progress: 0, paused: true, frozen: true };
  }
  const cooling = Math.max(1, state.coolingMinutes);
  const hold = state.holdMinutes && state.holdMinutes > 0 ? state.holdMinutes : cooling;
  const elapsed = coolingTimeBetween(state.levelSince, now, state.place, hours);

  let drops: number;
  let remaining: number;
  let span: number;
  if (elapsed < hold) {
    drops = 0;
    remaining = hold - elapsed;
    span = hold;
  } else {
    const after = elapsed - hold;
    drops = 1 + Math.floor(after / cooling);
    remaining = cooling - (after % cooling);
    span = cooling;
  }

  const level = clampLevel(state.level - drops);
  return {
    level,
    remainingMinutes: level > 0 ? remaining : 0,
    progress: level > 0 ? remaining / span : 0,
    paused: state.place === 'main' && !isWithinActiveHours(now, hours),
    frozen: false,
  };
}

/**
 * The moment when `minutes` of cooling time have passed since `from`.
 * Side fires: plain wall-clock. Main fire: only minutes inside the active hours count,
 * so the answer skips the night.
 */
export function advanceCoolingTime(from: number, minutes: number, place: Place, hours: ActiveHours): number {
  if (minutes <= 0) return from;
  if (place !== 'main' || hours.start === hours.end) return from + minutes * MIN;
  let left = minutes;
  let cursor = from;
  const first = new Date(from);
  const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() - 1);
  for (let i = 0; i < 4000; i++) {
    for (const [ws, we] of windowsStartingOn(day, hours)) {
      const start = Math.max(ws, cursor);
      if (we <= start) continue;
      const room = (we - start) / MIN;
      if (left <= room) return start + left * MIN;
      left -= room;
      cursor = we;
    }
    day.setDate(day.getDate() + 1);
  }
  return from + minutes * MIN;
}

export interface Stored {
  level: Level;
  levelSince: number;
  holdMinutes?: number;
}

const withHold = (level: Level, levelSince: number, holdMinutes?: number): Stored =>
  holdMinutes && holdMinutes > 0 ? { level, levelSince, holdMinutes } : { level, levelSince };

/** A spark lifts the current level by one (max Hot), refills the ring and sets how long the fire holds. */
export function spark(state: HeatState, now: number, hours: ActiveHours, holdMinutes?: number): Stored {
  const { level } = computeHeat(state, now, hours);
  return withHold(clampLevel(level + 1), now, holdMinutes);
}

/** A big session takes the fire straight to Hot. */
export function bigSession(now: number, holdMinutes?: number): Stored {
  return withHold(HOT, now, holdMinutes);
}

/** Set the heat by hand: the chosen level with a full ring, not counted as feeding. */
export function setLevel(level: Level, now: number): Stored {
  return { level, levelSince: now };
}

/** Freeze the computed level when archiving. */
export function archive(state: HeatState, now: number, hours: ActiveHours): Stored {
  const { level } = computeHeat(state, now, hours);
  return { level, levelSince: now };
}

/** Moving back out of the archive keeps the level and restarts the clock. */
export function unarchive(state: Pick<HeatState, 'level'>, now: number): Stored {
  return { level: state.level, levelSince: now };
}

/**
 * Changing between main and side switches the clock (active hours vs wall-clock).
 * Keep the level reached so far and restart the clock so no heat is lost or gained by the switch.
 */
export function rebase(state: HeatState, now: number, hours: ActiveHours): Stored {
  return archive(state, now, hours);
}
