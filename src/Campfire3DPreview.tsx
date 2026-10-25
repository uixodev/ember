import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './components/ui/Button';
import { FeedBurst } from './components/FeedBurst/FeedBurst';
import { FeedSheet } from './components/ui/FeedSheet';
import { HeatIcon } from './components/ui/HeatIcon';
import { TopBar } from './components/ui/TopBar';
import { LEVEL_NAMES, formatSpan } from './engine/format';
import { DEFAULT_ACTIVE_HOURS, type Level as HeatLevel } from './engine/heat';
import { planFeed } from './engine/hold';
import type { Area } from './model/types';
import { CampfireWorld, type DragState, type LabelPos, type Level, type Size } from './campfire3d/world';
import { PALETTES, PALETTE_IDS, type PaletteId } from './campfire3d/palettes';
import { STICKS, type StickKind } from './campfire3d/sticks';
import type { FeedEntry, FeedInfo } from './store/store';
import './campfire.css';
import './campfire3d.css';

/**
 * DESIGN SAMPLE, not the real app: every area is its own campfire. Drag a piece of wood onto a fire,
 * say what you did, log it, and watch it burn. Open with ?campfire3d. All data here is made up.
 */

interface Fire { area: Area; level: Level; progress: number; size: Size; color: PaletteId; main?: boolean; cool: string }

const mk = (id: string, name: string, level: Level, progress: number, size: Size, cool: string, color: PaletteId, main = false): Fire => ({
  area: { id, name, place: main ? 'main' : 'side', coolingMinutes: main ? 150 : 1440, sparks: [`Spend 5 minutes on ${name}`], level, levelSince: 0, createdAt: 0 },
  level, progress, size, color, main, cool,
});

const SAMPLE: Fire[] = [
  mk('js', 'JavaScript', 2, 0.55, 4, '1 h 20', 'classic', true),
  mk('clean', 'Cleaning', 3, 0.8, 2, '19 h', 'green'),
  mk('read', 'Reading', 1, 0.2, 2, '5 h', 'crimson'),
  mk('draw', 'Drawing', 2, 0.6, 1, '4 days', 'gold'),
  mk('guitar', 'Guitar', 0, 0, 2, 'cold', 'blue'),
  mk('piano', 'Piano', 3, 0.9, 3, '2 days', 'teal'),
  mk('run', 'Running', 1, 0.35, 2, '9 h', 'crimson'),
  mk('es', 'Spanish', 2, 0.4, 3, '11 h', 'gold'),
  mk('cook', 'Cooking', 3, 0.7, 1, '3 days', 'classic'),
  mk('write', 'Writing', 0, 0, 2, 'cold', 'ice'),
  mk('med', 'Meditate', 1, 0.5, 1, '7 h', 'green'),
  mk('garden', 'Garden', 2, 0.3, 1, '2 days', 'teal'),
];

const SIZE_NAMES: Record<Size, string> = { 1: 'Small', 2: 'Medium', 3: 'Large', 4: 'Huge' };
const HOURS = DEFAULT_ACTIVE_HOURS;

interface Pending { fireId: string; kind: StickKind; stickId: number | null }

