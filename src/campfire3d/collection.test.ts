import { describe, expect, it } from 'vitest';
import { CONSTELLATION_SIZES, HEARTH_STAGES, TOTAL_STARS, addGem, bestRarity, collectionFromFires, creatureReached, dayKey, emptyCollection, gemCount, hearthStage, litPerConstellation, recordFeed, rollGem, statsOf, unlockCreatures } from './collection';
import { CREATURE_IDS } from './creatures';

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
});

describe('creatures', () => {
  it('starts with the fox and unlocks the rest by goals', () => {
    const c = emptyCollection();
    expect(c.creatures).toEqual(['fox']);
    const s = statsOf(feed(c, noon), [{ level: 1 }]);
    const { collection, newly } = unlockCreatures(feed(c, noon), s);
    expect(newly).toEqual(['salamander']);
    expect(collection.creatures).toEqual(['fox', 'salamander']);
    expect(unlockCreatures(collection, s).newly).toEqual([]);
  });
  it('unlocks by level, fire count, and gem colours', () => {
    let c = emptyCollection();
    for (const color of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) c = addGem(c, { color, rarity: 'common' });
    const s = statsOf(c, [{ level: 12 }, { level: 1 }, { level: 1 }, { level: 1 }]);
    expect(creatureReached('phoenix', s)).toBe(true);
    expect(creatureReached('dragon', s)).toBe(false);
    expect(creatureReached('wolf', s)).toBe(true);
    expect(creatureReached('stag', s)).toBe(true);
  });
  it('has a goal for every creature', () => {
    for (const id of CREATURE_IDS) expect(creatureReached(id, statsOf(emptyCollection(), []))).toBe(id === 'fox');
  });
});

describe('sky and hearth', () => {
  it('fills constellations in order', () => {
    expect(litPerConstellation(0).every((n) => n === 0)).toBe(true);
    expect(litPerConstellation(7)).toEqual([5, 2, 0, 0, 0, 0, 0, 0]);
    expect(litPerConstellation(9999)).toEqual(CONSTELLATION_SIZES);
    expect(TOTAL_STARS).toBe(71);
  });
  it('grows the hearth with lifetime XP', () => {
    expect(hearthStage(0).stage).toBe(1);
    expect(hearthStage(HEARTH_STAGES[1]).stage).toBe(2);
    expect(hearthStage(HEARTH_STAGES[1] - 1).stage).toBe(1);
    const last = hearthStage(1e9);
    expect([last.stage, last.fraction, last.toNext]).toEqual([8, 1, 0]);
  });
  it('turns old fires into a starting collection', () => {
    const c = collectionFromFires([{ xp: 300, level: 4 }, { xp: 100, level: 2 }], 12);
    expect([c.lifetimeXp, c.levelUps, c.feeds]).toEqual([400, 4, 12]);
  });
});
