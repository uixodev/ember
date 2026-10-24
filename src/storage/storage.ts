import { DEFAULT_ACTIVE_HOURS } from '../engine/heat';
import type { Area, EmberData } from '../model/types';

/**
 * Persistence for the whole app, in one place so it can move to IndexedDB later.
 * Everything is stored as one JSON document under a versioned key.
 */
export const STORAGE_KEY = 'ember:v1';

export function emptyData(): EmberData {
  return {
    version: 1,
    onboarded: false,
    areas: [],
    events: [],
    settings: { activeHours: { ...DEFAULT_ACTIVE_HOURS }, ambient: false, haptics: true, sounds: true, notify: { enabled: false, leadMinutes: 15 } },
  };
}

export type LoadResult =
  | { status: 'ok'; data: EmberData }
  | { status: 'empty' }
  | { status: 'corrupt' }
  | { status: 'unavailable' };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validArea(a: unknown): a is Area {
  if (!a || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.id === 'string' && typeof o.name === 'string' &&
    (o.place === 'main' || o.place === 'side' || o.place === 'archive') &&
    isNum(o.coolingMinutes) && o.coolingMinutes > 0 &&
    Array.isArray(o.sparks) && o.sparks.every((s) => typeof s === 'string') &&
    [0, 1, 2, 3].includes(o.level as number) && isNum(o.levelSince) && isNum(o.createdAt)
  );
}

/** Returns the data if the value has the shape of an Ember document, otherwise null. */
export function parseData(value: unknown): EmberData | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.areas) || !Array.isArray(o.events)) return null;
  if (!o.areas.every(validArea)) return null;
  const events = o.events.every((e) => {
    const x = e as Record<string, unknown>;
    return x && typeof x.id === 'string' && typeof x.areaId === 'string' &&
      (x.type === 'spark' || x.type === 'big') && isNum(x.at);
  });
  if (!events) return null;
  const s = o.settings as Record<string, unknown> | undefined;
  const h = s?.activeHours as Record<string, unknown> | undefined;
  if (!h || !isNum(h.start) || !isNum(h.end)) return null;
  return {
    version: 1,
    onboarded: o.onboarded === true,
    areas: o.areas as Area[],
    events: o.events as EmberData['events'],
    settings: { activeHours: { start: h.start, end: h.end }, ambient: s?.ambient === true, haptics: s?.haptics !== false, sounds: s?.sounds !== false, notify: parseNotify(s?.notify) },
  };
}

const parseNotify = (v: unknown): { enabled: boolean; leadMinutes: number } => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { enabled: o.enabled === true, leadMinutes: isNum(o.leadMinutes) && o.leadMinutes >= 0 && o.leadMinutes <= 240 ? o.leadMinutes : 15 };
};

export function parseJson(text: string): EmberData | null {
  try {
    return parseData(JSON.parse(text));
  } catch {
    return null;
  }
}

export function load(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };
  const data = parseJson(raw);
  return data ? { status: 'ok', data } : { status: 'corrupt' };
}

export function save(data: EmberData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable, nothing to clear */
  }
}

export function exportJson(data: EmberData): string {
  return JSON.stringify(data, null, 2);
}
