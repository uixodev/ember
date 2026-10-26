import { describe, expect, it } from 'vitest';
import { TIERS, WOOD_XP, levelOfXp, progressInLevel, tierOfLevel, xpMultiplier, xpToReach } from './mastery';

describe('experience and levels', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelOfXp(0)).toBe(1);
    expect(levelOfXp(-5)).toBe(1);
    expect(levelOfXp(NaN)).toBe(1);
  });

  it('moves up exactly at the thresholds', () => {
    for (let level = 2; level <= 150; level++) {
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

  it('gives each wood its XP', () => {
    expect(WOOD_XP).toEqual({ kindling: 1, branch: 5, split: 10, log: 20, big: 50 });
  });

  it('doubles XP when the fire is Warm and triples it when Hot', () => {
    expect(xpMultiplier(0)).toBe(1);
    expect(xpMultiplier(1)).toBe(1);
    expect(xpMultiplier(2)).toBe(2);
    expect(xpMultiplier(3)).toBe(3);
  });
});

describe('mastery designs', () => {
  it('has 8 designs that start at rising levels', () => {
    expect(TIERS).toHaveLength(8);
    expect(TIERS[0].from).toBe(1);
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].from).toBeGreaterThan(TIERS[i - 1].from);
  });

  it('picks the design for a level', () => {
    expect(tierOfLevel(1).tier).toBe(1);
    expect(tierOfLevel(4).tier).toBe(1);
    expect(tierOfLevel(5).tier).toBe(2);
    expect(tierOfLevel(14).tier).toBe(3);
    expect(tierOfLevel(15).tier).toBe(4);
    expect(tierOfLevel(39).tier).toBe(5);
    expect(tierOfLevel(40).tier).toBe(6);
    expect(tierOfLevel(60).tier).toBe(7);
    expect(tierOfLevel(99).tier).toBe(7);
    expect(tierOfLevel(100).tier).toBe(8);
    expect(tierOfLevel(9999).tier).toBe(8);
  });
});
