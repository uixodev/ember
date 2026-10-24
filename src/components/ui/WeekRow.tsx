import type { WeekDay } from '../../model/streaks';
import { Flame } from './Flame';
import { CheckBadge } from './Icons';
import './ui.css';

export function WeekRow({ days }: { days: WeekDay[] }) {
  return (
    <div className="weekrow glass" role="list" aria-label="This week">
      {days.map((d) => (
        <div key={d.label} className={`week-day ${d.status}`} role="listitem" aria-label={`${d.label}: ${d.status}`}>
          <div className="week-mark">
            {d.status === 'kept' && <CheckBadge size={24} />}
            {d.status === 'big' && <Flame size={26} />}
            {d.status === 'missed' && <span className="dot" />}
            {(d.status === 'upcoming' || d.status === 'today') && <span className="dashed" />}
          </div>
          <span className="week-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
