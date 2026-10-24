import type { CSSProperties } from 'react';
import type { Level } from '../../engine/heat';
import './HeatScene.css';

/** Fixed pseudo-random numbers so a scene looks the same on every visit. */
const r = (i: number, a: number, m: number) => ((i * a + 7) % m) / m;

/** A tongue of flame with its base on the bottom edge (viewBox 0 0 100 100). */
function flame(x: number, h: number, w: number, lean = 0): string {
  const tip = x + lean;
  return `M ${x - w} 100 C ${x - w * 1.15} ${100 - h * 0.45} ${tip - w * 0.3} ${100 - h * 0.72} ${tip} ${100 - h} `
    + `C ${tip + w * 0.3} ${100 - h * 0.72} ${x + w * 1.15} ${100 - h * 0.45} ${x + w} 100 Z`;
}

const FLAMES = [
  // back row: deep red, tallest
  ...[[16, 30, 9, -2], [31, 42, 10, 3], [46, 50, 11, -2], [61, 44, 10, 3], [76, 34, 9, -3], [88, 22, 7, 2]]
    .map(([x, h, w, l], i) => ({ d: flame(x, h, w, l), fill: '#E8553A', cls: ['a', 'b', 'c'][i % 3], dur: 1.5 + (i % 4) * 0.22, dl: -i * 0.31 })),
  // middle row: orange
  ...[[24, 26, 8, 2], [38, 36, 9, -3], [52, 42, 9, 2], [66, 34, 9, -2], [80, 24, 7, 3]]
    .map(([x, h, w, l], i) => ({ d: flame(x, h, w, l), fill: '#FF9A2E', cls: ['b', 'c', 'a'][i % 3], dur: 1.2 + (i % 3) * 0.25, dl: -i * 0.27 })),
  // front row: yellow, smallest
  ...[[32, 17, 6, 1], [45, 25, 7, -2], [57, 27, 7, 2], [69, 18, 6, -1]]
    .map(([x, h, w, l], i) => ({ d: flame(x, h, w, l), fill: '#FFD25A', cls: ['c', 'a', 'b'][i % 3], dur: 0.95 + (i % 3) * 0.2, dl: -i * 0.23 })),
];

const style = (vars: Record<string, string | number>) => vars as CSSProperties;

function Hot() {
  return (
    <>
      <div className="sc-hot-glow" />
      <svg className="sc-flames" viewBox="0 0 100 100" preserveAspectRatio="none">
        {FLAMES.map((f, i) => (
          <path key={i} d={f.d} fill={f.fill} className={`fl fl-${f.cls}`} style={style({ '--d': `${f.dur}s`, '--dl': `${f.dl}s` })} />
        ))}
      </svg>
      {Array.from({ length: 11 }, (_, i) => (
        <span
          key={i} className={`sc-spark sp${i % 3}`}
          style={style({ '--x': `${22 + r(i, 37, 56) * 56}%`, '--k': 0.012 + r(i, 11, 5) * 0.01, '--d': `${2.4 + r(i, 17, 9) * 0.35}s`, '--dl': `${-r(i, 29, 10) * 3}s`, '--sw': (r(i, 13, 7) - 0.5) * 0.16 })}
        />
      ))}
    </>
  );
}

function Warm() {
  return (
    <>
      <div className="sc-warm-rays" />
      <div className="sc-warm-glow" />
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i} className="sc-mote"
          style={style({ '--x': `${10 + r(i, 41, 80) * 80}%`, '--k': 0.01 + r(i, 7, 6) * 0.007, '--d': `${6 + r(i, 19, 8) * 0.9}s`, '--dl': `${-r(i, 23, 11) * 6}s`, '--sw': (r(i, 5, 7) - 0.5) * 0.1 })}
        />
      ))}
    </>
  );
}

const COALS = [
  [20, 80, 0.1], [29, 88, 0.08], [38, 78, 0.12], [47, 90, 0.09], [55, 76, 0.13], [64, 87, 0.09], [73, 79, 0.11], [81, 86, 0.08],
  [33, 69, 0.07], [44, 68, 0.08], [59, 67, 0.07], [70, 70, 0.07], [26, 72, 0.06], [77, 72, 0.06],
];

function Embers() {
  return (
    <>
      <div className="sc-ember-bed" />
      {COALS.map(([x, y, k], i) => (
        <span
          key={i} className="sc-coal"
          style={style({ '--x': `${x}%`, '--y': `${y}%`, '--k': k, '--d': `${2.6 + (i % 4) * 0.7}s`, '--dl': `${-i * 0.6}s` })}
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i} className="sc-ash"
          style={style({ '--x': `${22 + r(i, 31, 44) * 50}%`, '--k': 0.009 + r(i, 7, 4) * 0.006, '--d': `${5 + r(i, 13, 6) * 0.8}s`, '--dl': `${-r(i, 17, 9) * 7}s`, '--sw': (r(i, 11, 5) - 0.5) * 0.14 })}
        />
      ))}
    </>
  );
}

function Cold() {
  return (
    <>
      <div className="sc-cold-glow" />
      {Array.from({ length: 20 }, (_, i) => (
        <svg
          key={i} className="sc-flake" viewBox="0 0 24 24" aria-hidden="true"
          style={style({
            '--x': `${4 + r(i, 53, 90) * 88}%`, '--k': 0.04 + r(i, 7, 6) * 0.022, '--d': `${7 + r(i, 19, 9) * 0.9}s`,
            '--dl': `${-r(i, 37, 13) * 9}s`, '--sw': (r(i, 23, 9) - 0.5) * 0.16, '--o': 0.7 + r(i, 3, 5) * 0.08,
          })}
        >
          <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M12 6l-2.2-2.2M12 6l2.2-2.2M12 18l-2.2 2.2M12 18l2.2 2.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ))}
    </>
  );
}

/** Slow-moving scene inside the big fire circle: flames, warm light, coals or snow. Decoration only. */
export function HeatScene({ level, size }: { level: Level; size: number }) {
  return (
    <div className={`ring-scene scene-${level}`} style={style({ '--s': `${size}px` })} aria-hidden="true">
      {level === 3 && <Hot />}
      {level === 2 && <Warm />}
      {level === 1 && <Embers />}
      {level === 0 && <Cold />}
    </div>
  );
}
