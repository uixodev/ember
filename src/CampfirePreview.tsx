import { useMemo, useState, type CSSProperties } from 'react';
import { HeatIcon } from './components/ui/HeatIcon';
import { TopBar } from './components/ui/TopBar';
import { Button } from './components/ui/Button';
import type { Level } from './engine/heat';
import { LEVEL_NAMES } from './engine/format';
import './components/FireRing/HeatScene.css';
import './campfire.css';

/**
 * DESIGN SAMPLE, not the real app: one campfire in the middle, one log per area.
 * Open with ?campfire. Everything here is made-up data so you can judge the look and the feel.
 */

/** 1 small, 2 medium, 3 large, 4 huge. Bigger logs are thicker and longer, and count more toward the fire. */
type Size = 1 | 2 | 3 | 4;
const SIZE_NAMES: Record<Size, string> = { 1: 'Small', 2: 'Medium', 3: 'Large', 4: 'Huge' };
const SIZE_THICK: Record<Size, number> = { 1: 0.72, 2: 1, 3: 1.32, 4: 1.7 };
const SIZE_LONG: Record<Size, number> = { 1: 0.66, 2: 0.82, 3: 0.97, 4: 1.1 };

interface Log { name: string; level: Level; progress: number; main?: boolean; cool: string; size: Size }

const SAMPLE: Log[] = [
  { name: 'JavaScript', level: 2, progress: 0.55, main: true, cool: '1 h 20', size: 4 },
  { name: 'Cleaning', level: 3, progress: 0.8, cool: '19 h', size: 2 },
  { name: 'Reading', level: 1, progress: 0.2, cool: '5 h', size: 2 },
  { name: 'Drawing', level: 2, progress: 0.6, cool: '4 days', size: 1 },
  { name: 'Guitar', level: 0, progress: 0, cool: 'cold', size: 2 },
  { name: 'Piano', level: 3, progress: 0.9, cool: '2 days', size: 3 },
  { name: 'Running', level: 1, progress: 0.35, cool: '9 h', size: 2 },
  { name: 'Spanish', level: 2, progress: 0.4, cool: '11 h', size: 3 },
  { name: 'Cooking', level: 3, progress: 0.7, cool: '3 days', size: 1 },
  { name: 'Writing', level: 0, progress: 0, cool: 'cold', size: 2 },
  { name: 'Meditate', level: 1, progress: 0.5, cool: '7 h', size: 1 },
  { name: 'Garden', level: 2, progress: 0.3, cool: '2 days', size: 1 },
];

// Stage geometry (viewBox 360 x 380): a flattened ring seen from slightly above.
const W = 360;
const H = 380;
const TOP = 56; // the top of the picture is cropped: flames never reach it
const VH = H - TOP;
const C = { x: 180, y: 208 };
const OUT = { rx: 150, ry: 80 };
const IN = { rx: 24, ry: 12 };
const rad = (d: number) => (d * Math.PI) / 180;

/** Main log at the front (bottom). The others spread evenly around the ring. */
function place(count: number, i: number, size: Size) {
  const theta = i === 0 ? 90 : 90 + (i * 360) / count;
  const c = Math.cos(rad(theta));
  const s = Math.sin(rad(theta));
  const inner = { x: C.x + IN.rx * c, y: C.y + IN.ry * s };
  const f = SIZE_LONG[size];
  const outer = { x: C.x + OUT.rx * f * c, y: C.y + OUT.ry * f * s };
  const len = Math.hypot(outer.x - inner.x, outer.y - inner.y);
  const angle = (Math.atan2(outer.y - inner.y, outer.x - inner.x) * 180) / Math.PI;
  return { theta, c, s, inner, outer, len, angle };
}

/** A tongue of flame standing on y = 0, in local units. */
function flameUp(x: number, h: number, w: number, lean = 0): string {
  const tip = x + lean;
  return `M ${x - w} 0 C ${x - w * 1.15} ${-h * 0.45} ${tip - w * 0.3} ${-h * 0.72} ${tip} ${-h} C ${tip + w * 0.3} ${-h * 0.72} ${x + w * 1.15} ${-h * 0.45} ${x + w} 0 Z`;
}

const style = (v: Record<string, string | number>) => v as CSSProperties;

