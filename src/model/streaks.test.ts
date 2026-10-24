import { describe, expect, it } from 'vitest';
import { currentStreak, dayGroups, keptDays, longestStreak, sparksToday, weekRow } from './streaks';
import type { AreaEvent } from './types';

const at = (d: number, h = 12) => new Date(2026, 9, d, h).getTime(); // Oct 2026; the 5th is a Monday
let n = 0;
const ev = (d: number, type: AreaEvent['type'] = 'spark', areaId = 'a', h = 12): AreaEvent => ({
  id: String(n++), type, areaId, at: at(d, h),
});

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    const days = keptDays([ev(7), ev(8), ev(9), ev(9)], 'a');
    expect(currentStreak(days, at(9, 20))).toBe(3);
  });
  it('stays alive when today is not kept yet', () => {
    const days = keptDays([ev(7), ev(8)], 'a');
    expect(currentStreak(days, at(9, 8))).toBe(2);
  });
  it('breaks after a missed day', () => {
    const days = keptDays([ev(5), ev(6), ev(8)], 'a');
    expect(currentStreak(days, at(9))).toBe(1);
    expect(currentStreak(days, at(10))).toBe(0);
  });
  it('is zero with no events', () => {
    expect(currentStreak(new Set(), at(9))).toBe(0);
  });
  it('only counts the given area', () => {
    const days = keptDays([ev(8, 'spark', 'a'), ev(9, 'spark', 'b')], 'a');
    expect(currentStreak(days, at(9))).toBe(1);
  });
  it('finds the longest streak, also across month ends', () => {
    const days = new Set(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05']);
    expect(longestStreak(days)).toBe(4);
    expect(longestStreak(new Set())).toBe(0);
  });
  it('builds the week row Monday to Sunday', () => {
    const w = weekRow([ev(5), ev(6, 'big'), ev(8)], 'a', at(8)); // Thursday
    expect(w.map((d) => d.status)).toEqual(['kept', 'big', 'missed', 'kept', 'upcoming', 'upcoming', 'upcoming']);
    expect(weekRow([], 'a', at(8))[3].status).toBe('today');
    expect(w[0].label).toBe('Mon');
  });
  it('week row on a Sunday still starts on the Monday before', () => {
    const w = weekRow([ev(5)], 'a', at(11));
    expect(w[0].status).toBe('kept');
    expect(w[6].status).toBe('today');
  });
  it('counts sparks today across areas', () => {
    expect(sparksToday([ev(9), ev(9, 'big', 'b'), ev(8)], at(9, 22))).toBe(2);
  });
  it('groups history by day, newest first', () => {
    const g = dayGroups([ev(8), ev(9), ev(9), ev(9, 'big')], 'a');
    expect(g.map((x) => [x.sparks, x.big])).toEqual([[2, 1], [1, 0]]);
  });
});
