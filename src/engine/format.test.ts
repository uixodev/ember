import { describe, expect, it } from 'vitest';
import { formatLong, formatShort } from './format';

describe('formatShort', () => {
  it('formats minutes and hours', () => {
    expect(formatShort(40)).toBe('40 min');
    expect(formatShort(100)).toBe('1 h 40');
    expect(formatShort(125)).toBe('2 h 05');
    expect(formatShort(0.2)).toBe('1 min');
    expect(formatShort(-3)).toBe('0 min');
  });
});

describe('formatLong', () => {
  it('formats hours and days', () => {
    expect(formatLong(300)).toBe('5 h');
    expect(formatLong(1440)).toBe('1 day');
    expect(formatLong(1440 + 240)).toBe('1 day 4 h');
    expect(formatLong(4320)).toBe('3 days');
  });
});