/** Overall warmth, 0 to 1. Bigger logs count more. */
function warmth(logs: Log[]): number {
  if (!logs.length) return 0;
  let sum = 0;
  let weight = 0;
  for (const l of logs) {
    const w = l.size;
    sum += w * (l.level / 3);
    weight += w;
  }
  return sum / weight;
}

function overallLevel(w: number): Level {
  return w > 0.72 ? 3 : w > 0.42 ? 2 : w > 0.12 ? 1 : 0;
}

function LogShape({ log, p, selected, flare, onPick }: { log: Log; p: ReturnType<typeof place>; selected: boolean; flare: number; onPick: () => void }) {
  const t = 15 * SIZE_THICK[log.size] * (0.82 + 0.32 * (p.s + 1) / 2);
  const cold = log.level === 0;
  const at = (f: number) => ({ x: p.inner.x + (p.outer.x - p.inner.x) * f, y: p.inner.y + (p.outer.y - p.inner.y) * f });
  const burn = at(0.12 + 0.76 * log.progress);
  const glowId = ['', 'glowEmber', 'glowWarm', 'glowHot'][log.level];
  return (
    <g className={`camp-log${selected ? ' sel' : ''}${flare ? ' flare' : ''}`} key={flare} onClick={onPick} role="button" tabIndex={0} aria-label={`${log.name}, ${LEVEL_NAMES[log.level]}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPick(); }}>
      <ellipse cx={p.outer.x + 4} cy={p.outer.y + t * 0.5} rx={t * 1.1} ry={t * 0.3} className="camp-shadow" />
      <g transform={`translate(${p.inner.x} ${p.inner.y}) rotate(${p.angle})`}>
        <rect x={0} y={-t / 2} width={p.len} height={t} rx={t / 2} fill={cold ? 'url(#woodCold)' : 'url(#wood)'} />
        <path d={`M ${t * 0.4} ${-t * 0.18} H ${p.len * 0.8} M ${t * 0.7} ${t * 0.2} H ${p.len * 0.65}`} className="camp-bark" />
        {!cold && <rect x={0} y={-t / 2} width={p.len * 0.78} height={t} rx={t / 2} fill={`url(#${glowId})`} className={`camp-glow g${log.level}`} />}
        {cold && <g className="camp-frost">{[0.2, 0.45, 0.62, 0.8].map((f, i) => <circle key={i} cx={p.len * f} cy={(i % 2 ? 1 : -1) * t * 0.18} r={1.4 + (i % 2)} />)}</g>}
        {log.level === 1 && <path d={`M ${p.len * 0.12} ${-t * 0.1} l 9 3 M ${p.len * 0.3} ${t * 0.15} l 8 -3 M ${p.len * 0.44} ${-t * 0.12} l 7 3`} className="camp-crack" />}
        <ellipse cx={p.len} cy={0} rx={t * 0.26} ry={t * 0.46} className="camp-end" />
        <ellipse cx={p.len} cy={0} rx={t * 0.13} ry={t * 0.24} className="camp-ring" />
      </g>
      {log.level === 3 && (
        <g transform={`translate(${at(0.3).x} ${at(0.3).y - t * 0.2})`}>
          <path d={flameUp(0, 20, 5, 1)} fill="#E8553A" className="fl fl-a" style={style({ '--d': '1.1s', '--dl': '-.2s' })} />
          <path d={flameUp(2, 14, 4, -1)} fill="#FF9A2E" className="fl fl-b" style={style({ '--d': '.9s', '--dl': '-.5s' })} />
          <path d={flameUp(2, 8, 2.6, 0)} fill="#FFD25A" className="fl fl-c" style={style({ '--d': '.8s', '--dl': '-.1s' })} />
        </g>
      )}
      {!cold && <circle cx={burn.x} cy={burn.y - 1} r={2.8} className="camp-burn" />}
      {selected && <ellipse cx={(p.inner.x + p.outer.x) / 2} cy={(p.inner.y + p.outer.y) / 2} rx={p.len / 2 + 8} ry={t * 0.9} className="camp-select" transform={`rotate(${p.angle} ${(p.inner.x + p.outer.x) / 2} ${(p.inner.y + p.outer.y) / 2})`} />}
    </g>
  );
}

function FireCenter({ w, pulse }: { w: number; pulse: number }) {
  const I = Math.max(0, Math.min(1, w));
  const alive = I > 0.08;
  const k = 0.5 + I * 0.8;
  const back: [number, number, number, number][] = [[-44, 70, 14, -3], [-22, 112, 17, 4], [0, 142, 19, -3], [24, 108, 16, 4], [46, 66, 13, -3]];
  const mid: [number, number, number, number][] = [[-32, 54, 12, 3], [-12, 88, 15, -4], [10, 104, 15, 3], [32, 62, 12, -3]];
  const front: [number, number, number, number][] = [[-18, 40, 10, 2], [0, 66, 12, -2], [20, 44, 10, 2]];
  const layer = (rows: typeof back, fill: string, cls: string[], dur: number) =>
    rows.map(([x, h, wd, lean], i) => <path key={`${fill}${i}`} d={flameUp(x, h * k, wd * (0.7 + I * 0.3), lean)} fill={fill} className={`fl fl-${cls[i % 3]}`} style={style({ '--d': `${dur + (i % 3) * 0.2}s`, '--dl': `${-i * 0.27}s` })} />);
  return (
    <g key={pulse} className={pulse ? 'camp-swell' : ''}>
      <ellipse cx={C.x} cy={C.y + 4} rx={70 + I * 100} ry={26 + I * 38} fill={alive ? 'url(#poolHot)' : 'url(#poolCold)'} className={`camp-pool${alive ? '' : ' cold'}`} />
      {alive && (
        <g transform={`translate(${C.x} ${C.y + 6})`}>
          {layer(back, '#E8553A', ['a', 'b', 'c'], 1.5)}
          {layer(mid, '#FF9A2E', ['b', 'c', 'a'], 1.2)}
          {layer(front, '#FFD25A', ['c', 'a', 'b'], 0.95)}
        </g>
      )}
      {!alive && (
        <g className="camp-ash">
          <ellipse cx={C.x} cy={C.y + 4} rx={30} ry={10} fill="#3A1E22" />
          <ellipse cx={C.x} cy={C.y + 2} rx={16} ry={5} fill="#5A2420" />
        </g>
      )}
      {alive && Array.from({ length: Math.round(5 + I * 10) }, (_, i) => (
        <circle key={i} cx={C.x - 36 + ((i * 37) % 72)} cy={C.y - 10} r={1.4 + (i % 3) * 0.6} className={`camp-spark s${i % 3}`}
          style={style({ '--rise': `${70 + ((i * 29) % 90) * k}px`, '--sx': `${((i % 5) - 2) * 7}px`, '--d': `${2 + (i % 5) * 0.4}s`, '--dl': `${-(i * 0.45)}s` })} />
      ))}
    </g>
  );
}

function Snow({ strength }: { strength: number }) {
  const n = Math.round(strength * 26);
  return (
    <div className="camp-snow" style={style({ '--s': '360px' })} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} className="sc-flake" viewBox="0 0 24 24"
          style={style({ '--x': `${4 + ((i * 53) % 90)}%`, '--k': 0.02 + ((i * 7) % 6) * 0.007, '--d': `${7 + ((i * 19) % 9) * 0.9}s`, '--dl': `${-((i * 37) % 13) * 0.7}s`, '--sw': (((i * 23) % 9) - 4) * 0.04, '--o': 0.65 })}>
          <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

export function CampfirePreview() {
  const [count, setCount] = useState(7);
  const [logs, setLogs] = useState<Log[]>(SAMPLE);
  const [sel, setSel] = useState<number | null>(0);
  const [flare, setFlare] = useState<Record<number, number>>({});
  const [pulse, setPulse] = useState(0);

  const shown = useMemo(() => logs.slice(0, count), [logs, count]);
  const w = warmth(shown);
  const level = overallLevel(w);
  const placed = shown.map((l, i) => place(shown.length, i, l.size));
  const needs = shown.filter((l) => l.level <= 1).length;
  const back = placed.map((p, i) => ({ p, i })).filter(({ p }) => p.s < -0.15).sort((a, b) => a.p.s - b.p.s);
  const front = placed.map((p, i) => ({ p, i })).filter(({ p }) => p.s >= -0.15).sort((a, b) => a.p.s - b.p.s);
  const compact = shown.length > 8;
  const chosen = sel !== null ? shown[sel] : undefined;

  const feed = () => {
    if (sel === null) return;
    setLogs((all) => all.map((l, i) => (i === sel ? { ...l, level: Math.min(3, l.level + 1) as Level, progress: 1, cool: 'just fed' } : l)));
    setFlare((f) => ({ ...f, [sel]: (f[sel] ?? 0) + 1 }));
    setPulse((n) => n + 1);
  };
  const resize = (size: Size) => {
    if (sel === null) return;
    setLogs((all) => all.map((l, i) => (i === sel ? { ...l, size } : l)));
    setFlare((f) => ({ ...f, [sel]: (f[sel] ?? 0) + 1 }));
  };
  const mixSizes = () => setLogs((all) => all.map((l) => ({ ...l, size: (1 + ((Math.random() * 4) | 0)) as Size })));
  const shuffle = () => setLogs((all) => all.map((l) => { const lv = ((Math.random() * 4) | 0) as Level; return { ...l, level: lv, progress: lv ? 0.2 + Math.random() * 0.75 : 0, cool: lv ? 'a while' : 'cold' }; }));

  return (
    <div className="camp-page">
      <div className="camp-banner">Design sample, not the real app yet. Tap a log. Use the controls at the bottom to try 0 to 12 areas.</div>
      <TopBar initial="J" streak={4} sparksToday={3} level={level} />

      <section className="camp-stage" aria-label="Campfire">
        <svg viewBox={`0 ${TOP} ${W} ${VH}`} className="camp-svg" role="group" aria-label={`Your fire is ${LEVEL_NAMES[level]}`}>
          <defs>
            <radialGradient id="ground" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#2C2266" /><stop offset=".75" stopColor="#2C2266" /><stop offset="1" stopColor="#2C2266" stopOpacity="0" /></radialGradient>
            <radialGradient id="poolHot" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#B4483A" /><stop offset=".3" stopColor="#8A3A2A" /><stop offset=".6" stopColor="#4A2420" /><stop offset="1" stopColor="#2C2266" stopOpacity="0" /></radialGradient>
            <radialGradient id="poolCold" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#6FA8F0" /><stop offset=".35" stopColor="#3F63C8" /><stop offset=".7" stopColor="#2C3C9A" /><stop offset="1" stopColor="#2C2266" stopOpacity="0" /></radialGradient>
            <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7A4A33" /><stop offset=".5" stopColor="#5A2F26" /><stop offset="1" stopColor="#3A1E22" /></linearGradient>
            <linearGradient id="woodCold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7F90C8" /><stop offset=".5" stopColor="#56649F" /><stop offset="1" stopColor="#3A4378" /></linearGradient>
            <linearGradient id="glowHot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFD25A" /><stop offset=".3" stopColor="#FF9A2E" /><stop offset=".62" stopColor="#E8553A" /><stop offset="1" stopColor="#E8553A" stopOpacity="0" /></linearGradient>
            <linearGradient id="glowWarm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFE98A" /><stop offset=".4" stopColor="#F2B53A" /><stop offset="1" stopColor="#F2B53A" stopOpacity="0" /></linearGradient>
            <linearGradient id="glowEmber" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#B4483A" /><stop offset=".5" stopColor="#8A2E2A" /><stop offset="1" stopColor="#8A2E2A" stopOpacity="0" /></linearGradient>
          </defs>

          <ellipse cx={C.x} cy={C.y + 6} rx={172} ry={104} fill="url(#ground)" />
          {Array.from({ length: 16 }, (_, i) => {
            const a = rad(i * 22.5 + 5);
            return <ellipse key={i} cx={C.x + 62 * Math.cos(a)} cy={C.y + 8 + 28 * Math.sin(a)} rx={9 + (i % 3)} ry={5 + (i % 2)} className={`camp-stone${Math.sin(a) > 0 ? ' near' : ''}`} />;
          })}

          {back.map(({ p, i }) => <LogShape key={i} log={shown[i]} p={p} selected={sel === i} flare={flare[i] ?? 0} onPick={() => setSel(i)} />)}
          <FireCenter w={w} pulse={pulse} />
          {front.map(({ p, i }) => <LogShape key={i} log={shown[i]} p={p} selected={sel === i} flare={flare[i] ?? 0} onPick={() => setSel(i)} />)}
        </svg>

        {level === 0 && shown.length > 0 && <Snow strength={1} />}

        {shown.map((l, i) => {
          const p = placed[i];
          const x = Math.max(46, Math.min(W - 46, p.outer.x + p.c * 30));
          const y = p.outer.y + p.s * 20 + (p.s > 0.3 ? 10 : 0) - TOP;
          return (
            <button key={l.name} type="button" className={`camp-label${sel === i ? ' sel' : ''}${l.main ? ' main' : ''}${compact ? ' compact' : ''}`}
              style={{ left: `${(x / W) * 100}%`, top: `${(y / VH) * 100}%` }} onClick={() => setSel(i)}>
              <HeatIcon level={l.level} size={compact ? 14 : 17} />
              <span className="camp-label-text">{l.name}</span>
            </button>
          );
        })}

        {shown.length === 0 && (
          <div className="camp-empty"><b>Your fire is out</b><span>Add your first log to light it.</span></div>
        )}
        <div className="camp-stack" aria-label="2 resting areas"><i /><i /><i /><span>2 resting</span></div>
      </section>

      <p className="camp-summary">
        <HeatIcon level={level} size={22} /> <b>Your fire is {LEVEL_NAMES[level]}</b>
        <span>{shown.length === 0 ? 'No logs yet' : needs === 0 ? 'Every log is burning well' : `${needs} ${needs === 1 ? 'log needs' : 'logs need'} feeding`}</span>
      </p>

      {chosen ? (
        <section className="camp-card">
          <div className="camp-card-top"><HeatIcon level={chosen.level} size={30} /><div><b>{chosen.name}{chosen.main ? ' · main' : ''}</b><span>{LEVEL_NAMES[chosen.level]} · {chosen.level === 0 ? 'one spark warms it' : `cools in ${chosen.cool}`}</span></div></div>
          <div className="camp-size">
            <span className="camp-size-title">Log size <b>{SIZE_NAMES[chosen.size]}</b></span>
            <div className="camp-size-row" role="radiogroup" aria-label="Log size">
              {([1, 2, 3, 4] as Size[]).map((z) => (
                <button key={z} type="button" role="radio" aria-checked={chosen.size === z} aria-label={SIZE_NAMES[z]}
                  className={`camp-size-btn${chosen.size === z ? ' on' : ''}`} onClick={() => resize(z)}>
                  <i style={{ height: 6 + z * 4 }} />
                  <span>{SIZE_NAMES[z]}</span>
                </button>
              ))}
            </div>
            <span className="camp-size-note">Bigger logs are longer and thicker, and weigh more in your overall fire.</span>
          </div>
          <div className="camp-card-actions"><Button variant="white" onClick={feed} disabled={chosen.level === 3 && chosen.progress === 1}>Feed it</Button><Button variant="glass">Open</Button></div>
          <p>Tap to feed. Hold to start the timer. The little glowing dot on the log is its countdown, creeping toward the fire.</p>
        </section>
      ) : <p className="camp-hint">Tap a log to feed that area.</p>}

      <section className="camp-legend" aria-label="What a log looks like">
        {([3, 2, 1, 0] as Level[]).map((l) => <span key={l}><HeatIcon level={l} size={18} />{LEVEL_NAMES[l]}</span>)}
      </section>

      <section className="camp-controls">
        <h2>Try it</h2>
        <label><span>Areas: <b>{count}</b></span>
          <input type="range" min={0} max={12} value={count} onChange={(e) => { setCount(+e.target.value); if (sel !== null && sel >= +e.target.value) setSel(null); }} />
        </label>
        <div className="camp-btns">
          <Button variant="glass" small onClick={shuffle}>Shuffle the heats</Button>
          <Button variant="glass" small onClick={mixSizes}>Mix the sizes</Button>
        </div>
        <ul>
          <li><b>Centre fire</b> is your overall warmth. Bigger logs count more.</li>
          <li><b>Logs</b> show their own heat: flames, glow, coals, frost.</li>
          <li><b>Size</b> is yours to set per area: small to huge. Main sits at the front.</li>
          <li><b>Resting</b> areas are the small stack at the corner.</li>
        </ul>
      </section>
    </div>
  );
}
