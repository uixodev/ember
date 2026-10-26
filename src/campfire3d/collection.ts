import { CREATURE_IDS, type CreatureId } from './creatures';
import type { StickKind } from './sticks';

/**
 * Everything you collect, shared by all your fires. Nothing is spent: it only grows.
 *   Gems       wood sometimes drops a gem in the colour of the fire it was fed to
 *   Creatures  fourteen fire creatures, each unlocked by a goal
 *   Sky        every level-up lights a star in a constellation
 *   Hearth     the Great Hearth grows with all the XP you ever earn
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
  creatures: CreatureId[];
}

export const STARTER_CREATURES: CreatureId[] = ['fox'];
export const emptyCollection = (): Collection => ({ lifetimeXp: 0, feeds: 0, levelUps: 0, daysFed: 0, streak: 0, bestStreak: 0, lastDay: '', wood: {}, gems: {}, creatures: [...STARTER_CREATURES] });

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

// ---- creatures ----------------------------------------------------------------------------------

export interface Stats { feeds: number; daysFed: number; bestStreak: number; wood: Partial<Record<StickKind, number>>; maxLevel: number; fires: number; gemColors: number }

export const statsOf = (c: Collection, fires: { level: number }[]): Stats => ({
  feeds: c.feeds, daysFed: c.daysFed, bestStreak: c.bestStreak, wood: c.wood,
  maxLevel: fires.reduce((m, f) => Math.max(m, f.level), 1), fires: fires.length, gemColors: distinctGemColors(c),
});

/** What it takes to unlock each creature: a sentence, and how far along you are (have, need). */
export const CREATURE_GOALS: Record<CreatureId, { text: string; progress: (s: Stats) => [number, number] }> = {
  fox: { text: 'Starts with you', progress: () => [1, 1] },
  salamander: { text: 'Feed a fire once', progress: (s) => [s.feeds, 1] },
  imp: { text: 'Feed 25 times', progress: (s) => [s.feeds, 25] },
  owl: { text: 'Feed on 7 different days', progress: (s) => [s.daysFed, 7] },
  cat: { text: 'Feed 7 days in a row', progress: (s) => [s.bestStreak, 7] },
  rabbit: { text: 'Feed 20 pieces of kindling', progress: (s) => [s.wood.kindling ?? 0, 20] },
  bear: { text: 'Feed 5 big logs', progress: (s) => [s.wood.big ?? 0, 5] },
  turtle: { text: 'Feed on 30 different days', progress: (s) => [s.daysFed, 30] },
  wolf: { text: 'Keep 4 fires', progress: (s) => [s.fires, 4] },
  serpent: { text: 'Feed 100 times', progress: (s) => [s.feeds, 100] },
  stag: { text: 'Collect gems in 10 colours', progress: (s) => [s.gemColors, 10] },
  phoenix: { text: 'Reach level 10 with any fire', progress: (s) => [s.maxLevel, 10] },
  dragon: { text: 'Reach level 20 with any fire', progress: (s) => [s.maxLevel, 20] },
  spirit: { text: 'Reach level 40 with any fire', progress: (s) => [s.maxLevel, 40] },
};

export const creatureReached = (id: CreatureId, s: Stats): boolean => { const [have, need] = CREATURE_GOALS[id].progress(s); return have >= need; };

/** Unlock every creature whose goal is now met. Never takes one away. */
export function unlockCreatures(c: Collection, s: Stats): { collection: Collection; newly: CreatureId[] } {
  const newly = CREATURE_IDS.filter((id) => !c.creatures.includes(id) && creatureReached(id, s));
  return newly.length ? { collection: { ...c, creatures: [...c.creatures, ...newly] }, newly } : { collection: c, newly };
}

// ---- the sky ------------------------------------------------------------------------------------

/** Stars in each constellation, one constellation for each design. */
export const CONSTELLATION_SIZES = [5, 6, 7, 8, 9, 10, 12, 14];
export const TOTAL_STARS = CONSTELLATION_SIZES.reduce((a, b) => a + b, 0);

/** How many stars of each constellation are lit when `lit` stars are lit in all. */
export function litPerConstellation(lit: number): number[] {
  let left = Math.max(0, Math.min(TOTAL_STARS, Math.floor(lit)));
  return CONSTELLATION_SIZES.map((n) => { const k = Math.min(n, left); left -= k; return k; });
}

// ---- the Great Hearth ---------------------------------------------------------------------------

/** Lifetime XP at which the Great Hearth reaches each of its 8 stages. */
export const HEARTH_STAGES = [0, 400, 1500, 5000, 14000, 35000, 80000, 180000];

export function hearthStage(lifetimeXp: number): { stage: number; into: number; span: number; fraction: number; toNext: number } {
  let stage = 1;
  for (let i = 0; i < HEARTH_STAGES.length; i++) if (lifetimeXp >= HEARTH_STAGES[i]) stage = i + 1;
  if (stage >= HEARTH_STAGES.length) return { stage, into: 1, span: 1, fraction: 1, toNext: 0 };
  const from = HEARTH_STAGES[stage - 1], to = HEARTH_STAGES[stage];
  return { stage, into: lifetimeXp - from, span: to - from, fraction: Math.max(0, Math.min(1, (lifetimeXp - from) / (to - from))), toNext: to - lifetimeXp };
}

/** A collection for someone who already has fires from before collecting existed. */
export function collectionFromFires(fires: { xp: number; level: number }[], feeds: number): Collection {
  const c = emptyCollection();
  return { ...c, lifetimeXp: fires.reduce((n, f) => n + f.xp, 0), levelUps: fires.reduce((n, f) => n + Math.max(0, f.level - 1), 0), feeds };
}
