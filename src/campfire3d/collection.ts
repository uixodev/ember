import type { StickKind } from './sticks';

/**
 * What you collect, shared by all your fires: gems. Wood sometimes drops a gem in the colour of the fire it was fed
 * to, and you pick it up from the ground. Nothing is spent: it only grows. All creatures are open from the start.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: { id: Rarity; name: string; weight: number; tone: string }[] = [
  { id: 'common', name: 'Common', weight: 60, tone: '#9FB0D0' },
  { id: 'uncommon', name: 'Uncommon', weight: 25, tone: '#6FE36F' },
  { id: 'rare', name: 'Rare', weight: 10, tone: '#4F8EF7' },
  { id: 'epic', name: 'Epic', weight: 4, tone: '#FFB030' },
  { id: 'legendary', name: 'Legendary', weight: 1, tone: '#FFFFFF' },
];

export interface Collection {
  /** Every XP ever earned, kept even when a fire is deleted. */
  lifetimeXp: number;
  feeds: number;
  /** Levels gained in total, across all fires. Each one lights a star. */
  levelUps: number;
  daysFed: number;
  streak: number;
  bestStreak: number;
  /** The last day you fed anything, as YYYY-MM-DD. */
  lastDay: string;
  wood: Partial<Record<StickKind, number>>;
  /** How many of each gem: key is `${colour}:${rarity}`. */
  gems: Record<string, number>;
}

export const emptyCollection = (): Collection => ({ lifetimeXp: 0, feeds: 0, levelUps: 0, daysFed: 0, streak: 0, bestStreak: 0, lastDay: '', wood: {}, gems: {} });

// ---- gems ---------------------------------------------------------------------------------------

/** Chance that a piece of wood drops a gem. */
const DROP_CHANCE: Record<StickKind, number> = { kindling: 0.08, branch: 0.2, split: 0.4, log: 0.7, big: 1 };
/** Bigger wood also pushes the roll toward the rare end. */
const RARITY_BOOST: Record<StickKind, number> = { kindling: 0, branch: 0.5, split: 1, log: 1.8, big: 3 };

export interface GemDrop { color: string; rarity: Rarity }

/** `heatLevel` is the fire's heat when fed: a Warm fire drops more, a Hot one even more. `rng` gives 0 up to 1. */
export function rollGem(kind: StickKind, heatLevel: 0 | 1 | 2 | 3, color: string, rng: () => number = Math.random): GemDrop | null {
  const chance = Math.min(1, DROP_CHANCE[kind] * (heatLevel === 3 ? 2 : heatLevel === 2 ? 1.5 : 1));
  if (rng() >= chance) return null;
  const weights = RARITIES.map((r, i) => r.weight * (1 + RARITY_BOOST[kind] * i * 0.6));
  let pick = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i];
    if (pick < 0) return { color, rarity: RARITIES[i].id };
  }
  return { color, rarity: 'common' };
}

export const gemKey = (d: GemDrop): string => `${d.color}:${d.rarity}`;
export const gemCount = (c: Collection, color: string, rarity: Rarity): number => c.gems[`${color}:${rarity}`] ?? 0;
export const gemsOfColor = (c: Collection, color: string): number => RARITIES.reduce((n, r) => n + gemCount(c, color, r.id), 0);
export const bestRarity = (c: Collection, color: string): Rarity | null => [...RARITIES].reverse().find((r) => gemCount(c, color, r.id) > 0)?.id ?? null;
export const distinctGemColors = (c: Collection): number => new Set(Object.keys(c.gems).filter((k) => c.gems[k] > 0).map((k) => k.split(':')[0])).size;

// ---- days and streaks ----------------------------------------------------------------------------

export const dayKey = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const yesterdayOf = (t: number): string => { const d = new Date(t); d.setDate(d.getDate() - 1); return dayKey(d.getTime()); };

/** Count one feeding: wood, XP, levels gained, and the day streak. */
export function recordFeed(c: Collection, feed: { kind: StickKind; xp: number; levelsGained: number; at: number }): Collection {
  const today = dayKey(feed.at);
  const newDay = c.lastDay !== today;
  const streak = !newDay ? c.streak : c.lastDay === yesterdayOf(feed.at) ? c.streak + 1 : 1;
  return {
    ...c,
    lifetimeXp: c.lifetimeXp + feed.xp,
    feeds: c.feeds + 1,
    levelUps: c.levelUps + Math.max(0, feed.levelsGained),
    daysFed: c.daysFed + (newDay ? 1 : 0),
    streak,
    bestStreak: Math.max(c.bestStreak, streak),
    lastDay: today,
    wood: { ...c.wood, [feed.kind]: (c.wood[feed.kind] ?? 0) + 1 },
  };
}

export function addGem(c: Collection, d: GemDrop): Collection {
  const k = gemKey(d);
  return { ...c, gems: { ...c.gems, [k]: (c.gems[k] ?? 0) + 1 } };
}

/** A collection for someone who already has fires from before collecting existed. */
export function collectionFromFires(fires: { xp: number; level: number }[], feeds: number): Collection {
  const c = emptyCollection();
  return { ...c, lifetimeXp: fires.reduce((n, f) => n + f.xp, 0), levelUps: fires.reduce((n, f) => n + Math.max(0, f.level - 1), 0), feeds };
}
