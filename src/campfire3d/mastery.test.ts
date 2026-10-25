import { describe, expect, it } from 'vitest';
import { TIERS, tierOfLevel } from './mastery';

describe('mastery designs', () => {
  it('has 7 designs that start at rising levels', () => {
    expect(TIERS).toHaveLength(7);
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
    expect(tierOfLevel(9999).tier).toBe(7);
  });
});
