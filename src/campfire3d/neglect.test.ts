import { describe, expect, it } from 'vitest';
import { DAY, HOUR, coldForMs, deadForMs, drainPerHour, msUntilNoXp, neglectStage, ruinProgress, xpAfterCold } from './neglect';

describe('how long a fire has been cold', () => {
  it('is zero while it still has heat', () => {
    expect(coldForMs(50, 100, 0, 0.4 * DAY)).toBe(0);
  });
  it('starts counting when the heat reaches zero', () => {
    // 50% at a 100% a day loss hits zero after half a day
    expect(coldForMs(50, 100, 0, 0.5 * DAY)).toBe(0);
    expect(coldForMs(50, 100, 0, DAY)).toBeCloseTo(0.5 * DAY);
  });
  it('counts from the moment a cold fire was set up or put out', () => {
    expect(coldForMs(0, 100, 1000, 1000 + 3 * HOUR)).toBe(3 * HOUR);
  });
  it('never goes negative when the clock is a little behind', () => {
    expect(coldForMs(0, 100, 5000, 1000)).toBe(0);
  });
});

describe('ruin', () => {
  it('waits for half the time, then grows to 1', () => {
    expect(ruinProgress(0, 48)).toBe(0);
    expect(ruinProgress(24 * HOUR, 48)).toBe(0);
    expect(ruinProgress(36 * HOUR, 48)).toBeCloseTo(0.5);
    expect(ruinProgress(48 * HOUR, 48)).toBe(1);
    expect(ruinProgress(500 * HOUR, 48)).toBe(1);
  });
  it('is off when there is no time given', () => {
    expect(ruinProgress(1e12, 0)).toBe(0);
  });
  it('names the stages', () => {
    expect(neglectStage(0)).toBe('fine');
    expect(neglectStage(0.2)).toBe('watched');
    expect(neglectStage(0.5)).toBe('attacked');
    expect(neglectStage(1)).toBe('ruined');
  });
});

describe('XP draining while cold', () => {
  it('loses nothing at first, then a little, then more and more', () => {
    expect(xpAfterCold(1000, 0)).toBe(1000);
    const lost = (h: number) => 1000 - xpAfterCold(1000, h * HOUR);
    expect(lost(1)).toBeLessThan(5);
    expect(lost(12)).toBeLessThan(lost(24));
    // each next day takes more than the one before in absolute terms until little is left
    const d1 = lost(24), d2 = lost(48) - lost(24);
    expect(d2).toBeGreaterThan(d1);
    expect(lost(24)).toBeGreaterThan(150);
    expect(lost(24)).toBeLessThan(350);
  });
  it('ends at zero, and an empty fire has nothing to lose', () => {
    expect(xpAfterCold(1000, 200 * HOUR)).toBe(0);
    expect(xpAfterCold(0, 5 * HOUR)).toBe(0);
  });
  it('knows when the XP will be gone', () => {
    const ms = msUntilNoXp(1000);
    expect(xpAfterCold(1000, ms - HOUR)).toBeGreaterThan(0);
    expect(xpAfterCold(1000, ms + HOUR)).toBe(0);
    expect(msUntilNoXp(0)).toBe(0);
    expect(msUntilNoXp(5000)).toBeGreaterThan(msUntilNoXp(100));
  });
  it('drains faster the longer it has been cold', () => {
    expect(drainPerHour(1000, 24 * HOUR)).toBeGreaterThan(drainPerHour(1000, 1 * HOUR));
  });
  it('only counts the creature timer once the XP is gone too', () => {
    const gone = msUntilNoXp(1000);
    expect(deadForMs(1000, gone - HOUR)).toBe(0);
    expect(deadForMs(1000, gone + 5 * HOUR)).toBeCloseTo(5 * HOUR, -2);
    expect(deadForMs(0, 3 * HOUR)).toBe(3 * HOUR);
  });
});
