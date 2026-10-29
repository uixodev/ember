/** Helpers for the month calendar of sparks. Days are keyed as YYYY-MM-DD in local time. */

export const dayKeyOf = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export interface Cell { key: string; day: number; inMonth: boolean }

/** The weeks of a month (always 6 rows of 7), starting on Monday. `month` is 0 to 11. */
export function monthGrid(year: number, month: number): Cell[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const weeks: Cell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      row.push({ key: dayKeyOf(date.getTime()), day: date.getDate(), inMonth: date.getMonth() === month });
    }
    weeks.push(row);
  }
  return weeks;
}

/** Group things with a timestamp by the day they happened. */
export function byDay<T extends { at: number }>(items: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of items) {
    const k = dayKeyOf(it.at);
    const list = out.get(k);
    if (list) list.push(it); else out.set(k, [it]);
  }
  return out;
}

/** The month before or after, as a year and month. */
export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const d = new Date(year, month + by, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Consecutive days up to `today` (or up to yesterday, if today has nothing yet) that have at least one thing. */
export function currentRun(days: Set<string>, today: number): number {
  let run = 0;
  const d = new Date(today);
  if (!days.has(dayKeyOf(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKeyOf(d.getTime()))) { run++; d.setDate(d.getDate() - 1); }
  return run;
}
