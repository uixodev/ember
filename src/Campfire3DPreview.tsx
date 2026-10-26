import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedSheet } from './components/ui/FeedSheet';
import { play, playHeat, unlockAudio } from './sound';
import { HeatIcon } from './components/ui/HeatIcon';
import { Segmented } from './components/ui/Tabs';
import { SANDBOX, fromClassic, loadSaved, parseSaved, resetSandbox, save, toJson, type Fire } from './campfire3d/saved';
import { RATES, SIZE_COOLS, SIZE_RATE, rateText } from './campfire3d/cooling';
import { Shield } from './campfire3d/Shield';
import { TIERS, WOOD_XP, levelOfXp, progressInLevel, tierOfLevel, xpMultiplier, xpToReach, type Tier } from './campfire3d/mastery';
import { CollectionScreen } from './campfire3d/CollectionScreen';
import { Gem } from './campfire3d/Gem';
import { CREATURE_GOALS, RARITIES, addGem, emptyCollection, recordFeed, rollGem, statsOf, unlockCreatures, type Collection, type GemDrop } from './campfire3d/collection';
import { SparkLog, type LogEvent } from './campfire3d/SparkLog';
import { ConfirmSheet } from './components/ui/Sheets';
import { LEVEL_NAMES, formatSpan, formatWhen } from './engine/format';
import { DEFAULT_ACTIVE_HOURS, type Level as HeatLevel } from './engine/heat';
import { CampfireWorld, FIRE_STYLES, layoutFires, type DragState, type FireStyle, type LabelPos, type Level, type Size } from './campfire3d/world';
import { CREATURE_IDS, CREATURE_NAMES, autoCreature, type CreatureId } from './campfire3d/creatures';
import { PALETTES, PALETTE_IDS, type PaletteId } from './campfire3d/palettes';
import { STICKS, type StickKind } from './campfire3d/sticks';
import type { FeedEntry } from './store/store';
import './campfire.css';
import './campfire3d.css';

/**
 * The campfire app: one fixed screen, no scrolling, saved on this device. Every area is its own campfire.
 * Drag wood from the dock onto a fire, say what you did, log it, and watch it burn.
 * Open with ?campfire3d.
 */

type Live = Fire & { pct: number; level: Level; progress: number; lvl: number; tier: Tier; realTier: Tier };

const levelOf = (p: number): Level => (p <= 0 ? 0 : p < 30 ? 1 : p < 70 ? 2 : 3);
const DAY = 86_400_000;
/** How fast a fire cools, in percent per day, from slow to fast. */
const coldAfter = (pct: number, rate: number) => (pct / rate) * DAY;

const mk = (id: string, name: string, percent: number, _rate: number, size: Size, color: PaletteId, style: FireStyle = 'camp', main = false, xp = 0): Fire => ({
  area: { id, name, place: main ? 'main' : 'side', coolingMinutes: main ? 150 : 1440, sparks: [`Spend 5 minutes on ${name || 'it'}`], level: levelOf(percent), levelSince: 0, createdAt: 0 },
  percent, xp, since: Date.now(), rate: SIZE_RATE[size], size, color, style, creature: 'auto', main,
});

const SAMPLE: Fire[] = [
  mk('js', 'JavaScript', 55, 150, 4, 'classic', 'camp', true),
  mk('clean', 'Cleaning', 85, 50, 2, 'green', 'inferno'),
  mk('read', 'Reading', 20, 75, 2, 'crimson', 'camp'),
  mk('draw', 'Drawing', 62, 35, 1, 'gold', 'candle'),
  mk('guitar', 'Guitar', 0, 50, 2, 'sapphire', 'crystal'),
  mk('piano', 'Piano', 92, 35, 3, 'aurora', 'swirl'),
  mk('run', 'Running', 33, 100, 2, 'lava', 'torch'),
  mk('es', 'Spanish', 45, 75, 3, 'sky', 'wisp'),
  mk('cook', 'Cooking', 75, 20, 1, 'amber', 'inferno'),
  mk('write', 'Writing', 0, 35, 2, 'ice', 'crystal'),
  mk('med', 'Meditate', 50, 100, 1, 'mint', 'wisp'),
  mk('garden', 'Garden', 28, 20, 1, 'lime', 'candle'),
];
// hand every area a different creature in turn, so the Hot fires don't all get the same one
[11, 5, 2, 16, 1, 43, 28, 10, 6, 61, 3, 9].forEach((level, i) => { SAMPLE[i].xp = xpToReach(level) + (i * 7) % 20; });
SAMPLE.forEach((f, i) => { f.creature = CREATURE_IDS[(i + 5) % CREATURE_IDS.length]; });

layoutFires(SAMPLE.length).forEach((p, i) => { SAMPLE[i].pos = p; });

const SIZE_NAMES: Record<Size, string> = { 1: 'Small', 2: 'Medium', 3: 'Large', 4: 'Huge' };
const HOURS = DEFAULT_ACTIVE_HOURS;
const VIEWS = [{ azimuth: 0, polar: 0.84 }, { azimuth: 0, polar: 0.3 }, { azimuth: Math.PI / 2, polar: 1.2 }];

interface Pending { fireId: string; kind: StickKind; stickId: number | null }
type Panel = null | 'customise' | 'menu' | 'cool';
type Tab = 'size' | 'colour' | 'style' | 'creature' | 'level';

