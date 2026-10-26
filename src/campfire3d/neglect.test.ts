import { describe, expect, it } from 'vitest';
import { DAY, HOUR, coldForMs, neglectStage, ruinProgress } from './neglect';

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
