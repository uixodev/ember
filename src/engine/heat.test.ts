import { describe, expect, it } from 'vitest';
import {
  activeMinutesBetween,
  archive,
  bigSession,
  computeHeat,
  coolingTimeBetween,
  isWithinActiveHours,
  rebase,
  spark,
  unarchive,
  type ActiveHours,
  type HeatState,
} from './heat';

const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m).getTime(); // Oct 2026, local
const day: ActiveHours = { start: 8 * 60, end: 23 * 60 };
const night: ActiveHours = { start: 10 * 60, end: 60 }; // 10:00-01:00
const allDay: ActiveHours = { start: 0, end: 0 };

const main = (level: HeatState['level'], since: number, cooling = 150): HeatState => ({
  place: 'main', coolingMinutes: cooling, level, levelSince: since,
});
const side = (level: HeatState['level'], since: number, cooling = 1440): HeatState => ({
  place: 'side', coolingMinutes: cooling, level, levelSince: since,
});

describe('isWithinActiveHours', () => {
  it('same-day window', () => {
    expect(isWithinActiveHours(at(1, 8, 0), day)).toBe(true);
    expect(isWithinActiveHours(at(1, 22, 59), day)).toBe(true);
    expect(isWithinActiveHours(at(1, 23, 0), day)).toBe(false);
    expect(isWithinActiveHours(at(1, 7, 59), day)).toBe(false);
  });
  it('window crossing midnight', () => {
    expect(isWithinActiveHours(at(1, 10, 0), night)).toBe(true);
    expect(isWithinActiveHours(at(1, 23, 30), night)).toBe(true);
    expect(isWithinActiveHours(at(2, 0, 30), night)).toBe(true);
    expect(isWithinActiveHours(at(2, 1, 0), night)).toBe(false);
    expect(isWithinActiveHours(at(2, 9, 59), night)).toBe(false);
  });
  it('start === end means always active', () => {
    expect(isWithinActiveHours(at(1, 3, 0), allDay)).toBe(true);
  });
});

describe('activeMinutesBetween', () => {
  it('counts inside a single window', () => {
    expect(activeMinutesBetween(at(1, 9), at(1, 11), day)).toBe(120);
  });
  it('ignores time outside the window', () => {
    expect(activeMinutesBetween(at(1, 23, 30), at(2, 7, 30), day)).toBe(0);
    expect(activeMinutesBetween(at(1, 3), at(1, 6), day)).toBe(0);
  });
  it('skips the night between two days', () => {
    // 22:00 -> 09:00 next day: 60 min tonight + 60 min tomorrow
    expect(activeMinutesBetween(at(1, 22), at(2, 9), day)).toBe(120);
  });
  it('spans several days', () => {
    // 09:00-23:00 (840) + two full days (2*900) + 08:00-09:00 (60)
    expect(activeMinutesBetween(at(1, 9), at(4, 9), day)).toBe(840 + 1800 + 60);
  });
  it('gap of a week', () => {
    expect(activeMinutesBetween(at(1, 8), at(8, 8), day)).toBe(7 * 900);
  });
  it('window crossing midnight: counts the part after midnight', () => {
    expect(activeMinutesBetween(at(1, 23), at(2, 0, 45), night)).toBe(105);
    // 00:30 belongs to the window that began the previous evening
    expect(activeMinutesBetween(at(2, 0, 30), at(2, 2), night)).toBe(30);
  });
  it('window crossing midnight: full day cycle is 15h', () => {
    expect(activeMinutesBetween(at(1, 10), at(2, 10), night)).toBe(15 * 60);
  });
  it('window crossing midnight over several days', () => {
    expect(activeMinutesBetween(at(1, 10), at(6, 10), night)).toBe(5 * 15 * 60);
  });
  it('always-active equals wall clock', () => {
    expect(activeMinutesBetween(at(1, 3), at(3, 5), allDay)).toBe(50 * 60);
  });
  it('zero or negative ranges', () => {
    expect(activeMinutesBetween(at(1, 10), at(1, 10), day)).toBe(0);
    expect(activeMinutesBetween(at(2, 10), at(1, 10), day)).toBe(0);
  });
});

describe('coolingTimeBetween', () => {
  it('side uses wall clock, main uses active hours', () => {
    expect(coolingTimeBetween(at(1, 22), at(2, 9), 'side', day)).toBe(11 * 60);
    expect(coolingTimeBetween(at(1, 22), at(2, 9), 'main', day)).toBe(120);
  });
});

