import { describe, expect, it } from 'vitest';
import { canStep, coolingValue, stepCooling } from './cooling';

describe('cooling stepper', () => {
  it('formats main and side values', () => {
    expect(coolingValue('main', 150)).toBe('2.5 h');
    expect(coolingValue('main', 120)).toBe('2 h');
    expect(coolingValue('main', 30)).toBe('30 min');
    expect(coolingValue('side', 1440)).toBe('1 day');
    expect(coolingValue('side', 4320)).toBe('3 days');
    expect(coolingValue('side', 1440 + 240)).toBe('1 day 4 h');
  });
  it('steps main in 30 minutes within bounds', () => {
    expect(stepCooling('main', 150, 1)).toBe(180);
    expect(stepCooling('main', 150, -1)).toBe(120);
    expect(canStep('main', 30, -1)).toBe(false);
    expect(canStep('main', 480, 1)).toBe(false);
  });
  it('steps side in whole days within bounds', () => {
    expect(stepCooling('side', 4320, 1)).toBe(5760);
    expect(stepCooling('side', 1440, -1)).toBe(1440);
    expect(canStep('side', 1440, -1)).toBe(false);
    expect(canStep('side', 30 * 1440, 1)).toBe(false);
  });
});
