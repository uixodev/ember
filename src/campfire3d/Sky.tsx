import { CONSTELLATION_SIZES, litPerConstellation } from './collection';
import { TIERS } from './mastery';

/** A small seeded random, so every constellation always has the same shape. */
function seeded(n: number): () => number {
  let s = (n + 1) * 2654435761 >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 3266489917) >>> 0; return (s >>> 8) / 16777216; };
}

export function constellationPoints(index: number): [number, number][] {
  const n = CONSTELLATION_SIZES[index];
  const r = seeded(index * 7 + 3);
  return Array.from({ length: n }, (_, k) => {
    const x = 10 + (k / (n - 1)) * 80 + (r() - 0.5) * 7;
    const y = 50 + Math.sin(k * 1.35 + index * 1.9) * 26 + (r() - 0.5) * 14;
    return [Math.round(x * 10) / 10, Math.max(10, Math.min(90, Math.round(y * 10) / 10))] as [number, number];
  });
}

/** The night sky: one constellation for each design. A star lights up each time a fire gains a level. */
export function Sky({ levelUps }: { levelUps: number }) {
  const lit = litPerConstellation(levelUps);
  return (
    <div className="sky">
      {CONSTELLATION_SIZES.map((_, i) => {
        const pts = constellationPoints(i);
        const k = lit[i];
        const done = k === pts.length;
        const holo = i === 7;
        return (
          <section key={i} className={`sky-card${k === 0 ? ' dark' : ''}`} aria-label={`${TIERS[i].name}, ${k} of ${pts.length} stars`}>
            <header><b>{TIERS[i].name}</b><span>{k} / {pts.length}</span></header>
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              {pts.slice(0, -1).map((p, j) => (j + 1 < k ? <line key={j} x1={p[0]} y1={p[1]} x2={pts[j + 1][0]} y2={pts[j + 1][1]} stroke={holo ? '#D9C6FF' : '#BDB2FF'} strokeWidth=".6" /> : null))}
              {pts.map((p, j) => (
                j < k
                  ? <g key={j} className={`star${done ? ' done' : ''}`} style={{ animationDelay: `${(j % 5) * 0.4}s` }}><circle cx={p[0]} cy={p[1]} r="3.4" fill={holo ? '#B4F5E4' : '#FFF2B0'} opacity=".22" /><circle cx={p[0]} cy={p[1]} r="1.8" fill="#fff" /></g>
                  : <circle key={j} cx={p[0]} cy={p[1]} r="1.1" fill="#4A4590" />
              ))}
            </svg>
          </section>
        );
      })}
    </div>
  );
}