describe('computeHeat: main', () => {
  it('fresh Hot fire has a full ring', () => {
    const h = computeHeat(main(3, at(1, 9)), at(1, 9), day);
    expect(h).toMatchObject({ level: 3, remainingMinutes: 150, progress: 1, paused: false });
  });
  it('counts down inside a level', () => {
    const h = computeHeat(main(3, at(1, 9)), at(1, 10, 20), day); // 80 min elapsed
    expect(h.level).toBe(3);
    expect(h.remainingMinutes).toBe(70);
    expect(h.progress).toBeCloseTo(70 / 150);
  });
  it('drops exactly at the boundary', () => {
    expect(computeHeat(main(3, at(1, 9)), at(1, 11, 29), day).level).toBe(3);
    const h = computeHeat(main(3, at(1, 9)), at(1, 11, 30), day);
    expect(h.level).toBe(2);
    expect(h.progress).toBe(1);
  });
  it('drops several levels and stops at cold', () => {
    const h = computeHeat(main(3, at(1, 8)), at(1, 23), day); // 900 min = 6 drops
    expect(h).toMatchObject({ level: 0, remainingMinutes: 0, progress: 0 });
  });
  it('does not cool overnight', () => {
    const h = computeHeat(main(3, at(1, 22)), at(2, 8, 30), day); // 60 + 30 active
    expect(h.level).toBe(3);
    expect(h.remainingMinutes).toBe(60);
  });
  it('is paused outside active hours, running inside', () => {
    expect(computeHeat(main(3, at(1, 22)), at(2, 3), day).paused).toBe(true);
    expect(computeHeat(main(3, at(1, 9)), at(1, 10), day).paused).toBe(false);
  });
  it('is paused only outside a midnight-crossing window', () => {
    expect(computeHeat(main(3, at(1, 11)), at(2, 0, 30), night).paused).toBe(false);
    expect(computeHeat(main(3, at(1, 11)), at(2, 5), night).paused).toBe(true);
  });
  it('cools correctly with a midnight-crossing window', () => {
    // 23:00-01:00 is 120 active min, 01:00-10:00 is off, 10:00-11:00 adds 60: 180 total, one drop
    const h = computeHeat(main(3, at(1, 23)), at(2, 11), night);
    expect(h.level).toBe(2);
    expect(h.remainingMinutes).toBe(120);
  });
  it('gap of several days drops to cold', () => {
    const h = computeHeat(main(3, at(1, 9)), at(5, 9), day);
    expect(h.level).toBe(0);
  });
  it('a custom cooling time is respected', () => {
    const h = computeHeat(main(2, at(1, 9), 60), at(1, 10, 15), day);
    expect(h.level).toBe(1);
    expect(h.remainingMinutes).toBe(45);
  });
  it('a clock set earlier than levelSince does not cool', () => {
    expect(computeHeat(main(2, at(1, 12)), at(1, 9), day).level).toBe(2);
  });
});

describe('computeHeat: side', () => {
  it('counts wall-clock time, overnight included', () => {
    const h = computeHeat(side(3, at(1, 20)), at(2, 20), day); // exactly 1 day
    expect(h.level).toBe(2);
    expect(h.paused).toBe(false);
  });
  it('is never paused by active hours', () => {
    expect(computeHeat(side(3, at(1, 20)), at(2, 3), day).paused).toBe(false);
  });
  it('weekly cooling over a gap of several days', () => {
    const h = computeHeat(side(3, at(1, 9), 10080), at(4, 9), day);
    expect(h.level).toBe(3);
    expect(h.remainingMinutes).toBe(10080 - 3 * 1440);
  });
  it('every three days, left for ten days', () => {
    const h = computeHeat(side(3, at(1, 9), 4320), at(11, 9), day);
    expect(h.level).toBe(0); // 3 drops in 9 days
  });
});

describe('computeHeat: archive', () => {
  it('is frozen and never cools', () => {
    const s: HeatState = { place: 'archive', coolingMinutes: 1440, level: 2, levelSince: at(1, 9) };
    expect(computeHeat(s, at(30, 9), day)).toMatchObject({ level: 2, frozen: true, paused: true });
  });
});

describe('actions', () => {
  it('spark adds one level and refills the ring', () => {
    const s = main(1, at(1, 9));
    expect(spark(s, at(1, 10), day)).toEqual({ level: 2, levelSince: at(1, 10) });
  });
  it('spark uses the cooled level, not the stored one', () => {
    const s = main(3, at(1, 8)); // cooled to 2 after 150 min
    expect(spark(s, at(1, 10, 30), day).level).toBe(3);
    const colder = main(3, at(1, 8)); // 6 drops -> cold -> embers
    expect(spark(colder, at(1, 23), day).level).toBe(1);
  });
  it('spark caps at Hot', () => {
    expect(spark(main(3, at(1, 9)), at(1, 9, 5), day).level).toBe(3);
  });
  it('spark from cold gives embers', () => {
    expect(spark(side(0, at(1, 9)), at(5, 9), day).level).toBe(1);
  });
  it('big session goes straight to Hot', () => {
    expect(bigSession(at(1, 20))).toEqual({ level: 3, levelSince: at(1, 20) });
  });
  it('archive freezes the computed level', () => {
    const s = main(3, at(1, 9));
    expect(archive(s, at(1, 14), day)).toEqual({ level: 1, levelSince: at(1, 14) }); // 300 min = 2 drops
  });
  it('unarchive keeps level and resets the clock', () => {
    expect(unarchive({ level: 2 }, at(9, 9))).toEqual({ level: 2, levelSince: at(9, 9) });
  });
  it('rebase keeps the level reached so far', () => {
    const s = side(3, at(1, 9), 1440);
    expect(rebase(s, at(2, 9, 1), day)).toEqual({ level: 2, levelSince: at(2, 9, 1) });
  });
});
