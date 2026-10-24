import { describe, expect, it } from 'vitest';
import { advanceCoolingTime, computeHeat, spark, type ActiveHours, type HeatState } from './heat';
import { holdMinutesFor, holdMultiplier, planFeed } from './hold';

const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m).getTime();
const day: ActiveHours = { start: 8 * 60, end: 23 * 60 };
const night: ActiveHours = { start: 10 * 60, end: 60 };
const main = (level: HeatState['level'], since: number, hold?: number): HeatState => ({
  place: 'main', coolingMinutes: 150, level, levelSince: since, holdMinutes: hold,
});

describe('hold after feeding', () => {
  it('a one minute spark holds about an hour on the main fire', () => {
    const m = holdMinutesFor(1, 3, 150);
    expect(m).toBeGreaterThan(55);
    expect(m).toBeLessThan(75);
  });
  it('an hour of hard work holds far longer than a minute', () => {
    expect(holdMinutesFor(60, 4, 150)).toBeGreaterThan(holdMinutesFor(1, 4, 150) * 3);
    expect(holdMinutesFor(60, 5, 150)).toBeGreaterThan(holdMinutesFor(60, 3, 150));
    expect(holdMinutesFor(60, 5, 150)).toBeGreaterThan(holdMinutesFor(60, 1, 150));
  });
  it('grows with minutes and effort and never passes three periods', () => {
    expect(holdMultiplier(10, 3)).toBeGreaterThan(holdMultiplier(5, 3));
    expect(holdMultiplier(10, 5)).toBeGreaterThan(holdMultiplier(10, 2));
    expect(holdMultiplier(100000, 5)).toBeLessThanOrEqual(3);
    expect(holdMultiplier(0, 1)).toBeCloseTo(0.4);
  });
  it('scales with the area: a daily side fire holds in days', () => {
    expect(holdMinutesFor(60, 5, 1440)).toBeGreaterThan(1440 * 2);
  });
});

describe('computeHeat with a hold', () => {
  it('holds the level for the hold time, then drops, then follows the normal cooling', () => {
    const s = main(3, at(1, 9), 60);
    expect(computeHeat(s, at(1, 9, 59), day)).toMatchObject({ level: 3, remainingMinutes: 1 });
    expect(computeHeat(s, at(1, 10, 0), day)).toMatchObject({ level: 2, remainingMinutes: 150, progress: 1 });
    expect(computeHeat(s, at(1, 12, 29), day).level).toBe(2);
    expect(computeHeat(s, at(1, 12, 30), day).level).toBe(1);
  });
  it('the ring drains over the hold time, not the normal cooling time', () => {
    const h = computeHeat(main(3, at(1, 9), 60), at(1, 9, 15), day);
    expect(h.remainingMinutes).toBe(45);
    expect(h.progress).toBeCloseTo(45 / 60);
  });
  it('a long hold keeps the fire up beyond one normal period', () => {
    const h = computeHeat(main(3, at(1, 9), 400), at(1, 14), day); // 300 elapsed, 100 left
    expect(h).toMatchObject({ level: 3, remainingMinutes: 100 });
  });
  it('without a hold, behaves as before', () => {
    expect(computeHeat(main(3, at(1, 9)), at(1, 11, 30), day).level).toBe(2);
  });
  it('the hold only counts active hours for the main fire', () => {
    const s = main(3, at(1, 22), 120); // 60 min tonight, 60 tomorrow
    expect(computeHeat(s, at(2, 8, 30), day)).toMatchObject({ level: 3, remainingMinutes: 30 });
    expect(computeHeat(s, at(2, 9), day)).toMatchObject({ level: 2 });
  });
  it('a hold on a side fire uses wall-clock time', () => {
    const s: HeatState = { place: 'side', coolingMinutes: 1440, level: 2, levelSince: at(1, 9), holdMinutes: 4320 };
    expect(computeHeat(s, at(3, 9), day).level).toBe(2);
    expect(computeHeat(s, at(4, 9), day).level).toBe(1);
  });
  it('spark stores the hold, and the next spark starts from the cooled level', () => {
    const next = spark(main(1, at(1, 9)), at(1, 10), day, 90);
    expect(next).toEqual({ level: 2, levelSince: at(1, 10), holdMinutes: 90 });
    expect(spark(main(3, at(1, 9), 400), at(1, 10), day).level).toBe(3);
  });
});

describe('advanceCoolingTime', () => {
  it('side fires add plain minutes', () => {
    expect(advanceCoolingTime(at(1, 9), 90, 'side', day)).toBe(at(1, 10, 30));
  });
  it('main fire inside the day', () => {
    expect(advanceCoolingTime(at(1, 9), 90, 'main', day)).toBe(at(1, 10, 30));
  });
  it('main fire skips the night', () => {
    expect(advanceCoolingTime(at(1, 22), 120, 'main', day)).toBe(at(2, 9));
  });
  it('main fire starting outside the active hours waits for the morning', () => {
    expect(advanceCoolingTime(at(2, 3), 30, 'main', day)).toBe(at(2, 8, 30));
  });
  it('works with a window that crosses midnight', () => {
    // 10:00-01:00. From 23:30 there are 90 active minutes left tonight, so 60 minutes end at 00:30.
    expect(advanceCoolingTime(at(1, 23, 30), 60, 'main', night)).toBe(at(2, 0, 30));
    // 120 minutes: 90 tonight, then the window closes at 01:00 and reopens at 10:00 for 30 more.
    expect(advanceCoolingTime(at(1, 23, 30), 120, 'main', night)).toBe(at(2, 10, 30));
  });
  it('is the inverse of the cooling clock', () => {
    const t = advanceCoolingTime(at(1, 20), 400, 'main', day);
    expect(computeHeat(main(3, at(1, 20), 400), t - 60000, day).level).toBe(3);
    expect(computeHeat(main(3, at(1, 20), 400), t, day).level).toBe(2);
  });
  it('always-active hours and zero minutes', () => {
    expect(advanceCoolingTime(at(1, 3), 60, 'main', { start: 0, end: 0 })).toBe(at(1, 4));
    expect(advanceCoolingTime(at(1, 3), 0, 'main', day)).toBe(at(1, 3));
  });
});

describe('planFeed', () => {
  const area = { place: 'main' as const, coolingMinutes: 150 };
  it('uses the automatic hold when no next time is chosen', () => {
    const p = planFeed(area, { minutes: 1, effort: 3 }, at(1, 9), day);
    expect(p.custom).toBe(false);
    expect(p.nextAt).toBe(advanceCoolingTime(at(1, 9), p.holdMinutes, 'main', day));
  });
  it('turns a chosen next time into a hold in cooling minutes', () => {
    const p = planFeed(area, { minutes: 1, effort: 1, nextAt: at(2, 9) }, at(1, 21), day);
    expect(p.custom).toBe(true);
    expect(p.nextAt).toBe(at(2, 9));
    expect(p.holdMinutes).toBe(120 + 60); // 21-23 tonight, 08-09 tomorrow
  });
  it('ignores a next time in the past', () => {
    expect(planFeed(area, { minutes: 5, effort: 3, nextAt: at(1, 8) }, at(1, 9), day).custom).toBe(false);
  });
  it('a side fire turns days into minutes', () => {
    const p = planFeed({ place: 'side', coolingMinutes: 1440 }, { minutes: 5, effort: 3, nextAt: at(4, 9) }, at(1, 9), day);
    expect(p.holdMinutes).toBe(3 * 1440);
  });
});
