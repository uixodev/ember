import { describe, expect, it } from 'vitest';
import { canStep, coolingValue, customToMinutes, stepCooling, unitsFor } from './cooling';

describe('cooling stepper', () => {
  it('formats main and side values', () => {
    expect(coolingValue('main', 150)).toBe('2.5 h');
    expect(coolingValue('main', 120)).toBe('2 h');
    expect(coolingValue('main', 30)).toBe('30 min');
    expect(coolingValue('side', 360)).toBe('6 h');
    expect(coolingValue('side', 1440)).toBe('1 day');
    expect(coolingValue('side', 4320)).toBe('3 days');
    expect(coolingValue('side', 1440 + 240)).toBe('1 day 4 h');
  });
  it('steps main in 30 minutes within bounds', () => {
    expect(stepCooling('main', 150, 1)).toBe(180);
    expect(stepCooling('main', 150, -1)).toBe(120);
    expect(canStep('main', 15, -1)).toBe(false);
    expect(canStep('main', 720, 1)).toBe(false);
  });
  it('steps side fires along the ladder, including sub-day speeds', () => {
    expect(stepCooling('side', 1440, 1)).toBe(2880);
    expect(stepCooling('side', 1440, -1)).toBe(720);
    expect(stepCooling('side', 720, -1)).toBe(360);
    expect(canStep('side', 360, -1)).toBe(false);
    expect(canStep('side', 86400, 1)).toBe(false);
  });
  it('steps from a custom value to the next rung', () => {
    expect(stepCooling('side', 3000, 1)).toBe(4320);
    expect(stepCooling('side', 3000, -1)).toBe(2880);
    expect(stepCooling('side', 100, -1)).toBe(100);
  });
  it('turns typed values into minutes within limits', () => {
    const [h, d] = unitsFor('side');
    expect(customToMinutes('side', 36, h)).toBe(2160);
    expect(customToMinutes('side', 2.5, d)).toBe(3600);
    expect(customToMinutes('side', 0.5, h)).toBeNull();
    expect(customToMinutes('side', 91, d)).toBeNull();
    expect(customToMinutes('side', NaN, d)).toBeNull();
    const [min, hr] = unitsFor('main');
    expect(customToMinutes('main', 45, min)).toBe(45);
    expect(customToMinutes('main', 13, hr)).toBeNull();
    expect(customToMinutes('main', 10, min)).toBeNull();
  });
});
