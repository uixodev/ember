import { useState } from 'react';
import { CheckBadge, IconTrash } from '../ui/Icons';
import { Button, IconButton } from '../ui/Button';
import { Flame } from '../ui/Flame';
import { ConfirmSheet } from '../ui/Sheets';
import { formatWhen } from '../../engine/format';
import { EFFORT_LABELS, type Effort } from '../../engine/hold';
import { play } from '../../sound';
import { dayKey } from '../../model/streaks';
import type { Area, AreaEvent } from '../../model/types';

const PAGE = 20;

function dayTitle(at: number, now: number): string {
  const k = dayKey(at);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Every logged spark and big session with its note, newest first, grouped by day. Each can be deleted. */
export function EntryList({ events, areas, now, onDelete }: {
  events: AreaEvent[];
  /** When given, each entry also shows its area's name. */
  areas?: Area[];
  now: number;
  onDelete: (id: string) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const [asking, setAsking] = useState<string | null>(null);
  const sorted = [...events].sort((a, b) => b.at - a.at);
  const visible = sorted.slice(0, shown);

  const groups: { key: string; at: number; items: AreaEvent[] }[] = [];
  for (const e of visible) {
    const k = dayKey(e.at);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.items.push(e);
    else groups.push({ key: k, at: e.at, items: [e] });
  }
  const names = new Map((areas ?? []).map((a) => [a.id, a.name]));

  return (
    <>
      {groups.map((g) => (
        <section key={g.key} className="stack" aria-label={dayTitle(g.at, now)}>
          <div className="entry-day"><span>{dayTitle(g.at, now)}</span><span>{g.items.length} {g.items.length === 1 ? 'entry' : 'entries'}</span></div>
          {g.items.map((e) => (
            <div key={e.id} className="entry-row">
              {e.type === 'big' ? <Flame size={26} /> : <CheckBadge size={26} />}
              <div className="entry-main">
                <div className={`entry-note${e.note ? '' : ' plain'}`}>{e.note ?? (e.type === 'big' ? 'Big session' : 'Spark')}</div>
                <div className="entry-meta">
                  {[
                    time(e.at),
                    e.type === 'big' ? 'big session' : 'spark',
                    e.minutes ? `${e.minutes} min` : undefined,
                    e.effort ? `effort: ${EFFORT_LABELS[e.effort as Effort].toLowerCase()}` : undefined,
                    names.get(e.areaId),
                  ].filter(Boolean).join(' · ')}
                </div>
                {e.nextAt && <div className="entry-next">Next time: {formatWhen(e.nextAt, e.at)}</div>}
              </div>
              <IconButton label={`Delete entry from ${time(e.at)}`} onClick={() => setAsking(e.id)}><IconTrash size={18} /></IconButton>
            </div>
          ))}
        </section>
      ))}
      {sorted.length > shown && <Button variant="glass" small className="entry-more" onClick={() => setShown(shown + PAGE)}>Show older entries</Button>}
      {asking && (
        <ConfirmSheet
          title="Delete this entry?" body="It disappears from your history and streaks. The fire keeps the heat it has."
          confirmLabel="Delete it" cancelLabel="Keep it"
          onCancel={() => setAsking(null)} onConfirm={() => { play('delete'); onDelete(asking); setAsking(null); }}
        />
      )}
    </>
  );
}
