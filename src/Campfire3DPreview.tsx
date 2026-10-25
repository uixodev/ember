import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './components/ui/Button';
import { HeatIcon } from './components/ui/HeatIcon';
import { TopBar } from './components/ui/TopBar';
import { LEVEL_NAMES } from './engine/format';
import type { Level as HeatLevel } from './engine/heat';
import { Campfire, type LabelPos, type Level, type Size } from './campfire3d/scene';
import './campfire.css';
import './campfire3d.css';

/**
 * DESIGN SAMPLE, not the real app: a 3D campfire you can look around. Open with ?campfire3d.
 * Drag to turn, pinch to zoom, tap a log. All data here is made up.
 */

interface Log { id: string; name: string; level: Level; progress: number; size: Size; main?: boolean; cool: string }

const SAMPLE: Log[] = [
  { id: 'js', name: 'JavaScript', level: 2, progress: 0.55, size: 4, main: true, cool: '1 h 20' },
  { id: 'clean', name: 'Cleaning', level: 3, progress: 0.8, size: 2, cool: '19 h' },
  { id: 'read', name: 'Reading', level: 1, progress: 0.2, size: 2, cool: '5 h' },
  { id: 'draw', name: 'Drawing', level: 2, progress: 0.6, size: 1, cool: '4 days' },
  { id: 'guitar', name: 'Guitar', level: 0, progress: 0, size: 2, cool: 'cold' },
  { id: 'piano', name: 'Piano', level: 3, progress: 0.9, size: 3, cool: '2 days' },
  { id: 'run', name: 'Running', level: 1, progress: 0.35, size: 2, cool: '9 h' },
  { id: 'es', name: 'Spanish', level: 2, progress: 0.4, size: 3, cool: '11 h' },
  { id: 'cook', name: 'Cooking', level: 3, progress: 0.7, size: 1, cool: '3 days' },
  { id: 'write', name: 'Writing', level: 0, progress: 0, size: 2, cool: 'cold' },
  { id: 'med', name: 'Meditate', level: 1, progress: 0.5, size: 1, cool: '7 h' },
  { id: 'garden', name: 'Garden', level: 2, progress: 0.3, size: 1, cool: '2 days' },
];

const SIZE_NAMES: Record<Size, string> = { 1: 'Small', 2: 'Medium', 3: 'Large', 4: 'Huge' };

function warmthOf(logs: Log[]): number {
  if (!logs.length) return 0;
  let sum = 0;
  let weight = 0;
  for (const l of logs) { sum += l.size * (l.level / 3); weight += l.size; }
  return sum / weight;
}
const overallLevel = (w: number): Level => (w > 0.72 ? 3 : w > 0.42 ? 2 : w > 0.12 ? 1 : 0);

