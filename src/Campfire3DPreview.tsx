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
import { STICKS, type StickKind } from './campfire3d/sticks';
import type { FeedEntry, FeedInfo } from './store/store';
import './campfire.css';
import './campfire3d.css';

/**
 * DESIGN SAMPLE, not the real app: every area is its own campfire. Drag a piece of wood onto a fire,
 * say what you did, log it, and watch it burn. Open with ?campfire3d. All data here is made up.
 */

interface Fire { area: Area; level: Level; progress: number; size: Size; main?: boolean; cool: string }

const mk = (id: string, name: string, level: Level, progress: number, size: Size, cool: string, main = false): Fire => ({
  area: { id, name, place: main ? 'main' : 'side', coolingMinutes: main ? 150 : 1440, sparks: [`Spend 5 minutes on ${name}`], level, levelSince: 0, createdAt: 0 },
  level, progress, size, main, cool,
});

const SAMPLE: Fire[] = [
  mk('js', 'JavaScript', 2, 0.55, 4, '1 h 20', true),
  mk('clean', 'Cleaning', 3, 0.8, 2, '19 h'),
  mk('read', 'Reading', 1, 0.2, 2, '5 h'),
  mk('draw', 'Drawing', 2, 0.6, 1, '4 days'),
  mk('guitar', 'Guitar', 0, 0, 2, 'cold'),
  mk('piano', 'Piano', 3, 0.9, 3, '2 days'),
  mk('run', 'Running', 1, 0.35, 2, '9 h'),
  mk('es', 'Spanish', 2, 0.4, 3, '11 h'),
  mk('cook', 'Cooking', 3, 0.7, 1, '3 days'),
  mk('write', 'Writing', 0, 0, 2, 'cold'),
  mk('med', 'Meditate', 1, 0.5, 1, '7 h'),
  mk('garden', 'Garden', 2, 0.3, 1, '2 days'),
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
  const [spin, setSpin] = useState(false);
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
        onInteract: () => setSpin(false),
        reducedMotion: reduced,
      });
      worldRef.current = world;
      (window as unknown as { __world: CampfireWorld }).__world = world;
      return () => { world.dispose(); worldRef.current = null; };
    } catch {
      setFailed(true);
    }
  }, [onFrame]);

  useEffect(() => {
    worldRef.current?.setFires(shown.map((f) => ({ id: f.area.id, level: f.level, progress: f.progress, size: f.size })));
  }, [shown]);
  useEffect(() => { worldRef.current?.setSelected(sel); }, [sel]);
  useEffect(() => { worldRef.current?.setAutoRotate(spin); }, [spin]);

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

  const resize = (size: Size) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, size } : f))); };
  const shuffle = () => setFires((all) => all.map((f) => { const lv = ((Math.random() * 4) | 0) as Level; return { ...f, level: lv, progress: lv ? 0.2 + Math.random() * 0.75 : 0, cool: lv ? 'a while' : 'cold' }; }));
  const mixSizes = () => setFires((all) => all.map((f) => ({ ...f, size: (1 + ((Math.random() * 4) | 0)) as Size })));
  const view = (v: 'front' | 'top' | 'side') => {
    setSpin(false);
    worldRef.current?.flyTo(v === 'front' ? { azimuth: 0, polar: 0.84 } : v === 'top' ? { azimuth: 0, polar: 0.32 } : { azimuth: Math.PI / 2, polar: 1.25 });
  };

  const warm = shown.length ? Math.max(...shown.map((f) => f.level)) : 0;

  return (
    <div className="camp-page">
      <div className="camp-banner">Design sample, not the real app yet. Drag a piece of wood onto a fire. Drag the ground to look around.</div>
      <TopBar initial="J" streak={4} sparksToday={3} level={warm as HeatLevel} />

      <section className="c3-stage" aria-label="Your campfires" onPointerDown={onStageDown} onPointerUp={onStageUp}>
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
            {hint && !drag && <div className="c3-hint" aria-hidden="true">Drag a stick onto a fire</div>}
            {drag && (
              <div className={`c3-chip${overFire ? ' ready' : ''}`} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
                <b>{STICKS[drag.kind ?? 'branch'].name}</b>
                <span>{overFire ? `Let go to feed ${overFire.area.name}` : `${STICKS[drag.kind ?? 'branch'].blurb}, about ${STICKS[drag.kind ?? 'branch'].minutes} min`}</span>
              </div>
            )}
          </>
        )}
      </section>

      <div className="c3-views" role="group" aria-label="Camera">
        <button type="button" className="chip" onClick={() => view('front')}>Front</button>
        <button type="button" className="chip" onClick={() => view('side')}>Side</button>
        <button type="button" className="chip" onClick={() => view('top')}>From above</button>
        <button type="button" className={`chip${spin ? ' on' : ''}`} aria-pressed={spin} onClick={() => setSpin((s) => !s)}>Drift</button>
      </div>

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
          <div className="camp-card-actions"><Button variant="white" onClick={feedWithoutWood}>Feed it</Button><Button variant="glass">Open</Button></div>
          <p>Or drag wood onto this fire. The kind of wood suggests how long and how hard you worked.</p>
        </section>
      ) : <p className="camp-hint">Tap a fire to see it, or drag wood onto one.</p>}

      <section className="c3-wood" aria-label="The kinds of wood">
        <h2>The wood</h2>
        <ul>
          {(Object.keys(STICKS) as StickKind[]).map((k) => (
            <li key={k}><b>{STICKS[k].name}</b><span>{STICKS[k].blurb} · about {STICKS[k].minutes} min, effort {STICKS[k].effort} of 5</span></li>
          ))}
        </ul>
      </section>

      <section className="camp-legend" aria-label="What a fire looks like">
        {([3, 2, 1, 0] as Level[]).map((l) => <span key={l}><HeatIcon level={l} size={18} />{LEVEL_NAMES[l as HeatLevel]}</span>)}
      </section>

      <section className="camp-controls">
        <h2>Try it</h2>
        <label><span>Areas: <b>{count}</b></span>
          <input type="range" min={0} max={12} value={count} onChange={(e) => { const n = +e.target.value; setCount(n); if (sel && !fires.slice(0, n).some((f) => f.area.id === sel)) setSel(null); }} />
        </label>
        <div className="camp-btns">
          <Button variant="glass" small onClick={shuffle}>Shuffle the heats</Button>
          <Button variant="glass" small onClick={mixSizes}>Mix the sizes</Button>
        </div>
        <ul>
          <li><b>Each area has its own fire</b>, with its own heat: roaring, steady, glowing coals, or cold with snow.</li>
          <li><b>Fire size</b> is yours to set per area.</li>
          <li><b>Wood</b> lies on the ground in front. A burned stick is replaced by a new one.</li>
          <li><b>Let go away from a fire</b> and the wood goes back where it was.</li>
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
