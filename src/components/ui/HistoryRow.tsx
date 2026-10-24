import { CheckBadge } from './Icons';
import './ui.css';

export function HistoryRow({ count, text, date, empty }: { count: number; text: string; date: string; empty?: boolean }) {
  return (
    <div className={`history-row${empty ? ' empty' : ''}`}>
      {empty ? <span className="history-none" /> : <CheckBadge size={26} />}
      <span className="history-count">{count}</span>
      <span className="history-text">{text}</span>
      <span className="history-date">{date}</span>
    </div>
  );
}
