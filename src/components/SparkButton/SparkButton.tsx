import { useRef } from 'react';
import type { Level } from '../../engine/heat';
import { HeatIcon } from '../ui/HeatIcon';
import './SparkButton.css';

interface Props {
  size?: number;
  /** Quick tap: log a spark. */
  onTap: () => void;
  /** Held for 500 ms: open the timer. */
  onHold: () => void;
  label?: string;
  /** Heat of the area, picks the picture. */
  level?: Level;
}

const HOLD_MS = 500;

export function SparkButton({ size = 64, onTap, onHold, label = 'Feed the fire', level = 3 }: Props) {
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);

  const clear = () => window.clearTimeout(timer.current);
  const down = () => {
    held.current = false;
    clear();
    timer.current = window.setTimeout(() => { held.current = true; onHold(); }, HOLD_MS);
  };
  const up = () => { clear(); if (!held.current) onTap(); held.current = false; };

  return (
    <button
      type="button"
      className="spark-btn"
      style={{ width: Math.max(size, 44), height: Math.max(size, 44) }}
      aria-label={`${label}. Tap for a spark, hold for a timer.`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={() => { clear(); held.current = false; }}
      onPointerCancel={clear}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
    >
      <HeatIcon level={level} size={size * 0.62} />
    </button>
  );
}
