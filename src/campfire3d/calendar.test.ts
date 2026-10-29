import { describe, expect, it } from 'vitest';
import { byDay, currentRun, dayKeyOf, monthGrid, shiftMonth } from './calendar';

describe('month grid', () => {
  it('has 6 weeks of 7 days starting on Monday', () => {
    const g = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(g).toHaveLength(6);
    g.forEach((w) => expect(w).toHaveLength(7));
    expect(g[0][0].key).toBe('2026-09-28');
    expect(g[0][3]).toEqual({ key: '2026-10-01', day: 1, inMonth: true });
    expect(g[0][0].inMonth).toBe(false);
  });
  it('contains every day of the month exactly once', () => {
    const days = monthGrid(2026, 1).flat().filter((c) => c.inMonth).map((c) => c.day);
    expect(days).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });
  it('handles a month that starts on Monday', () => {
    expect(monthGrid(2026, 5)[0][0]).toEqual({ key: '2026-06-01', day: 1, inMonth: true });
  });
});

describe('days', () => {
  it('groups by local day', () => {
    const a = new Date(2026, 0, 5, 8).getTime(), b = new Date(2026, 0, 5, 23).getTime(), c = new Date(2026, 0, 6, 1).getTime();
    const m = byDay([{ at: a }, { at: b }, { at: c }]);
    expect(m.get('2026-01-05')).toHaveLength(2);
    expect(m.get('2026-01-06')).toHaveLength(1);
  });
  it('moves between months across years', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('counts the current run, forgiving today until it is done', () => {
    const today = new Date(2026, 5, 10, 12).getTime();
    const set = new Set(['2026-06-09', '2026-06-08', '2026-06-07', '2026-06-04']);
    expect(currentRun(set, today)).toBe(3);
    set.add('2026-06-10');
    expect(currentRun(set, today)).toBe(4);
    expect(currentRun(new Set(), today)).toBe(0);
    expect(dayKeyOf(today)).toBe('2026-06-10');
  });
});