export default function Campfire3DPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireRef = useRef<Campfire | null>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);
  const [spin, setSpin] = useState(true);
  const [count, setCount] = useState(7);
  const [logs, setLogs] = useState<Log[]>(SAMPLE);
  const [sel, setSel] = useState<string | null>('js');

  const shown = useMemo(() => logs.slice(0, count), [logs, count]);
  const w = warmthOf(shown);
  const level = overallLevel(w);
  const needs = shown.filter((l) => l.level <= 1).length;
  const chosen = shown.find((l) => l.id === sel);

  // A tap that lands on a name tag selects that log (the tags themselves ignore touches so dragging works).
  const tap = useRef({ x: 0, y: 0, t: 0 });
  const onStageDown = (e: React.PointerEvent) => { tap.current = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onStageUp = (e: React.PointerEvent) => {
    if (Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > 8 || performance.now() - tap.current.t > 450) return;
    let best: { id: string; z: number } | null = null;
    for (const [id, el] of labelRefs.current) {
      if (id === '__resting') continue;
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const z = Number(el.style.zIndex) || 0;
        if (!best || z > best.z) best = { id, z };
      }
    }
    if (best) setSel(best.id);
  };

  const onFrame = useCallback((labels: LabelPos[]) => {
    for (const l of labels) {
      const el = labelRefs.current.get(l.id);
      if (!el) continue;
      el.style.transform = `translate(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px) translate(-50%, -50%) scale(${(1.08 - l.depth * 0.34).toFixed(3)})`;
      el.style.opacity = l.visible ? String(1 - l.depth * 0.45) : '0';
      el.style.zIndex = String(Math.round((1 - l.depth) * 100));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const fire = new Campfire(canvas, { onPick: (id) => setSel(id), onFrame, onInteract: () => { setHint(false); setSpin(false); }, reducedMotion: reduced });
      fireRef.current = fire;
      (window as unknown as { __camp: Campfire }).__camp = fire;
      return () => { fire.dispose(); fireRef.current = null; };
    } catch {
      setFailed(true);
    }
  }, [onFrame]);

  useEffect(() => {
    fireRef.current?.setLogs(shown.map((l) => ({ id: l.id, level: l.level, progress: l.progress, size: l.size })));
    fireRef.current?.setWarmth(w);
  }, [shown, w]);
  useEffect(() => { fireRef.current?.setSelected(sel); }, [sel]);
  useEffect(() => { fireRef.current?.setAutoRotate(spin); }, [spin]);

  const feed = () => {
    if (!chosen) return;
    setLogs((all) => all.map((l) => (l.id === chosen.id ? { ...l, level: Math.min(3, l.level + 1) as Level, progress: 1, cool: l.size >= 3 ? '2 days' : '9 h' } : l)));
    fireRef.current?.feed(chosen.id);
  };
  const resize = (size: Size) => { if (chosen) setLogs((all) => all.map((l) => (l.id === chosen.id ? { ...l, size } : l))); };
  const shuffle = () => setLogs((all) => all.map((l) => { const lv = ((Math.random() * 4) | 0) as Level; return { ...l, level: lv, progress: lv ? 0.2 + Math.random() * 0.75 : 0, cool: lv ? 'a while' : 'cold' }; }));
  const mixSizes = () => setLogs((all) => all.map((l) => ({ ...l, size: (1 + ((Math.random() * 4) | 0)) as Size })));
  const view = (v: 'front' | 'top' | 'side') => {
    setSpin(false);
    setHint(false);
    fireRef.current?.flyTo(v === 'front' ? { azimuth: 0, polar: 1.12 } : v === 'top' ? { azimuth: 0, polar: 0.3 } : { azimuth: Math.PI / 2, polar: 1.3 });
  };

  return (
    <div className="camp-page">
      <div className="camp-banner">Design sample, not the real app yet. Drag to look around, pinch to zoom, tap a log.</div>
      <TopBar initial="J" streak={4} sparksToday={3} level={level as HeatLevel} />

      <section className="c3-stage" aria-label="3D campfire" onPointerDown={onStageDown} onPointerUp={onStageUp}>
        {failed ? (
          <div className="c3-fail"><b>3D isn't available on this device</b><span>Open the flat version instead: add ?campfire to the address.</span></div>
        ) : (
          <>
            <canvas ref={canvasRef} className="c3-canvas" />
            {shown.map((l) => (
              <button key={l.id} type="button" ref={(el) => { if (el) labelRefs.current.set(l.id, el); else labelRefs.current.delete(l.id); }}
                className={`camp-label c3-label${sel === l.id ? ' sel' : ''}${l.main ? ' main' : ''}${shown.length > 8 ? ' compact' : ''}`}
                onClick={() => setSel(l.id)}>
                <HeatIcon level={l.level} size={shown.length > 8 ? 14 : 17} />
                <span className="camp-label-text">{l.name}</span>
              </button>
            ))}
            <button type="button" className="camp-label c3-label compact c3-rest" tabIndex={-1} aria-label="2 resting areas"
              ref={(el) => { if (el) labelRefs.current.set('__resting', el); else labelRefs.current.delete('__resting'); }}>2 resting</button>
            {shown.length === 0 && <div className="camp-empty"><b>Your fire is out</b><span>Add your first log to light it.</span></div>}
            {hint && <div className="c3-hint" aria-hidden="true">Drag to look around · pinch to zoom</div>}
          </>
        )}
      </section>

      <div className="c3-views" role="group" aria-label="Camera">
        <button type="button" className="chip" onClick={() => view('front')}>Front</button>
        <button type="button" className="chip" onClick={() => view('side')}>Side</button>
        <button type="button" className="chip" onClick={() => view('top')}>From above</button>
        <button type="button" className={`chip${spin ? ' on' : ''}`} aria-pressed={spin} onClick={() => setSpin((s) => !s)}>Drift</button>
      </div>

      <p className="camp-summary">
        <HeatIcon level={level as HeatLevel} size={22} /> <b>Your fire is {LEVEL_NAMES[level as HeatLevel]}</b>
        <span>{shown.length === 0 ? 'No logs yet' : needs === 0 ? 'Every log is burning well' : `${needs} ${needs === 1 ? 'log needs' : 'logs need'} feeding`}</span>
      </p>

      {chosen ? (
        <section className="camp-card">
          <div className="camp-card-top"><HeatIcon level={chosen.level} size={30} /><div><b>{chosen.name}{chosen.main ? ' · main' : ''}</b><span>{LEVEL_NAMES[chosen.level]} · {chosen.level === 0 ? 'one spark warms it' : `cools in ${chosen.cool}`}</span></div></div>
          <div className="camp-size">
            <span className="camp-size-title">Log size <b>{SIZE_NAMES[chosen.size]}</b></span>
            <div className="camp-size-row" role="radiogroup" aria-label="Log size">
              {([1, 2, 3, 4] as Size[]).map((z) => (
                <button key={z} type="button" role="radio" aria-checked={chosen.size === z} aria-label={SIZE_NAMES[z]} className={`camp-size-btn${chosen.size === z ? ' on' : ''}`} onClick={() => resize(z)}>
                  <i style={{ height: 6 + z * 4 }} /><span>{SIZE_NAMES[z]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="camp-card-actions"><Button variant="white" onClick={feed}>Feed it</Button><Button variant="glass">Open</Button></div>
        </section>
      ) : <p className="camp-hint">Tap a log to feed that area.</p>}

      <section className="camp-legend" aria-label="What a log looks like">
        {([3, 2, 1, 0] as Level[]).map((l) => <span key={l}><HeatIcon level={l} size={18} />{LEVEL_NAMES[l as HeatLevel]}</span>)}
      </section>

      <section className="camp-controls">
        <h2>Try it</h2>
        <label><span>Areas: <b>{count}</b></span>
          <input type="range" min={0} max={12} value={count} onChange={(e) => { const n = +e.target.value; setCount(n); if (sel && !logs.slice(0, n).some((l) => l.id === sel)) setSel(null); }} />
        </label>
        <div className="camp-btns">
          <Button variant="glass" small onClick={shuffle}>Shuffle the heats</Button>
          <Button variant="glass" small onClick={mixSizes}>Mix the sizes</Button>
        </div>
        <ul>
          <li><b>Centre fire</b> grows with your overall warmth. Bigger logs count more.</li>
          <li><b>Logs</b> show their own heat: flames, glow, glowing cracks, frost.</li>
          <li><b>The glowing dot</b> on a log is its countdown, creeping toward the fire.</li>
          <li><b>The small stack</b> in the back corner is your resting areas.</li>
        </ul>
      </section>
    </div>
  );
}
