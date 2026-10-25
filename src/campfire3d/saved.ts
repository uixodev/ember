import type { Area } from '../model/types';
import { CREATURE_IDS, type CreatureId } from './creatures';
import { PALETTES, type PaletteId } from './palettes';
import { computeHeat } from '../engine/heat';
import { parseJson } from '../storage/storage';
import { FIRE_STYLES, layoutFires, type FireStyle, type Size } from './world';
import type { LogEvent } from './SparkLog';

/**
 * What the campfire app remembers, in localStorage. A fire keeps the percent it had at `since` and how
 * fast it cools, so the heat can be worked out for any moment, including while the app was closed.
 */
export interface Fire {
  area: Area;
  percent: number;
  since: number;
  rate: number;
  size: Size;
  color: PaletteId;
  style: FireStyle;
  creature: CreatureId | 'auto' | 'none';
  main?: boolean;
  pos?: { x: number; z: number };
}

export interface Saved { fires: Fire[]; events: LogEvent[] }

const KEY = 'ember:campfire:v1';
const num = (v: unknown, lo: number, hi: number, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v.slice(0, 80) : fallback);

function fireFrom(raw: unknown): Fire | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const a = r.area as Record<string, unknown> | undefined;
  if (!a || typeof a.id !== 'string' || !a.id) return null;
  const color = (typeof r.color === 'string' && r.color in PALETTES ? r.color : 'classic') as PaletteId;
  const style = (FIRE_STYLES.some((s) => s.id === r.style) ? r.style : 'camp') as FireStyle;
  const creature = (r.creature === 'none' || CREATURE_IDS.includes(r.creature as CreatureId) ? r.creature : 'auto') as Fire['creature'];
  const p = r.pos as Record<string, unknown> | undefined;
  const name = str(a.name);
  const percent = num(r.percent, 0, 100, 0);
  return {
    area: { id: a.id, name, place: 'side', coolingMinutes: 1440, sparks: [`Spend 5 minutes on ${name || 'it'}`], level: 0, levelSince: 0, createdAt: num(a.createdAt, 0, 8.64e15, 0) },
    percent, since: num(r.since, 0, 8.64e15, Date.now()), rate: num(r.rate, 1, 2000, 50),
    size: Math.round(num(r.size, 1, 4, 2)) as Size, color, style, creature,
    main: r.main === true ? true : undefined,
    pos: p && typeof p.x === 'number' && typeof p.z === 'number' ? { x: num(p.x, -40, 40, 0), z: num(p.z, -40, 40, 0) } : undefined,
  };
}

function eventFrom(raw: unknown): LogEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.areaId !== 'string') return null;
  return { id: num(r.id, 0, 8.64e15, Date.now()), areaId: r.areaId, areaName: str(r.areaName), swatch: str(r.swatch, '#FF9A2E'), at: num(r.at, 0, 8.64e15, Date.now()), note: typeof r.note === 'string' ? r.note.slice(0, 160) : '', minutes: Math.round(num(r.minutes, 1, 1440, 5)), gain: num(r.gain, 0, 100, 0) };
}

/** Turn anything (stored or imported) into safe data. Returns null if it isn't ours. */
export function parseSaved(text: string): Saved | null {
  try {
    const d = JSON.parse(text) as { v?: unknown; fires?: unknown; events?: unknown };
    if (!d || typeof d !== 'object' || !Array.isArray(d.fires)) return null;
    const fires = d.fires.map(fireFrom).filter((f): f is Fire => f !== null).slice(0, 12);
    const events = (Array.isArray(d.events) ? d.events : []).map(eventFrom).filter((e): e is LogEvent => e !== null).slice(-2000);
    return { fires, events };
  } catch {
    return null;
  }
}

export function loadSaved(): { data: Saved; problem: boolean } {
  try {
    const text = window.localStorage.getItem(KEY);
    if (text === null) return { data: { fires: [], events: [] }, problem: false };
    const data = parseSaved(text);
    return data ? { data, problem: false } : { data: { fires: [], events: [] }, problem: true };
  } catch {
    return { data: { fires: [], events: [] }, problem: true };
  }
}

/** Returns false when the browser won't let us save (private mode, full, blocked). */
export function save(data: Saved): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, ...data }));
    return true;
  } catch {
    return false;
  }
}

export const toJson = (data: Saved): string => JSON.stringify({ v: 1, ...data }, null, 2);

// ---- Backups from the classic version -------------------------------------------------------------

const CLASSIC_COLORS: PaletteId[] = ['classic', 'green', 'crimson', 'gold', 'sapphire', 'aurora', 'lava', 'sky', 'amber', 'ice', 'mint', 'lime'];
const PERCENT_OF_LEVEL = [0, 15, 50, 85];

/**
 * Turn a backup exported from the classic version into campfires. Each area becomes a fire: its heat level
 * becomes a percentage, its cooling time a cooling speed, and its sparks and big sessions go into the list.
 * Archived areas are left out.
 */
export function fromClassic(text: string): Saved | null {
  let data;
  try { data = parseJson(text); } catch { return null; }
  if (!data) return null;
  const now = Date.now();
  const areas = data.areas.filter((a) => a.place !== 'archive').sort((a, b) => (a.place === 'main' ? -1 : 0) - (b.place === 'main' ? -1 : 0)).slice(0, 12);
  const slots = layoutFires(areas.length);
  const fires: Fire[] = areas.map((a, i) => {
    const heat = computeHeat(a, now, data.settings.activeHours);
    const perDay = (100 / (3 * Math.max(60, a.coolingMinutes))) * 1440;
    return {
      area: { ...a, name: a.name.slice(0, 24), sparks: a.sparks.length ? a.sparks : [`Spend 5 minutes on ${a.name}`] },
      percent: PERCENT_OF_LEVEL[heat.level] ?? 0, since: now, rate: Math.round(Math.max(5, Math.min(720, perDay))),
      size: a.place === 'main' ? 4 : 2, color: CLASSIC_COLORS[i % CLASSIC_COLORS.length], style: 'camp', creature: 'auto',
      main: a.place === 'main' || undefined, pos: slots[i],
    };
  });
  const byId = new Map(fires.map((f) => [f.area.id, f]));
  const events: LogEvent[] = data.events.flatMap((e, i) => {
    const f = byId.get(e.areaId);
    if (!f) return [];
    return [{ id: now + i, areaId: f.area.id, areaName: f.area.name, swatch: PALETTES[f.color].swatch, at: e.at, note: (e.note ?? '').slice(0, 160), minutes: Math.round(Math.max(1, Math.min(1440, e.minutes ?? 5))), gain: e.type === 'big' ? 100 : 10 }];
  }).slice(-2000);
  return { fires, events };
}
