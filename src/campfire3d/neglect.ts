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