export default function Campfire3DPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<CampfireWorld | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewIndex = useRef(0);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);
  const [creaturesAll, setCreaturesAll] = useState(false);
  const [held, setHeld] = useState<StickKind | null>(null);
  const [icons, setIcons] = useState<Partial<Record<StickKind, string>>>({});
  const [stored] = useState(loadSaved);
  const [fires, setFires] = useState<Fire[]>(() => (SANDBOX && stored.data.fires.length === 0 ? SAMPLE.map((f) => ({ ...f, since: Date.now() })) : stored.data.fires));
  const [saveFailed, setSaveFailed] = useState(stored.problem);
  const fileRef = useRef<HTMLInputElement>(null);
  const [moving, setMoving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 10_000); return () => window.clearInterval(t); }, []);
  const [events, setEvents] = useState<LogEvent[]>(() => stored.data.events);
  const [collection, setCollection] = useState<Collection>(() => stored.data.collection);
  const [collectOpen, setCollectOpen] = useState(false);
  const [creatureIcons, setCreatureIcons] = useState<Partial<Record<CreatureId, string>>>({});
  const [toast, setToast] = useState<{ key: number; text: string; gem?: GemDrop } | null>(null);
  useEffect(() => { setSaveFailed(!save({ fires, events, collection })); }, [fires, events, collection]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 4200); return () => window.clearTimeout(t); }, [toast]);
  const [logOpen, setLogOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  // the little help bubble over the heat and XP bars
  const [tip, setTip] = useState<'heat' | 'xp' | null>(null);
  useEffect(() => { if (!tip) return; const t = window.setTimeout(() => setTip(null), 6000); return () => window.clearTimeout(t); }, [tip]);
  // Battery saver: lower resolution and slower drawing. You can switch it yourself; otherwise it turns on when the battery is low.
  const [saverPref, setSaverPref] = useState<'on' | 'off' | null>(() => { try { const v = window.localStorage.getItem('ember:saver'); return v === 'on' || v === 'off' ? v : null; } catch { return null; } });
  const [batteryLow, setBatteryLow] = useState(false);
  const saver = saverPref ? saverPref === 'on' : batteryLow;
  const saverRef = useRef(saver);
  saverRef.current = saver;
  useEffect(() => {
    type Battery = EventTarget & { level: number; charging: boolean };
    let bat: Battery | null = null;
    const check = () => { if (bat) setBatteryLow(bat.level <= 0.2 && !bat.charging); };
    (navigator as unknown as { getBattery?: () => Promise<Battery> }).getBattery?.().then((b) => {
      bat = b; check();
      b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check);
    }).catch(() => undefined);
    return () => { bat?.removeEventListener('levelchange', check); bat?.removeEventListener('chargingchange', check); };
  }, []);
  useEffect(() => { worldRef.current?.setQuality(saver ? 'saver' : 'full'); }, [saver]);
  const toggleSaver = () => {
    const next = saver ? 'off' : 'on';
    setSaverPref(next);
    try { window.localStorage.setItem('ember:saver', next); } catch { /* it just will not be remembered */ }
  };
  const [focusId, setFocusId] = useState<string | null>(null);
  const sparksToday = useMemo(() => { const d = new Date(now); return events.filter((e) => e.at >= new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()).length; }, [events, now]);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(stored.data.fires[0]?.area.id ?? (SANDBOX ? SAMPLE[0].area.id : null));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [tab, setTab] = useState<Tab>('size');
  useEffect(() => { setTip(null); }, [sel, panel]);

  // trying a design out on a fire: not saved, gone when you reload
  const [preview, setPreview] = useState<Record<string, Tier>>({});
  const [pop, setPop] = useState<{ id: string; key: number; up: boolean; text?: string; gainXp?: number; mult?: number } | null>(null);
  const popEl = useRef<HTMLDivElement>(null);
  const popId = useRef<string | null>(null);
  popId.current = pop?.id ?? null;
  const shown = useMemo<Live[]>(() => fires.map((f) => {
    const pct = Math.max(0, f.percent - (f.rate * Math.max(0, now - f.since)) / DAY);
    const lvl = levelOfXp(f.xp);
    const realTier = tierOfLevel(lvl).tier;
    return { ...f, pct, level: levelOf(pct), progress: pct / 100, lvl, realTier, tier: preview[f.area.id] ?? realTier };
  }), [fires, now, preview]);
  const chosen = shown.find((f) => f.area.id === sel);
  const pendingFire = pending ? shown.find((f) => f.area.id === pending.fireId) : undefined;
  // what each piece of wood is worth right now: more when the selected fire is Warm or Hot
  const dockMult = chosen ? xpMultiplier(chosen.level) : 1;
  const overFire = drag?.overFire ? shown.find((f) => f.area.id === drag.overFire) : undefined;

  // The page is one fixed screen: nothing to scroll.
  useEffect(() => {
    document.documentElement.classList.add('c3-lock');
    return () => document.documentElement.classList.remove('c3-lock');
  }, []);

  // the level shield floats over the fire it belongs to
  const onFrame = useCallback((labels: LabelPos[]) => {
    const el = popEl.current;
    if (!el || !popId.current) return;
    const l = labels.find((x) => x.id === popId.current);
    if (l && l.visible) { el.style.transform = `translate(${l.ax.toFixed(1)}px, ${l.ay.toFixed(1)}px) translate(-50%, -100%)`; el.style.opacity = ''; } else el.style.opacity = '0';
  }, []);
  useEffect(() => {
    if (!pop) return;
    const t = window.setTimeout(() => setPop(null), pop.up ? 3200 : 2400);
    return () => window.clearTimeout(t);
  }, [pop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const world = new CampfireWorld(canvas, {
        onFrame,
        onSelectFire: (id) => { if (id) { setSel(id); setPop({ id, key: Date.now(), up: false }); } },
        onDrag: (s) => setDrag(s.dragging ? s : null),
        onDrop: (fireId, kind, stickId) => { play('wood'); setHint(false); setPending({ fireId, kind, stickId }); },
        onInteract: () => setHint(false),
        onFireHold: (id, x, y) => { setSel(id); setMenu({ id, x, y }); },
        onFireMoved: (id, x, z) => setFires((all) => all.map((f) => (f.area.id === id ? { ...f, pos: { x, z } } : f))),
        reducedMotion: reduced,
      });
      worldRef.current = world;
      world.setQuality(saverRef.current ? 'saver' : 'full');
      (window as unknown as { __world: CampfireWorld }).__world = world;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.dispatchEvent(new Event('ember-ready'))));
      const t = window.setTimeout(() => { setIcons(world.renderIcons()); setCreatureIcons(world.renderCreatureIcons()); }, 250);
      return () => { window.clearTimeout(t); world.dispose(); worldRef.current = null; };
    } catch {
      setFailed(true);
      window.dispatchEvent(new Event('ember-ready'));
    }
  }, [onFrame]);

  // keep the fires centred in the part of the screen the controls leave free
  useEffect(() => {
    const measure = () => worldRef.current?.setInsets(topRef.current?.offsetHeight ?? 0, bottomRef.current?.offsetHeight ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (topRef.current) ro.observe(topRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, [failed]);

  // only creatures you have unlocked stand on fires: a fire set to a locked one, or to "auto", gets one you own
  const resolveCreature = (c: Fire['creature'], id: string): CreatureId | 'none' => (c === 'none' ? 'none' : c !== 'auto' && collection.creatures.includes(c) ? c : autoCreature(id, collection.creatures));
  useEffect(() => {
    worldRef.current?.setFires(shown.map((f) => ({ id: f.area.id, level: f.level, progress: f.progress, size: f.size, color: f.color, style: f.style, creature: resolveCreature(f.creature, f.area.id), pos: f.pos, tier: f.tier })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, collection.creatures]);
  useEffect(() => { if (focusId) { worldRef.current?.focusFire(focusId); setFocusId(null); } }, [focusId, shown]);
  useEffect(() => { worldRef.current?.setMoveMode(moving); }, [moving]);
  useEffect(() => { worldRef.current?.setSelected(sel); }, [sel]);
  useEffect(() => { worldRef.current?.setCreaturesAlways(creaturesAll); }, [creaturesAll]);

  const cancelPending = () => {
    if (pending?.stickId) worldRef.current?.returnStick(pending.stickId);
    setPending(null);
  };

  const confirm = (entry: FeedEntry & { note: string }) => {
    if (!pending || !pendingFire) return;
    const fire = pendingFire;
    const to = levelOf(Math.min(100, fire.pct + STICKS[pending.kind].gain));
    play('woodBurn'); window.setTimeout(() => playHeat(to), 450);
    if (pending.stickId) worldRef.current?.consumeStick(pending.stickId); else worldRef.current?.flare(fire.area.id);
    const gain = STICKS[pending.kind].gain;
    // XP: what the wood is worth, doubled when the fire is Warm and tripled when it is Hot. Nothing is wasted.
    const mult = xpMultiplier(fire.level);
    const earned = WOOD_XP[pending.kind] * mult;
    const before = levelOfXp(fire.xp), after = levelOfXp(fire.xp + earned);
    const newDesign = tierOfLevel(after).tier > tierOfLevel(before).tier;
    window.setTimeout(() => {
      if (after > before) play('levelUp');
      setSel(fire.area.id);
      setPop({ id: fire.area.id, key: Date.now(), up: after > before, text: after > before ? (newDesign ? `New design: ${tierOfLevel(after).name}` : 'Level up') : undefined, gainXp: earned, mult });
    }, 1300);
    setFires((all) => all.map((f) => (f.area.id === fire.area.id ? { ...f, percent: Math.min(100, fire.pct + gain), xp: f.xp + earned, since: Date.now() } : f)));
    // the collection: wood and XP counted, maybe a gem, maybe a creature
    const drop = rollGem(pending.kind, fire.level, fire.color);
    let col = recordFeed(collection, { kind: pending.kind, xp: earned, levelsGained: after - before, at: Date.now() });
    if (drop) col = addGem(col, drop);
    const levels = shown.map((x) => ({ level: x.area.id === fire.area.id ? after : x.lvl }));
    const unlocked = unlockCreatures(col, statsOf(col, levels));
    setCollection(unlocked.collection);
    if (drop) window.setTimeout(() => { play('levelUp'); setToast({ key: Date.now(), text: `${RARITIES.find((r) => r.id === drop.rarity)?.name} ${PALETTES[fire.color].name} gem`, gem: drop }); }, 1500);
    if (unlocked.newly.length) window.setTimeout(() => { play('levelUp'); setToast({ key: Date.now() + 1, text: `New creature: ${CREATURE_NAMES[unlocked.newly[0]]}${unlocked.newly.length > 1 ? ` and ${unlocked.newly.length - 1} more` : ''}` }); }, drop ? 5800 : 1500);
    setEvents((all) => [...all, { id: Date.now(), areaId: fire.area.id, areaName: fire.area.name, swatch: PALETTES[fire.color].swatch, at: Date.now(), note: entry.note, minutes: entry.minutes ?? 5, gain: STICKS[pending.kind].gain, xp: earned }]);
    setPending(null);
  };



  const rename = (name: string) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, area: { ...f.area, name, sparks: [`Spend 5 minutes on ${name || 'it'}`] } } : f))); };
  const setHeat = (pct: number) => {
    if (!chosen) return;
    const next = Math.max(0, Math.min(100, Math.round(pct)));
    if (levelOf(next) < chosen.level) playHeat(levelOf(next));
    setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, percent: next, since: Date.now() } : f)));
  };
  // changing the speed keeps today's heat: it counts from the moment of the change
  const setRate = (rate: number, custom: boolean) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, percent: chosen.pct, since: Date.now(), rate, customRate: custom || undefined } : f))); };
  const setSize = (size: Size) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, size, ...(f.customRate ? {} : { percent: chosen.pct, since: Date.now(), rate: SIZE_RATE[size] }) } : f))); };
  const patch = (change: Partial<Fire>) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, ...change } : f))); };
  const [confirmReset, setConfirmReset] = useState(false);
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([toJson({ fires, events, collection })], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `ember-campfires-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      const data = parseSaved(text) ?? fromClassic(text);
      if (!data) { window.alert('That file is not an Ember backup.'); return; }
      setFires(data.fires); setEvents(data.events); setCollection(data.collection); setSel(data.fires[0]?.area.id ?? null); setPanel(null);
    }).catch(() => window.alert('Could not read that file.'));
  };
  const loadSample = () => {
    const t = Date.now();
    setFires(SAMPLE.slice(0, 5).map((f) => ({ ...f, since: t })));
    setSel(SAMPLE[0].area.id); setPanel(null);
  };
  const eraseAll = () => { setFires([]); setEvents([]); setCollection(emptyCollection()); setSel(null); setPanel(null); setConfirmReset(false); play('delete'); };
  // Coming back after a while in the background the screen can be stale or the 3D view frozen: bring the heat up to
  // date, and after a few minutes away start fresh (everything is already saved) unless something is being filled in.
  const busy = useRef(false);
  busy.current = !!(pending || logOpen || confirmDel || confirmReset || menu);
  useEffect(() => {
    let hiddenAt = 0;
    const back = () => {
      if (document.visibilityState !== 'visible') { hiddenAt = hiddenAt || Date.now(); return; }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      setNow(Date.now());
      if (away > 3 * 60_000 && !busy.current) {
        try { window.sessionStorage.setItem('ember:resumed', '1'); } catch { /* the splash just shows once more */ }
        window.location.reload();
      } else worldRef.current?.wake();
    };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('pageshow', back);
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('pageshow', back); };
  }, []);

  // Check for a newer version, then reload (the installed app has no reload button of its own).
  const refresh = () => {
    const done = () => window.location.reload();
    const t = window.setTimeout(done, 1500);
    navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => undefined).finally(() => { window.clearTimeout(t); window.setTimeout(done, 300); });
  };
  const removeFire = (id: string) => {
    setFires((all) => all.filter((f) => f.area.id !== id));
    setConfirmDel(null); setMenu(null); setPanel(null);
    setSel((cur) => (cur === id ? fires.find((f) => f.area.id !== id)?.area.id ?? null : cur));
    play('delete');
  };
  const addFire = () => {
    if (fires.length >= 12) return;
    const spots: { x: number; z: number }[] = [];
    for (let x = -10.5; x <= 10.5; x += 3.5) for (let z = -9.6; z <= 9.6; z += 3.2) spots.push({ x, z });
    spots.sort((a, b) => Math.hypot(a.x, a.z * 1.2) - Math.hypot(b.x, b.z * 1.2));
    const pos = spots.find((c) => fires.every((f) => Math.hypot(c.x - (f.pos?.x ?? 0), c.z - (f.pos?.z ?? 0)) >= 3.3)) ?? spots[0];
    const f = mk(`new-${Date.now()}`, '', 0, 50, 2, PALETTE_IDS[fires.length % PALETTE_IDS.length]);
    f.pos = pos;
    f.creature = CREATURE_IDS[fires.length % CREATURE_IDS.length];
    setFires((all) => [...all, f]);
    setSel(f.area.id); setTab('size'); setPanel('customise'); setHint(false); setFocusId(f.area.id);
  };
  const nextView = () => { viewIndex.current = (viewIndex.current + 1) % VIEWS.length; worldRef.current?.flyTo(VIEWS[viewIndex.current]); };

  // wood from the dock: pick it up here, carry it into the scene
  const grab = (kind: StickKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanel(null);
    unlockAudio();
    worldRef.current?.beginTrayDrag(kind, e.clientX, e.clientY, e.pointerId);
    setHeld(kind);
    setHint(false);
  };
  const carry = (e: React.PointerEvent) => { worldRef.current?.moveTrayDrag(e.clientX, e.clientY); };
  const release = (drop: boolean) => () => { worldRef.current?.endTrayDrag(drop); setHeld(null); };
  const useWood = (kind: StickKind) => (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && chosen) { e.preventDefault(); setPending({ fireId: chosen.area.id, kind, stickId: null }); }
  };

  const stageH = stageRef.current?.clientHeight ?? 700;
  // Customising: the camera comes in close to the fire and only the panel stays at the bottom.
  const wasCustomising = useRef(false);
  useEffect(() => {
    if (panel === 'customise' && sel) { worldRef.current?.focusFire(sel); wasCustomising.current = true; }
    else if (wasCustomising.current && panel !== 'customise') { wasCustomising.current = false; worldRef.current?.flyTo(VIEWS[viewIndex.current]); }
  }, [panel, sel]);
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="c3-app" ref={stageRef}>
      {failed ? (
        <div className="c3-fail"><b>3D isn't available on this device</b><span>Open the flat version instead: add ?campfire to the address.</span></div>
      ) : (
        <>
          <canvas ref={canvasRef} className="c3-canvas" aria-label="Your campfires" />
          {shown.length === 0 && (
            <div className="c3-empty">
              <b>Light your first fire</b>
              <span>Each area of your life gets its own campfire. Feed it wood when you work on it and it stays warm.</span>
              <button type="button" className="c3-act primary" onClick={addFire}>Add an area</button>
            </div>
          )}
          {drag && (
            <div className={`c3-chip${overFire ? ' ready' : ''}`} style={{ left: Math.max(70, Math.min(drag.x, (stageRef.current?.clientWidth ?? 390) - 70)), top: Math.min(drag.y, stageH - 150) }} aria-hidden="true">
              <b>{STICKS[drag.kind ?? 'branch'].name}</b>
              <span>{overFire ? `Let go to feed ${overFire.area.name}: +${WOOD_XP[drag.kind ?? 'branch'] * xpMultiplier(overFire.level)} XP` : `${STICKS[drag.kind ?? 'branch'].blurb}, +${STICKS[drag.kind ?? 'branch'].gain}%`}</span>
            </div>
          )}
        </>
      )}

      <div className="c3-top" ref={topRef}>
        <button type="button" className="c3-refresh" aria-label="Refresh the app" onClick={refresh}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <header className="c3-head">
          <nav className={`c3-tools${toolsOpen ? ' open' : ''}`} aria-label="Tools">
            <button type="button" className="c3-round c3-toggle" aria-label={toolsOpen ? 'Hide tools' : 'Show tools'} aria-expanded={toolsOpen} onClick={() => setToolsOpen((o) => !o)}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>
            </button>
            <div className="c3-more"><div className="c3-more-in">
        <button type="button" className="c3-round" aria-label="Change the view" onClick={nextView}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
        </button>
        <button type="button" className="c3-round" aria-label="Add an area" disabled={fires.length >= 12} onClick={addFire}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" /></svg>
        </button>
        <button type="button" className={`c3-round${moving ? ' on' : ''}`} aria-label="Move fires" aria-pressed={moving} onClick={() => { setMoving((m) => !m); setPanel(null); setHint(false); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        </button>
        <button type="button" className="c3-round" aria-label="Collection" onClick={() => { setCollectOpen(true); setToolsOpen(false); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 9 12 21 4 9Z" fill="none" stroke="currentColor" strokeWidth="2.200" strokeLinejoin="round" /><path d="M4 9h16M9 9l3 12 3-12M9 9l3-6 3 6" fill="none" stroke="currentColor" strokeWidth="1.600" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className={`c3-round${panel === 'menu' ? ' on' : ''}`} aria-label="More options" aria-expanded={panel === 'menu'} onClick={() => togglePanel('menu')}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" /><circle cx="16" cy="7" r="2.4" fill="currentColor" /><circle cx="8" cy="17" r="2.4" fill="currentColor" /></svg>
        </button>

        <button type="button" className="c3-round c3-sparks-row" onClick={() => { setPanel(null); setLogOpen(true); }} aria-label={`${sparksToday} ${sparksToday === 1 ? 'spark' : 'sparks'} today, open the list`}>
          <span className="c3-count">{sparksToday}</span>
        </button>
            </div></div>
          </nav>
        </header>
        {chosen && (
          <div className="c3-title" aria-live="polite">
            <h1>{chosen.area.name || 'New area'}</h1>
            <span className={`c3-state lv${chosen.level}`}><HeatIcon level={chosen.level} size={18} />{LEVEL_NAMES[chosen.level as HeatLevel]} · {Math.round(chosen.pct)}%</span>
          </div>
        )}
      </div>
      {moving && !drag && !panel && <div className="c3-hint" aria-hidden="true">Drag a fire to move it</div>}
      {hint && fires.length > 0 && !moving && !drag && !panel && <div className="c3-hint" aria-hidden="true">Drag wood from the dock onto a fire</div>}

      <div className="c3-bottom" ref={bottomRef}>
        {panel === 'customise' && chosen && (
          <section className="c3-panel" aria-label={`Customise ${chosen.area.name}`}>
            <div className="c3-panel-head">
              <input className="c3-name" value={chosen.area.name} maxLength={24} placeholder="Name this area" aria-label="Area name" onChange={(e) => rename(e.target.value)} />
              <button type="button" className="c3-x" aria-label="Close" onClick={() => setPanel(null)}>×</button>
            </div>
            <Segmented value={tab} onChange={setTab} options={[{ value: 'size', label: 'Size' }, { value: 'colour', label: 'Colour' }, { value: 'style', label: 'Style' }, { value: 'creature', label: 'Creature' }, { value: 'level', label: 'Level' }]} />
            <div className="c3-panel-body">
              {tab === 'level' && (() => {
                const xp = progressInLevel(chosen.xp);
                return (
                  <div className="c3-level">
                    <div className="c3-level-head">
                      <Shield level={chosen.lvl} tier={chosen.tier} size={56} />
                      <div><b>Level {chosen.lvl} · {chosen.xp} XP</b><span>{TIERS[chosen.tier - 1].name} design · {xp.toNext} XP to level {xp.level + 1}</span></div>
                    </div>
                    <div className="c3-meter xp" role="progressbar" aria-label="Experience to the next level" aria-valuemin={0} aria-valuemax={xp.span} aria-valuenow={xp.into}><i style={{ width: `${xp.fraction * 100}%` }} /></div>
                    <div className="chips left" role="radiogroup" aria-label="Preview a design">
                      {TIERS.map((t) => (
                        <button key={t.tier} type="button" role="radio" aria-checked={chosen.tier === t.tier} className={`chip c3-tierchip${chosen.tier === t.tier ? ' on' : ''}`}
                          onClick={() => setPreview((p) => { const n = { ...p }; if (t.tier === chosen.realTier) delete n[chosen.area.id]; else n[chosen.area.id] = t.tier; return n; })}>
                          <Shield level={t.from} tier={t.tier} size={20} />{t.name}
                        </button>
                      ))}
                    </div>
                    <span className="camp-size-note">{chosen.tier === chosen.realTier
                      ? `Wood gives XP: kindling 1, branch 5, split log 10, log 20, big log 50. ×2 when the fire is Warm, ×3 when it is Hot. Level ${xp.level + 1} needs ${xpToReach(xp.level + 1)} XP in all.`
                      : `Preview of ${TIERS[chosen.tier - 1].name} (from level ${TIERS[chosen.tier - 1].from}): ${TIERS[chosen.tier - 1].look}. Tap your own design to go back.`}</span>
                  </div>
                );
              })()}
              {tab === 'size' && (
                <>
                  <div className="camp-size-row" role="radiogroup" aria-label="Fire size">
                    {([1, 2, 3, 4] as Size[]).map((z) => (
                      <button key={z} type="button" role="radio" aria-checked={chosen.size === z} aria-label={`${SIZE_NAMES[z]}, cools ${SIZE_COOLS[z]}`} className={`camp-size-btn${chosen.size === z ? ' on' : ''}`} onClick={() => setSize(z)}>
                        <i style={{ height: 6 + z * 4, width: 12 + z * 6, borderRadius: '50%' }} /><span>{SIZE_NAMES[z]}</span><small>{SIZE_COOLS[z]}</small>
                      </button>
                    ))}
                  </div>
                  <div className="chips c3-rates" role="radiogroup" aria-label="Cooling speed">
                    <button type="button" role="radio" aria-checked={!chosen.customRate} className={`chip${!chosen.customRate ? ' on' : ''}`} onClick={() => setRate(SIZE_RATE[chosen.size], false)}>From size</button>
                    {RATES.map((r) => (
                      <button key={r} type="button" role="radio" aria-checked={!!chosen.customRate && chosen.rate === r} className={`chip${chosen.customRate && chosen.rate === r ? ' on' : ''}`} onClick={() => setRate(r, true)}>{rateText(r)}</button>
                    ))}
                  </div>
                  <span className="camp-size-note">{chosen.customRate ? 'Your own speed' : 'The bigger the fire, the faster it cools'}: loses {rateText(chosen.rate)}. From full it is cold after {formatSpan(Math.round(coldAfter(100, chosen.rate) / 60000))}.</span>
                </>
              )}
              {tab === 'colour' && (
                <div className="c3-swatches" role="radiogroup" aria-label="Fire colour">
                  {PALETTE_IDS.map((id) => (
                    <button key={id} type="button" role="radio" aria-checked={chosen.color === id} aria-label={PALETTES[id].name} title={PALETTES[id].name}
                      className={`c3-swatch${chosen.color === id ? ' on' : ''}`} style={{ background: PALETTES[id].swatch }} onClick={() => patch({ color: id })} />
                  ))}
                </div>
              )}
              {tab === 'style' && (
                <div className="chips left" role="radiogroup" aria-label="Fire style">
                  {FIRE_STYLES.map((x) => (
                    <button key={x.id} type="button" role="radio" aria-checked={chosen.style === x.id} className={`chip${chosen.style === x.id ? ' on' : ''}`} onClick={() => patch({ style: x.id })}>{x.name}</button>
                  ))}
                </div>
              )}
              {tab === 'creature' && (
                <>
                  <div className="chips left" role="radiogroup" aria-label="Creature on top">
                    {(['auto', 'none', ...CREATURE_IDS] as const).map((c) => {
                      const locked = c !== 'auto' && c !== 'none' && !collection.creatures.includes(c);
                      return (
                        <button key={c} type="button" role="radio" aria-checked={chosen.creature === c} aria-disabled={locked} title={locked ? CREATURE_GOALS[c].text : undefined}
                          className={`chip${chosen.creature === c ? ' on' : ''}${locked ? ' locked' : ''}`} onClick={() => { if (locked) setToast({ key: Date.now(), text: `${CREATURE_NAMES[c]}: ${CREATURE_GOALS[c].text}` }); else patch({ creature: c }); }}>
                          {c === 'auto' ? 'Auto' : c === 'none' ? 'None' : locked ? `${CREATURE_NAMES[c]} (locked)` : CREATURE_NAMES[c]}
                        </button>
                      );
                    })}
                  </div>
                  <span className="camp-size-note">A creature of fire stands on a fire when it is Hot.</span>
                </>
              )}
            </div>
          </section>
        )}

        {panel === 'cool' && chosen && (
          <section className="c3-panel" aria-label={`Cool down ${chosen.area.name}`}>
            <div className="c3-panel-head"><b>Cool down {chosen.area.name || 'this fire'}</b><button type="button" className="c3-x" aria-label="Close" onClick={() => setPanel(null)}>×</button></div>
            <div className="chips left" role="group" aria-label="Quick cool down">
              {[10, 25, 50].map((d) => (
                <button key={d} type="button" className="chip" disabled={chosen.pct <= 0} onClick={() => setHeat(chosen.pct - d)}>Cool by {d}%</button>
              ))}
              <button type="button" className="chip" disabled={chosen.pct <= 0} onClick={() => setHeat(0)}>Put it out</button>
            </div>
            <label className="c3-range"><span>Set the heat: <b>{Math.round(chosen.pct)}%</b></span>
              <input type="range" min={0} max={100} value={Math.round(chosen.pct)} onChange={(e) => setHeat(+e.target.value)} />
            </label>
          </section>
        )}

        {panel === 'menu' && (
          <section className="c3-panel" aria-label="More options">
            <div className="c3-panel-head"><b>Options</b><button type="button" className="c3-x" aria-label="Close" onClick={() => setPanel(null)}>×</button></div>
            <div className="c3-switches">
              <button type="button" role="switch" aria-checked={creaturesAll} className={`c3-pill${creaturesAll ? ' on' : ''}`} onClick={() => setCreaturesAll((n) => !n)}>Creatures everywhere</button>
              <button type="button" role="switch" aria-checked={saver} className={`c3-pill${saver ? ' on' : ''}`} onClick={toggleSaver}>Battery saver</button>
              <button type="button" className="c3-pill" onClick={exportData}>Export backup</button>
              <button type="button" className="c3-pill" onClick={() => fileRef.current?.click()}>Import backup (new or classic)</button>
              {fires.length === 0 && <button type="button" className="c3-pill" onClick={loadSample}>Load example fires</button>}
              <button type="button" className="c3-pill danger" disabled={fires.length === 0 && events.length === 0} onClick={() => setConfirmReset(true)}>Erase everything</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
            {SANDBOX && (
              <div className="c3-switches">
                <button type="button" className="c3-pill" onClick={() => { resetSandbox(); window.location.reload(); }}>Reset the test copy</button>
              </div>
            )}
            <span className="camp-size-note">Battery saver draws fewer, smaller frames. It turns on by itself when the battery drops to 20%.</span>
            <span className="camp-size-note">{SANDBOX ? 'Test copy: it started as a copy of your data. Nothing here changes your real fires.' : saveFailed ? 'This browser is not letting the app save. Export a backup so you do not lose anything.' : 'Everything is saved on this device. Export a backup now and then.'}</span>
          </section>
        )}

        {chosen && !drag && panel !== 'customise' && (
          <div className="c3-focus compact">
            {(() => { const xp = progressInLevel(chosen.xp); const info = TIERS[chosen.tier - 1]; return (
              <div className="c3-stats">
                <button type="button" className="c3-line" aria-expanded={tip === 'heat'} aria-label={`Heat ${Math.round(chosen.pct)} percent. Tap for details`} onClick={() => setTip((t) => (t === 'heat' ? null : 'heat'))}>
                  <span className="c3-meter heat" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(chosen.pct)}><i style={{ width: `${chosen.pct}%`, background: PALETTES[chosen.color].swatch }} /></span>
                </button>
                <button type="button" className="c3-line" aria-expanded={tip === 'xp'} aria-label={`Level ${chosen.lvl}, ${chosen.xp} XP. Tap for details`} onClick={() => setTip((t) => (t === 'xp' ? null : 'xp'))}>
                  <span className="c3-meter xp" role="progressbar" aria-valuemin={0} aria-valuemax={xp.span} aria-valuenow={xp.into}><i style={{ width: `${xp.fraction * 100}%` }} /></span>
                </button>
                {tip && (
                  <div className="c3-tip" role="status">
                    {tip === 'heat' ? (
                      <>
                        <b>Heat · {LEVEL_NAMES[chosen.level as HeatLevel]} · {Math.round(chosen.pct)}%</b>
                        <span>{chosen.pct <= 0 ? 'The fire is cold. Any wood lights it again.' : `Loses ${rateText(chosen.rate)}. Fully cooled ${formatWhen(now + coldAfter(chosen.pct, chosen.rate), now)}.`}</span>
                      </>
                    ) : (
                      <>
                        <b><Shield level={chosen.lvl} tier={chosen.tier} size={18} /> Level {chosen.lvl} · {info.name} · {chosen.xp} XP</b>
                        <span>{xp.toNext} XP to level {xp.level + 1}. Wood gives 1, 5, 10, 20 or 50 XP, ×2 when Warm, ×3 when Hot.</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ); })()}
            <div className="c3-card-actions">
              <button type="button" className={`c3-act${panel === 'cool' ? ' on' : ''}`} aria-expanded={panel === 'cool'} onClick={() => togglePanel('cool')}>Cool</button>
              <button type="button" className="c3-act" onClick={() => togglePanel('customise')}>Customise</button>
            </div>
          </div>
        )}

        {panel !== 'customise' && <section className="c3-dock" aria-label="Your wood">
          {(Object.keys(STICKS) as StickKind[]).map((k) => (
            <button key={k} type="button" className={`c3-slot${held === k ? ' held' : ''}`}
              aria-label={`${STICKS[k].name}, adds ${STICKS[k].gain} percent. Drag onto a fire, or press Enter to feed the selected fire.`}
              onPointerDown={grab(k)} onPointerMove={carry} onPointerUp={release(true)} onPointerCancel={release(false)} onKeyDown={useWood(k)}>
              <span className="c3-slot-img">{icons[k] ? <img src={icons[k]} alt="" draggable={false} /> : <i className={`c3-slot-fallback ${k}`} />}</span>
              <b>{STICKS[k].name}</b>
              <span>+{STICKS[k].gain}%</span>
              <span className={`c3-slot-xp${dockMult > 1 ? ' boost' : ''}`} title={dockMult > 1 ? `${WOOD_XP[k]} XP × ${dockMult} because the fire is ${dockMult === 3 ? 'Hot' : 'Warm'}` : undefined}>{WOOD_XP[k] * dockMult} XP</span>
            </button>
          ))}
        </section>}
      </div>

      {SANDBOX && <div className="c3-testtag" aria-label="Test copy, your real data is safe">Test copy</div>}
      {pop && (() => { const f = shown.find((x) => x.area.id === pop.id); if (!f) return null; return (
        <div className="c3-pop" ref={popEl} aria-hidden="true">
          <div className={`c3-pop-in${pop.up ? ' up' : ''}`} key={pop.key}>
            {pop.up && <span className="c3-pop-up">{pop.text}</span>}
            {pop.gainXp ? <span className="c3-pop-gain">+{pop.gainXp} XP{pop.mult && pop.mult > 1 ? ` · ×${pop.mult}` : ''}</span> : null}
            <Shield level={f.lvl} tier={f.tier} size={pop.up ? 64 : 52} />
            <span className="c3-pop-name">{f.area.name || 'New area'}</span>
            <span className="c3-pop-xp">{f.xp} / {xpToReach(f.lvl + 1)} XP</span>
          </div>
        </div>
      ); })()}
      {toast && (
        <div className="c3-toast" key={toast.key} role="status">
          {toast.gem && <Gem color={toast.gem.color} rarity={toast.gem.rarity} size={30} />}
          <span>{toast.text}</span>
        </div>
      )}
      {collectOpen && <CollectionScreen collection={collection} fires={shown.map((f) => ({ level: f.lvl }))} creatureIcons={creatureIcons} onClose={() => setCollectOpen(false)} />}
      {logOpen && (
        <SparkLog
          events={events} now={now}
          onEdit={(id, patch) => setEvents((all) => all.map((e) => (e.id === id ? { ...e, ...patch } : e)))}
          onDelete={(id) => setEvents((all) => all.filter((e) => e.id !== id))}
          onClose={() => setLogOpen(false)}
        />
      )}
      {menu && !drag && (
        <>
          <div className="c3-menu-scrim" onPointerDown={() => setMenu(null)} />
          <div className="c3-menu" style={{ left: Math.max(70, Math.min(menu.x, (stageRef.current?.clientWidth ?? 390) - 70)), top: Math.max(120, menu.y - 20) }}>
            <button type="button" className="c3-menu-item" onClick={() => { setConfirmDel(menu.id); setMenu(null); }}>Delete this fire</button>
          </div>
        </>
      )}
      {confirmReset && (
        <ConfirmSheet
          title="Erase everything?" body="All your fires and your spark history on this device will be removed. Export a backup first if you might want them back."
          confirmLabel="Yes, erase it all" cancelLabel="Keep it" onConfirm={eraseAll} onCancel={() => setConfirmReset(false)}
        />
      )}
      {confirmDel && (
        <ConfirmSheet
          title={`Delete ${fires.find((f) => f.area.id === confirmDel)?.area.name || 'this area'}?`}
          body="Are you sure you want to delete it? Its fire and history go away for good."
          confirmLabel="Yes, delete it" cancelLabel="Keep it"
          onConfirm={() => removeFire(confirmDel)} onCancel={() => setConfirmDel(null)}
        />
      )}
      {pending && pendingFire && (
        <FeedSheet
          area={pendingFire.area} hours={HOURS}
          prefillMinutes={STICKS[pending.kind].minutes} prefillEffort={STICKS[pending.kind].effort}
          simple
          footNote={<>Adds <b>+{STICKS[pending.kind].gain}%</b>: {pendingFire.area.name || 'this fire'} goes from <b>{Math.round(pendingFire.pct)}%</b> to <b>{Math.min(100, Math.round(pendingFire.pct + STICKS[pending.kind].gain))}%</b>.</>}
          onClose={cancelPending}
          onConfirm={(entry) => confirm(entry)}
        />
      )}
    </div>
  );
}