export default function Campfire3DPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<CampfireWorld | null>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);
  const [names, setNames] = useState(false);
  const [held, setHeld] = useState<StickKind | null>(null);
  const [icons, setIcons] = useState<Partial<Record<StickKind, string>>>({});
  const viewIndex = useRef(0);
  const stageRef = useRef<HTMLElement>(null);
  const [count, setCount] = useState(5);
  const [fires, setFires] = useState<Fire[]>(SAMPLE);
  const [sel, setSel] = useState<string | null>('js');
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [burst, setBurst] = useState<FeedInfo | null>(null);

  const shown = useMemo(() => fires.slice(0, count), [fires, count]);
  const chosen = shown.find((f) => f.area.id === sel);
  const firesRef = useRef(shown);
  firesRef.current = shown;
  const pendingFire = pending ? shown.find((f) => f.area.id === pending.fireId) : undefined;
  const overFire = drag?.overFire ? shown.find((f) => f.area.id === drag.overFire) : undefined;

  const onFrame = useCallback((labels: LabelPos[]) => {
    for (const l of labels) {
      const el = labelRefs.current.get(l.id);
      if (!el) continue;
      el.style.transform = `translate(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px) translate(-50%, -50%) scale(${(1.1 - l.depth * 0.4).toFixed(3)})`;
      el.style.opacity = l.visible ? String(1 - l.depth * 0.4) : '0';
      el.style.zIndex = String(Math.round((1 - l.depth) * 100));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const world = new CampfireWorld(canvas, {
        onFrame,
        onSelectFire: (id) => { if (id) setSel(id); },
        onDrag: (s) => setDrag(s.dragging ? s : null),
        onDrop: (fireId, kind, stickId) => { setHint(false); setPending({ fireId, kind, stickId }); },
        onInteract: () => setHint(false),
        reducedMotion: reduced,
      });
      worldRef.current = world;
      const t = window.setTimeout(() => setIcons(world.renderIcons()), 250);
      (window as unknown as { __world: CampfireWorld }).__world = world;
      return () => { window.clearTimeout(t); world.dispose(); worldRef.current = null; };
    } catch {
      setFailed(true);
    }
  }, [onFrame]);

  useEffect(() => {
    worldRef.current?.setFires(shown.map((f) => ({ id: f.area.id, level: f.level, progress: f.progress, size: f.size, color: f.color })));
  }, [shown]);
  useEffect(() => { worldRef.current?.setSelected(sel); }, [sel]);
  useEffect(() => { worldRef.current?.setShowAllNames(names); }, [names]);

  const cancelPending = () => {
    if (pending?.stickId) worldRef.current?.returnStick(pending.stickId);
    setPending(null);
  };

  const confirm = (entry: FeedEntry & { note: string }) => {
    if (!pending || !pendingFire) return;
    const fire = pendingFire;
    const plan = planFeed(fire.area, { minutes: entry.minutes ?? 5, effort: entry.effort ?? 3, nextAt: entry.nextAt }, Date.now(), HOURS);
    const to = Math.min(3, fire.level + 1) as Level;
    if (pending.stickId) worldRef.current?.consumeStick(pending.stickId); else worldRef.current?.flare(fire.area.id);
    setFires((all) => all.map((f) => (f.area.id === fire.area.id ? { ...f, level: to, progress: 1, cool: formatSpan(plan.holdMinutes) } : f)));
    setPending(null);
    // the stick burns first, then the reward
    window.setTimeout(() => setBurst({
      kind: 'spark', areaId: fire.area.id, name: fire.area.name, from: fire.level, to, fromProgress: fire.progress,
      prevStreak: 3, streak: 4, sparksToday: 3, note: entry.note, minutes: entry.minutes, holdMinutes: plan.holdMinutes,
    }), 1300);
  };

  const feedWithoutWood = () => { if (chosen) setPending({ fireId: chosen.area.id, kind: 'branch', stickId: null }); };

  // Taps on a name tag select its fire (the tags let touches through so dragging works).
  const tap = useRef({ x: 0, y: 0, t: 0 });
  const onStageDown = (e: React.PointerEvent) => { tap.current = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onStageUp = (e: React.PointerEvent) => {
    if (Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > 8 || performance.now() - tap.current.t > 450) return;
    let best: { id: string; z: number } | null = null;
    for (const [id, el] of labelRefs.current) {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const z = Number(el.style.zIndex) || 0;
        if (!best || z > best.z) best = { id, z };
      }
    }
    if (best) setSel(best.id);
  };

  const recolor = (color: PaletteId) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, color } : f))); };
  const resize = (size: Size) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, size } : f))); };
  const shuffle = () => setFires((all) => all.map((f) => { const lv = ((Math.random() * 4) | 0) as Level; return { ...f, level: lv, progress: lv ? 0.2 + Math.random() * 0.75 : 0, cool: lv ? 'a while' : 'cold' }; }));
  const mixSizes = () => setFires((all) => all.map((f) => ({ ...f, size: (1 + ((Math.random() * 4) | 0)) as Size })));
  const VIEWS = [{ azimuth: 0, polar: 0.84 }, { azimuth: 0, polar: 0.3 }, { azimuth: Math.PI / 2, polar: 1.2 }];
  const nextView = () => {
    viewIndex.current = (viewIndex.current + 1) % VIEWS.length;
    worldRef.current?.flyTo(VIEWS[viewIndex.current]);
  };

  // wood from the inventory: pick it up here, carry it into the scene
  const grab = (kind: StickKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    worldRef.current?.beginTrayDrag(kind, e.clientX, e.clientY, e.pointerId);
    setHeld(kind);
    setHint(false);
  };
  const carry = (e: React.PointerEvent) => { worldRef.current?.moveTrayDrag(e.clientX, e.clientY); };
  const release = (drop: boolean) => () => { worldRef.current?.endTrayDrag(drop); setHeld(null); };
  const useWood = (kind: StickKind) => (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && chosen) { e.preventDefault(); setPending({ fireId: chosen.area.id, kind, stickId: null }); }
  };

  const warm = shown.length ? Math.max(...shown.map((f) => f.level)) : 0;
  const stageH = stageRef.current?.clientHeight ?? 480;

  return (
    <div className="camp-page">
      <div className="camp-banner">Design sample, not the real app yet. Drag a piece of wood onto a fire. Drag the ground to look around.</div>
      <TopBar initial="J" streak={4} sparksToday={3} level={warm as HeatLevel} />

      <section ref={stageRef} className="c3-stage" aria-label="Your campfires" onPointerDown={onStageDown} onPointerUp={onStageUp}>
        {failed ? (
          <div className="c3-fail"><b>3D isn't available on this device</b><span>Open the flat version instead: add ?campfire to the address.</span></div>
        ) : (
          <>
            <canvas ref={canvasRef} className="c3-canvas" />
            {shown.map((f) => (
              <div key={f.area.id} ref={(el) => { if (el) labelRefs.current.set(f.area.id, el); else labelRefs.current.delete(f.area.id); }}
                className={`camp-label c3-label c3-fire-label${sel === f.area.id ? ' sel' : ''}${shown.length > 6 ? ' compact' : ''}${drag?.overFire === f.area.id ? ' over' : ''}`}>
                <HeatIcon level={f.level} size={shown.length > 6 ? 14 : 18} />
                <span className="camp-label-text">{f.area.name}</span>
              </div>
            ))}
            {shown.length === 0 && <div className="camp-empty"><b>No fires yet</b><span>Add an area to light its fire.</span></div>}
            {hint && !drag && <div className="c3-hint" aria-hidden="true">Drag wood from below onto a fire</div>}
            <button type="button" className="c3-view" aria-label="Change the view" onClick={nextView}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
            </button>
            {drag && (
              <div className={`c3-chip${overFire ? ' ready' : ''}`} style={{ left: drag.x, top: Math.min(drag.y, stageH - 28) }} aria-hidden="true">
                <b>{STICKS[drag.kind ?? 'branch'].name}</b>
                <span>{overFire ? `Let go to feed ${overFire.area.name}` : `${STICKS[drag.kind ?? 'branch'].blurb}, about ${STICKS[drag.kind ?? 'branch'].minutes} min`}</span>
              </div>
            )}
          </>
        )}
      </section>

      <section className="c3-bag" aria-label="Your wood">
        <div className="c3-bag-head"><h2>Your wood</h2><span>Drag a piece up onto a fire</span></div>
        <div className="c3-slots">
          {(Object.keys(STICKS) as StickKind[]).map((k) => (
            <button key={k} type="button" className={`c3-slot${held === k ? ' held' : ''}`}
              aria-label={`${STICKS[k].name}, about ${STICKS[k].minutes} minutes. Drag onto a fire, or press Enter to feed the selected fire.`}
              onPointerDown={grab(k)} onPointerMove={carry} onPointerUp={release(true)} onPointerCancel={release(false)} onKeyDown={useWood(k)}>
              <span className="c3-slot-img">{icons[k] ? <img src={icons[k]} alt="" draggable={false} /> : <i className={`c3-slot-fallback ${k}`} />}</span>
              <b>{STICKS[k].name}</b>
              <span>{STICKS[k].minutes} min</span>
            </button>
          ))}
        </div>
      </section>

      {chosen ? (
        <section className="camp-card">
          <div className="camp-card-top"><HeatIcon level={chosen.level} size={30} /><div><b>{chosen.area.name}{chosen.main ? ' · main' : ''}</b><span>{LEVEL_NAMES[chosen.level as HeatLevel]} · {chosen.level === 0 ? 'one spark warms it' : `cools in ${chosen.cool}`}</span></div></div>
          <div className="camp-size">
            <span className="camp-size-title">Fire size <b>{SIZE_NAMES[chosen.size]}</b></span>
            <div className="camp-size-row" role="radiogroup" aria-label="Fire size">
              {([1, 2, 3, 4] as Size[]).map((z) => (
                <button key={z} type="button" role="radio" aria-checked={chosen.size === z} aria-label={SIZE_NAMES[z]} className={`camp-size-btn${chosen.size === z ? ' on' : ''}`} onClick={() => resize(z)}>
                  <i style={{ height: 6 + z * 4, width: 12 + z * 6, borderRadius: '50%' }} /><span>{SIZE_NAMES[z]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="camp-size">
            <span className="camp-size-title">Fire colour <b>{PALETTES[chosen.color].name}</b></span>
            <div className="c3-swatches" role="radiogroup" aria-label="Fire colour">
              {PALETTE_IDS.map((id) => (
                <button key={id} type="button" role="radio" aria-checked={chosen.color === id} aria-label={PALETTES[id].name}
                  className={`c3-swatch${chosen.color === id ? ' on' : ''}`} style={{ background: PALETTES[id].swatch }} onClick={() => recolor(id)} />
              ))}
            </div>
          </div>
          <div className="camp-card-actions"><Button variant="white" onClick={feedWithoutWood}>Feed it</Button><Button variant="glass">Open</Button></div>
          <p>Or drag wood from your inventory onto this fire. The kind of wood suggests how long and how hard you worked.</p>
        </section>
      ) : <p className="camp-hint">Tap a fire to see it, or drag wood onto one.</p>}

      <section className="camp-legend" aria-label="What a fire looks like">
        {([3, 2, 1, 0] as Level[]).map((l) => <span key={l}><HeatIcon level={l} size={18} />{LEVEL_NAMES[l as HeatLevel]}</span>)}
      </section>

      <section className="camp-controls">
        <h2>Try it</h2>
        <label><span>Areas: <b>{count}</b></span>
          <input type="range" min={0} max={12} value={count} onChange={(e) => { const n = +e.target.value; setCount(n); if (sel && !fires.slice(0, n).some((f) => f.area.id === sel)) setSel(null); }} />
        </label>
        <button type="button" role="switch" aria-checked={names} className="switch-row" onClick={() => setNames((n) => !n)}>
          <span><span className="switch-title">Show every name</span><span className="note switch-note">Off keeps the scene calm: only the fire you pick shows its name.</span></span>
          <span className={`switch${names ? ' on' : ''}`} aria-hidden="true"><span /></span>
        </button>
        <div className="camp-btns">
          <Button variant="glass" small onClick={shuffle}>Shuffle the heats</Button>
          <Button variant="glass" small onClick={mixSizes}>Mix the sizes</Button>
        </div>
        <ul>
          <li><b>Each area has its own fire</b>, with its own heat and its own colour.</li>
          <li><b>Fire size</b> is yours to set per area.</li>
          <li><b>Wood</b> comes from your inventory under the scene. Let go away from a fire and it goes back.</li>
        </ul>
      </section>

      {pending && pendingFire && (
        <FeedSheet
          area={pendingFire.area} hours={HOURS}
          prefillMinutes={STICKS[pending.kind].minutes} prefillEffort={STICKS[pending.kind].effort}
          onClose={cancelPending}
          onConfirm={(entry) => confirm(entry)}
        />
      )}
      {burst && <FeedBurst info={burst} onDone={() => setBurst(null)} />}
    </div>
  );
}
