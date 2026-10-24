import { useRef } from 'react';
import fire from '../../assets/fire-3d.png';
import './SparkButton.css';

interface Props {
  size?: number;
  /** Quick tap: log a spark. */
  onTap: () => void;
  /** Held for 500 ms: open the timer. */
  onHold: () => void;
  label?: string;
}

const HOLD_MS = 500;

export function SparkButton({ size = 64, onTap, onHold, label = 'Feed the fire' }: Props) {
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
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
    >
      <img src={fire} alt="" width={size * 0.62} height={size * 0.62} draggable={false} />
    </button>
  );
}
