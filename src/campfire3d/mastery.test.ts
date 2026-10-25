import { describe, expect, it } from 'vitest';
import { TIERS, levelOfXp, progressInLevel, tierOfLevel, xpToReach } from './mastery';

describe('levels', () => {
  it('starts at level 1 with no experience', () => {
    expect(levelOfXp(0)).toBe(1);
    expect(levelOfXp(-5)).toBe(1);
    expect(levelOfXp(NaN)).toBe(1);
  });

  it('moves up exactly at the thresholds', () => {
    for (let level = 2; level <= 80; level++) {
      expect(levelOfXp(xpToReach(level) - 1)).toBe(level - 1);
      expect(levelOfXp(xpToReach(level))).toBe(level);
    }
  });

  it('never ends', () => {
    expect(levelOfXp(1e9)).toBeGreaterThan(5000);
    expect(levelOfXp(xpToReach(10_000))).toBe(10_000);
  });

  it('reports progress inside a level', () => {
    const p = progressInLevel(xpToReach(5) + 20);
    expect(p.level).toBe(5);
    expect(p.into).toBe(20);
    expect(p.span).toBe(xpToReach(6) - xpToReach(5));
    expect(p.toNext).toBe(p.span - 20);
    expect(p.fraction).toBeCloseTo(20 / p.span);
  });

  it('pairs 7 designs with levels', () => {
    expect(TIERS).toHaveLength(7);
    expect(tierOfLevel(1).tier).toBe(1);
    expect(tierOfLevel(4).tier).toBe(1);
    expect(tierOfLevel(5).tier).toBe(2);
    expect(tierOfLevel(14).tier).toBe(3);
    expect(tierOfLevel(15).tier).toBe(4);
    expect(tierOfLevel(39).tier).toBe(5);
    expect(tierOfLevel(40).tier).toBe(6);
    expect(tierOfLevel(60).tier).toBe(7);
    expect(tierOfLevel(9999).tier).toBe(7);
  });
});
