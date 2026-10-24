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
  const elapsed = coolingTimeBetween(state.levelSince, now, state.place, hours);
  const drops = Math.floor(elapsed / cooling);
  const level = clampLevel(state.level - drops);
  const remainingMinutes = level > 0 ? cooling - (elapsed % cooling) : 0;
  return {
    level,
    remainingMinutes,
    progress: level > 0 ? remainingMinutes / cooling : 0,
    paused: state.place === 'main' && !isWithinActiveHours(now, hours),
    frozen: false,
  };
}

export interface Stored {
  level: Level;
  levelSince: number;
}

/** A spark lifts the current level by one (max Hot) and refills the ring. */
export function spark(state: HeatState, now: number, hours: ActiveHours): Stored {
  const { level } = computeHeat(state, now, hours);
  return { level: clampLevel(level + 1), levelSince: now };
}

/** A big session takes the fire straight to Hot. */
export function bigSession(now: number): Stored {
  return { level: HOT, levelSince: now };
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
