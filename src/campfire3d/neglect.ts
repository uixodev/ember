/**
 * Neglect: a fire that stays cold for a long time is found by a creature of gloom, and in the end the creature
 * wrecks it. The wreck stays where it is, so you can see it, and any piece of wood rebuilds it. Your level, XP and
 * collection are never touched.
 */
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** How long a fire may stay cold before it is wrecked, to pick from (hours). */
export const RUIN_CHOICES = [24, 48, 72, 168];
export const DEFAULT_RUIN_HOURS = 48;

/** How long the fire has been at 0%. `percent` was the heat at `since`, and it loses `rate` percent a day. */
export function coldForMs(percent: number, rate: number, since: number, now: number): number {
  if (percent <= 0) return Math.max(0, now - since);
  const zeroAt = since + (percent / rate) * DAY;
  return Math.max(0, now - zeroAt);
}

/**
 * 0 while all is well. Once the fire has been cold for half of the time it is given, a creature shows up and the
 * number climbs to 1, where the fire is wrecked.
 */
export function ruinProgress(coldMs: number, ruinHours: number): number {
  if (!(ruinHours > 0)) return 0;
  const half = (ruinHours * HOUR) / 2;
  return Math.max(0, Math.min(1, (coldMs - half) / half));
}

/** How the fire is doing, in words you can show. */
export function neglectStage(ruin: number): 'fine' | 'watched' | 'attacked' | 'ruined' {
  return ruin >= 1 ? 'ruined' : ruin >= 0.5 ? 'attacked' : ruin > 0 ? 'watched' : 'fine';
}

// ---- XP that drains while a fire is cold ----------------------------------------------------------

/**
 * Once a fire is at 0% its XP starts to drain. At first only a little, then more and more:
 * xp(h) = xp * exp(-(A * h + B * h^2)) with h the hours spent cold.
 * Roughly a quarter is gone after a day, two thirds after two days and nine tenths after three.
 */
const A = 0.002;
const B = 0.0004;

/** The XP that is left after a fire has been at 0% for `coldMs`. */
export function xpAfterCold(xp: number, coldMs: number): number {
  if (!(xp > 0)) return 0;
  const h = Math.max(0, coldMs) / HOUR;
  const left = xp * Math.exp(-(A * h + B * h * h));
  return left < 0.5 ? 0 : left;
}

/** How long a fire with `xp` has to be cold before it has no XP left. */
export function msUntilNoXp(xp: number): number {
  if (!(xp >= 0.5)) return 0;
  const target = Math.log(xp / 0.5);
  const h = (-A + Math.sqrt(A * A + 4 * B * target)) / (2 * B);
  return h * HOUR;
}

/** XP lost per hour right now, for the little "draining" hint. */
export function drainPerHour(xp: number, coldMs: number): number {
  const h = Math.max(0, coldMs) / HOUR;
  return xpAfterCold(xp, coldMs) * (A + 2 * B * h);
}

/**
 * How long the fire has been dead, in the sense that matters for the creatures: cold AND without XP.
 * It is zero while there is still XP left to lose.
 */
export function deadForMs(xp: number, coldMs: number): number {
  return Math.max(0, coldMs - msUntilNoXp(xp));
}
