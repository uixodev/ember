import type { Area } from '../model/types';
import { CREATURE_IDS, type CreatureId } from './creatures';
import { PALETTES, type PaletteId } from './palettes';
import { FIRE_STYLES, type FireStyle, type Size } from './world';
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
