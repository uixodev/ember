import { describe, expect, it } from 'vitest';
import { addGem, bestRarity, collectionFromFires, dayKey, emptyCollection, gemCount, recordFeed, rollGem } from './collection';

const feed = (c: ReturnType<typeof emptyCollection>, at: number, kind: 'kindling' | 'big' = 'kindling') => recordFeed(c, { kind, xp: 5, levelsGained: 0, at });
const D = 86_400_000;
const noon = new Date(2026, 5, 10, 12).getTime();

describe('gems', () => {
  it('never drops when the roll is above the chance', () => {
    expect(rollGem('kindling', 1, 'classic', () => 0.99)).toBeNull();
  });
  it('always drops from a big log, and better wood tends rarer', () => {
    expect(rollGem('big', 1, 'classic', () => 0.5)).not.toBeNull();
    const rare = (kind: 'kindling' | 'big') => { let n = 0; let i = 0; const rng = () => ((i++ * 0.6180339887) % 1); for (let k = 0; k < 4000; k++) { const g = rollGem(kind, 1, 'x', rng); if (g && g.rarity !== 'common') n++; } return n; };
    expect(rare('big')).toBeGreaterThan(rare('kindling'));
  });
  it('a hotter fire drops more often', () => {
    const count = (heat: 1 | 3) => { let n = 0; for (let i = 0; i < 1000; i++) if (rollGem('split', heat, 'x', () => (i * 0.37) % 1)) n++; return n; };
    expect(count(3)).toBeGreaterThan(count(1));
  });
  it('counts gems per colour and rarity', () => {
    let c = emptyCollection();
    c = addGem(addGem(c, { color: 'teal', rarity: 'rare' }), { color: 'teal', rarity: 'rare' });
    c = addGem(c, { color: 'teal', rarity: 'common' });
    expect(gemCount(c, 'teal', 'rare')).toBe(2);
    expect(bestRarity(c, 'teal')).toBe('rare');
    expect(bestRarity(c, 'lava')).toBeNull();
  });
});

describe('days and streaks', () => {
  it('counts a new day once and grows the streak on consecutive days', () => {
    let c = feed(emptyCollection(), noon);
    c = feed(c, noon + 1000);
    expect([c.daysFed, c.streak, c.feeds]).toEqual([1, 1, 2]);
    c = feed(c, noon + D);
    c = feed(c, noon + 2 * D);
    expect([c.daysFed, c.streak, c.bestStreak]).toEqual([3, 3, 3]);
  });
  it('restarts the streak after a missed day but keeps the best', () => {
    let c = feed(feed(feed(emptyCollection(), noon), noon + D), noon + 2 * D);
    c = feed(c, noon + 5 * D);
    expect([c.streak, c.bestStreak]).toEqual([1, 3]);
  });
  it('adds XP, wood and levels', () => {
    const c = recordFeed(emptyCollection(), { kind: 'big', xp: 150, levelsGained: 2, at: noon });
    expect([c.lifetimeXp, c.levelUps, c.wood.big]).toEqual([150, 2, 1]);
  });
  it('formats the day', () => { expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05'); });
  it('turns old fires into a starting collection', () => {
    const c = collectionFromFires([{ xp: 300, level: 4 }, { xp: 100, level: 2 }], 12);
    expect([c.lifetimeXp, c.levelUps, c.feeds]).toEqual([400, 4, 12]);
  });
});
