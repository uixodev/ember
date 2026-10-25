import type { Level } from '../../engine/heat';
import { HeatIcon } from './HeatIcon';
import { IconChevron } from './Icons';
import { Pill } from './Pill';
import './ui.css';

export function TopBar({ initial, streak, sparksToday, onStreak, level = 3 }: {
  level?: Level;
  initial: string;
  streak?: number;
  sparksToday: number;
  onStreak?: () => void;
}) {
  return (
    <header className="topbar">
      <div className="avatar" aria-hidden="true">{initial.toUpperCase()}</div>
      {streak !== undefined && <button type="button" className="pill streak-pill" onClick={onStreak} disabled={!onStreak} aria-label={`${streak} day streak, open area`}>
        <HeatIcon level={level} size={18} />
        {streak} {streak === 1 ? 'day' : 'days'}
        <span className="pill-arrow"><IconChevron size={12} /></span>
      </button>}
      <Pill>{sparksToday} {sparksToday === 1 ? 'spark' : 'sparks'}</Pill>
    </header>
  );
}
