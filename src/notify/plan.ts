import { advanceCoolingTime, computeHeat, isWithinActiveHours, type ActiveHours } from '../engine/heat';
import { LEVEL_NAMES } from '../engine/format';
import type { Area } from '../model/types';

/** One reminder: when to show it and what it says. */
export interface DueItem {
  /** Stable for the same moment, so a reminder is never shown twice. */
  id: string;
  at: number;
  title: string;
  body: string;
  /** The page to open when it is tapped, e.g. "/area/abc". */
  path: string;
}

const MIN = 60_000;

/** The next time inside the active hours at or after `at`. */
export function nextActiveMoment(at: number, hours: ActiveHours): number {
  if (isWithinActiveHours(at, hours)) return at;
  const d = new Date(at);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, hours.start).getTime();
  return today >= at ? today : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, hours.start).getTime();
}

const minuteOf = (t: number) => Math.floor(t / MIN);

/**
 * Which reminders are coming up, for every area that is not archived:
 *  - a heads-up shortly before a fire drops down to Embers or Cold, never at night;
 *  - a nudge at the next time you chose yourself.
 * Never guilt: the wording is always about a small spark.
 */
export function planDue(areas: Area[], now: number, hours: ActiveHours, leadMinutes: number): DueItem[] {
  const out: DueItem[] = [];
  for (const a of areas) {
    if (a.place === 'archive') continue;
    const suggestion = a.sparks[0] ?? 'A few minutes keeps it warm.';

    const heat = computeHeat(a, now, hours);
    // The next drop lands on Embers or Cold when the fire is Warm or Embers now.
    if (heat.level === 2 || heat.level === 1) {
      const dropMinutes = heat.remainingMinutes;
      const dropAt = advanceCoolingTime(now, dropMinutes, a.place, hours);
      const to = (heat.level - 1) as 0 | 1;
      let at = nextActiveMoment(dropAt - leadMinutes * MIN, hours);
      if (at < now) at = now;
      out.push({
        id: `${a.id}:drop:${minuteOf(dropAt)}`,
        at,
        title: leadMinutes > 0 ? `${a.name} is about to cool` : `${a.name} is cooling`,
        body: `It drops to ${LEVEL_NAMES[to]} ${leadMinutes > 0 ? `in about ${leadMinutes} min` : 'now'}. ${suggestion}`,
        path: `/area/${a.id}`,
      });
    }

    if (a.nextAt && a.nextAt > now) {
      out.push({
        id: `${a.id}:next:${minuteOf(a.nextAt)}`,
        at: a.nextAt,
        title: `Time to feed ${a.name}`,
        body: suggestion,
        path: `/area/${a.id}`,
      });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}
