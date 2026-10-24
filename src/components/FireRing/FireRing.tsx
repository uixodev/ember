import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Level } from '../../engine/heat';
import './FireRing.css';

export interface FireRingLabel {
  name?: string;
  title?: string;
  sub?: string;
}

interface Props {
  level: Level;
  /** Diameter of the core in px. The rim sits outside it. */
  size: number;
  /** 1 = full rim, 0 = empty. Ignored when cold. */
  progress: number;
  paused?: boolean;
  /** Last 15 minutes before a drop: rim turns sun yellow. */
  urgent?: boolean;
  label?: FireRingLabel;
  /** Thin rim for small cards. */
  thin?: boolean;
  /** Change this value to play the feed flare (rim glow, core swell). */
  flareKey?: number | string;
  /** Slot centred on the bottom of the rim, for the spark button. */
  action?: ReactNode;
  /**
   * How the rim drains. "split": from 12 o'clock down both sides, last piece ends at the
   * bottom next to the spark button. "clockwise": a single arc, from 12 o'clock clockwise.
   */
  drain?: 'split' | 'clockwise';
}

const CLASS: Record<Level, string> = { 3: 'hot', 2: 'warm', 1: 'embers', 0: 'cold' };

function Moon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Paused outside active hours" role="img">
      <path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.5 9.5 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8z" />
    </svg>
  );
}

export function FireRing({
  level, size, progress, paused = false, urgent = false, label, thin = false,
  flareKey, action, drain = 'split',
}: Props) {
  const rimW = size * (thin ? 0.025 : 0.05);
  const box = size + rimW * 2;
  const r = size / 2 + rimW / 2;
  const c = box / 2;
  const cold = level === 0;
  const p = cold ? 0 : Math.max(0, Math.min(1, progress));

  // When the level changes, the old colour fades out over the new one instead of cutting.
  const [fading, setFading] = useState<Level | null>(null);
  const lastLevel = useRef(level);
  useEffect(() => {
    if (lastLevel.current === level) return;
    setFading(lastLevel.current);
    lastLevel.current = level;
    const t = window.setTimeout(() => setFading(null), 550);
    return () => window.clearTimeout(t);
  }, [level]);

  // Replay the flare when flareKey changes (not on first render).
  const [flare, setFlare] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setFlare(true);
  }, [flareKey]);

  const top = `${c} ${c - r}`;
  const bottom = `${c} ${c + r}`;
  const halfRight = `M ${bottom} A ${r} ${r} 0 0 0 ${top}`; // bottom -> right -> top
  const halfLeft = `M ${bottom} A ${r} ${r} 0 0 1 ${top}`;  // bottom -> left -> top
  const full = `M ${top} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${top}`; // clockwise from 12

  const arc = (d: string) => (
    <path
      d={d} pathLength={100} fill="none" strokeWidth={rimW} strokeLinecap="butt"
      className="ring-arc"
      strokeDasharray={`${p * 100} 100`}
      style={{ display: p > 0 ? undefined : 'none' }}
    />
  );

  const fs = (k: number) => `${size * k}px`;

  return (
    <div
      className={`ring ring-${CLASS[level]}${size >= 120 ? ' ring-big' : ''}${urgent && !cold ? ' ring-urgent' : ''}${paused ? ' ring-paused' : ''}${flare ? ' ring-flare' : ''}`}
      style={{ width: size, height: size }}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setFlare(false); }}
    >
      <div className={`ring-core core-${CLASS[level]}`} />
      {fading !== null && <div className={`ring-core ring-core-prev core-${CLASS[fading]}`} />}
      <svg className="ring-rim" width={box} height={box} viewBox={`0 0 ${box} ${box}`}
        style={{ left: -rimW, top: -rimW }} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={rimW} className="ring-track" />
        {cold ? null : drain === 'split' ? <>{arc(halfRight)}{arc(halfLeft)}</> : arc(full)}
      </svg>
      {label && (
        <div className="ring-label">
          {label.name && (
            <div className="ring-name" style={{ fontSize: fs(0.055) }}>{label.name}</div>
          )}
          {label.title && (
            <div className="ring-title" style={{ fontSize: fs(0.228) }}>{label.title}</div>
          )}
          {(label.sub || paused) && (
            <div className="ring-sub" style={{ fontSize: fs(0.052) }}>
              {paused && <Moon size={size * 0.06} />}
              {label.sub}
            </div>
          )}
        </div>
      )}
      {action && <div className="ring-action" style={{ top: size + rimW / 2 }}>{action}</div>}
    </div>
  );
}
