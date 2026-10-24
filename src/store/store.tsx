import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import {
  archive, bigSession, computeHeat, rebase, spark as sparkAction, unarchive,
  DEFAULT_MAIN_COOLING, SIDE_COOLING, type ActiveHours, type Heat, type Level, type Place,
} from '../engine/heat';
import { currentStreak, keptDays, sparksToday } from '../model/streaks';
import type { Area, AreaEvent, EmberData } from '../model/types';
import { clear, emptyData, load, parseJson, save, type LoadResult } from '../storage/storage';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export interface NewArea {
  name: string;
  place: Place;
  coolingMinutes: number;
  sparks: string[];
}

export interface Celebration {
  areaId: string;
  name: string;
  from: Level;
}

/** What just happened when a fire was fed; drives the level-up animation. */
export interface FeedInfo {
  kind: 'spark' | 'big';
  areaId: string;
  name: string;
  from: Level;
  to: Level;
  /** Rim fill before feeding, so the animation can refill it. */
  fromProgress: number;
  prevStreak: number;
  streak: number;
  sparksToday: number;
  note?: string;
  minutes?: number;
}

export interface Store {
  data: EmberData;
  /** Current time, refreshed every minute and on focus. */
  now: number;
  loadStatus: LoadResult['status'];
  saveFailed: boolean;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  feed: FeedInfo | null;
  finishFeed: () => void;
  heatOf: (area: Area) => Heat;
  mainArea: Area | undefined;
  completeSetup: (mainName: string, sideNames: string[], hours: ActiveHours) => void;
  addArea: (a: NewArea) => string;
  updateArea: (id: string, patch: Partial<Pick<Area, 'name' | 'coolingMinutes' | 'sparks'>>) => void;
  moveArea: (id: string, place: Place) => void;
  deleteArea: (id: string) => void;
  spark: (id: string, note?: string) => void;
  big: (id: string, minutes: number, note?: string) => void;
  deleteEvent: (eventId: string) => void;
  setActiveHours: (h: ActiveHours) => void;
  importJson: (text: string) => boolean;
  resetAll: () => void;
  startFresh: () => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

export function defaultCooling(place: Place): number {
  return place === 'main' ? DEFAULT_MAIN_COOLING : SIDE_COOLING.daily;
}

function makeArea(a: NewArea, now: number): Area {
  return {
    id: uid(), name: a.name.trim(), place: a.place, coolingMinutes: a.coolingMinutes,
    sparks: a.sparks.map((s) => s.trim()).filter(Boolean),
    level: 3, levelSince: now, createdAt: now,
  };
}

/** Change an area's place, keeping the heat it has reached and swapping the remembered cooling. */
function placed(area: Area, place: Place, now: number, hours: ActiveHours): Area {
  if (area.place === place) return area;
  const stored =
    area.place === 'archive' ? unarchive(area, now)
      : place === 'archive' ? archive(area, now, hours)
        : rebase(area, now, hours);
  const from = area.place === 'archive' ? area.archivedFrom ?? 'side' : area.place;
  let cooling = area.coolingMinutes;
  let alt = area.altCoolingMinutes;
  if (place !== 'archive' && (from === 'main') !== (place === 'main')) {
    cooling = alt ?? defaultCooling(place);
    alt = area.coolingMinutes;
  }
  return {
    ...area, ...stored, place, coolingMinutes: cooling, altCoolingMinutes: alt,
    archivedFrom: place === 'archive' ? (area.place as 'main' | 'side') : undefined,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef<LoadResult>(load());
  const [data, setData] = useState<EmberData>(
    initial.current.status === 'ok' ? initial.current.data : emptyData(),
  );
  const [loadStatus, setLoadStatus] = useState(initial.current.status);
  const [saveFailed, setSaveFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [feed, setFeed] = useState<FeedInfo | null>(null);
  const ref = useRef(data);
  ref.current = data;
  // While the stored data is corrupt or storage is unavailable, don't overwrite it until the user chooses.
  const writable = useRef(initial.current.status === 'ok' || initial.current.status === 'empty');

  useEffect(() => {
    if (!writable.current) return;
    setSaveFailed(!save(data));
  }, [data]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 60_000);
    const vis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const update = useCallback((fn: (d: EmberData) => EmberData) => {
    setData((d) => fn(d));
    setNow(Date.now());
  }, []);

  const hours = data.settings.activeHours;

  const store = useMemo<Store>(() => {
    const heatOf = (a: Area) => computeHeat(a, Date.now(), ref.current.settings.activeHours);
    const hoursNow = () => ref.current.settings.activeHours;

    const withMainDemoted = (areas: Area[], exceptId: string, t: number): Area[] =>
      areas.map((a) => (a.place === 'main' && a.id !== exceptId ? placed(a, 'side', t, hoursNow()) : a));

    const log = (area: Area, e: Omit<AreaEvent, 'id' | 'areaId'>, level: Level, t: number) => {
      const before = computeHeat(area, t, hoursNow());
      const prevStreak = currentStreak(keptDays(ref.current.events, area.id), t);
      const event: AreaEvent = { ...e, id: uid(), areaId: area.id };
      const all = [...ref.current.events, event];
      update((d) => ({
        ...d,
        areas: d.areas.map((a) => (a.id === area.id ? { ...a, level, levelSince: t } : a)),
        events: [...d.events, event],
      }));
      setFeed({
        kind: e.type, areaId: area.id, name: area.name, from: before.level, to: level,
        fromProgress: before.progress, prevStreak, streak: currentStreak(keptDays(all, area.id), t),
        sparksToday: sparksToday(all, t), note: e.note, minutes: e.minutes,
      });
      return before.level;
    };

    return {
      data, now, loadStatus, saveFailed, celebration,
      dismissCelebration: () => setCelebration(null),
      feed,
      finishFeed: () => setFeed(null),
      heatOf,
      mainArea: data.areas.find((a) => a.place === 'main'),

      completeSetup(mainName, sideNames, h) {
        const t = Date.now();
        const sparkFor = (n: string) => [`Spend 5 minutes on ${n.trim()}`];
        const areas: Area[] = [];
        if (mainName.trim()) {
          areas.push(makeArea({ name: mainName, place: 'main', coolingMinutes: DEFAULT_MAIN_COOLING, sparks: sparkFor(mainName) }, t));
        }
        for (const n of sideNames) {
          if (n.trim()) areas.push(makeArea({ name: n, place: 'side', coolingMinutes: SIDE_COOLING.daily, sparks: sparkFor(n) }, t));
        }
        update((d) => ({ ...d, onboarded: true, areas, events: [], settings: { ...d.settings, activeHours: h } }));
      },

      addArea(a) {
        const t = Date.now();
        const area = makeArea(a, t);
        update((d) => ({
          ...d,
          areas: [...(a.place === 'main' ? withMainDemoted(d.areas, area.id, t) : d.areas), area],
        }));
        return area.id;
      },

      updateArea(id, patch) {
        update((d) => ({ ...d, areas: d.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },

      moveArea(id, place) {
        const t = Date.now();
        update((d) => {
          const target = d.areas.find((a) => a.id === id);
          if (!target || target.place === place) return d;
          const demoted = place === 'main' ? withMainDemoted(d.areas, id, t) : d.areas;
          return { ...d, areas: demoted.map((a) => (a.id === id ? placed(a, place, t, d.settings.activeHours) : a)) };
        });
      },

      deleteArea(id) {
        update((d) => ({
          ...d,
          areas: d.areas.filter((a) => a.id !== id),
          events: d.events.filter((e) => e.areaId !== id),
        }));
      },

      spark(id, note) {
        const area = ref.current.areas.find((a) => a.id === id);
        if (!area || area.place === 'archive') return;
        const t = Date.now();
        const next = sparkAction(area, t, hoursNow());
        const clean = note?.trim();
        log(area, { type: 'spark', at: t, ...(clean ? { note: clean } : {}) }, next.level, t);
      },

      big(id, minutes, note) {
        const area = ref.current.areas.find((a) => a.id === id);
        if (!area || area.place === 'archive') return;
        const t = Date.now();
        const next = bigSession(t);
        const clean = note?.trim();
        const before = log(area, { type: 'big', at: t, minutes, ...(clean ? { note: clean } : {}) }, next.level, t);
        if (before <= 1) setCelebration({ areaId: id, name: area.name, from: before });
      },

      deleteEvent(eventId) {
        update((d) => ({ ...d, events: d.events.filter((e) => e.id !== eventId) }));
      },

      setActiveHours(h) {
        update((d) => ({ ...d, settings: { ...d.settings, activeHours: h } }));
      },

      importJson(text) {
        const parsed = parseJson(text);
        if (!parsed) return false;
        writable.current = true;
        setLoadStatus('ok');
        update(() => parsed);
        return true;
      },

      resetAll() {
        clear();
        writable.current = true;
        setLoadStatus('empty');
        update(() => emptyData());
      },

      startFresh() {
        writable.current = true;
        setLoadStatus('empty');
        update(() => emptyData());
      },
    };
    // `data`, `now` and friends change often; the memo rebuilds with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, now, loadStatus, saveFailed, celebration, feed, hours, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
