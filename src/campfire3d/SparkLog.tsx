import { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { Segmented } from '../components/ui/Tabs';
import { byDay, currentRun, dayKeyOf, monthGrid, shiftMonth } from './calendar';

export interface LogEvent { id: number; areaId: string; areaName: string; swatch: string; at: number; note: string; minutes: number; gain: number; /** Experience it earned (missing on older entries). */ xp?: number }

const clock = (t: number) => new Date(t).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
const startOfDay = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

function dayLabel(t: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(t)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(t).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Every spark from every fire, newest first. Each row can be edited or deleted. */
export function SparkLog({ events, now, onEdit, onDelete, onClose }: {
  events: LogEvent[];
  now: number;
  onEdit: (id: number, patch: { note: string; minutes: number }) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [area, setArea] = useState<string | null>(null);
  const [month, setMonth] = useState(() => ({ year: new Date(now).getFullYear(), month: new Date(now).getMonth() }));
  const [picked, setPicked] = useState<string | null>(null);

  // the areas that have sparks, for the filter
  const areas = [...new Map(events.map((e) => [e.areaId, e])).values()];
  const visible = events.filter((e) => (area === null || e.areaId === area) && (view !== 'calendar' || picked === null || dayKeyOf(e.at) === picked));
  const perDay = byDay(events.filter((e) => area === null || e.areaId === area));
  const run = currentRun(new Set(perDay.keys()), now);
  const sorted = [...visible].sort((a, b) => b.at - a.at);
  const groups: { label: string; rows: LogEvent[] }[] = [];
  // in the calendar the rows only show once a day is picked
  for (const e of view === 'calendar' && picked === null ? [] : sorted) {
    const label = dayLabel(e.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(e); else groups.push({ label, rows: [e] });
  }

  const startEdit = (e: LogEvent) => { setEditing(e.id); setAsking(null); setNote(e.note); setMinutes(String(e.minutes)); };
  const save = (id: number) => {
    const m = Math.round(Number(minutes));
    onEdit(id, { note: note.trim(), minutes: Number.isFinite(m) && m >= 1 ? Math.min(1440, m) : 1 });
    setEditing(null);
  };

  return (
    <Sheet label="Sparks" onClose={onClose}>
      <h2>Your sparks</h2>
      <p>{events.length === 0 ? 'Nothing logged yet. Drop some wood on a fire.' : run > 1 ? `${events.length} in all · ${run} days in a row` : `${events.length} in all`}</p>
      <div className="log-tabs"><Segmented value={view} onChange={(v) => { setView(v); setPicked(null); }} options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]} /></div>
      {areas.length > 1 && (
        <div className="log-filter" role="radiogroup" aria-label="Show sparks of">
          <button type="button" role="radio" aria-checked={area === null} className={`log-chip${area === null ? ' on' : ''}`} onClick={() => setArea(null)}>All</button>
          {areas.map((a) => (
            <button key={a.areaId} type="button" role="radio" aria-checked={area === a.areaId} className={`log-chip${area === a.areaId ? ' on' : ''}`} onClick={() => setArea((cur) => (cur === a.areaId ? null : a.areaId))}>
              <i style={{ background: a.swatch }} aria-hidden="true" />{a.areaName || 'Unnamed'}
            </button>
          ))}
        </div>
      )}
      <div className="sheet-body log-body">
        {view === 'calendar' && (
          <section className="cal" aria-label="Calendar">
            <header className="cal-head">
              <button type="button" className="cal-nav" aria-label="Previous month" onClick={() => { setMonth((m) => shiftMonth(m.year, m.month, -1)); setPicked(null); }}>‹</button>
              <b>{new Date(month.year, month.month, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</b>
              <button type="button" className="cal-nav" aria-label="Next month" onClick={() => { setMonth((m) => shiftMonth(m.year, m.month, 1)); setPicked(null); }}>›</button>
            </header>
            <div className="cal-week" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}</div>
            <div className="cal-grid">
              {monthGrid(month.year, month.month).flat().map((c) => {
                const list = perDay.get(c.key) ?? [];
                const colors = [...new Set(list.map((e) => e.swatch))].slice(0, 3);
                const today = c.key === dayKeyOf(now);
                return (
                  <button key={c.key} type="button" className={`cal-day${c.inMonth ? '' : ' out'}${today ? ' today' : ''}${picked === c.key ? ' on' : ''}${list.length ? ' has' : ''}`}
                    aria-pressed={picked === c.key} aria-label={`${c.key}, ${list.length} ${list.length === 1 ? 'spark' : 'sparks'}`} onClick={() => setPicked((p) => (p === c.key ? null : c.key))}>
                    <span>{c.day}</span>
                    <span className="cal-dots" aria-hidden="true">{colors.map((col) => <i key={col} style={{ background: col }} />)}</span>
                    {list.length > 1 && <em>{list.length}</em>}
                  </button>
                );
              })}
            </div>
            <p className="cal-note">{picked ? `${new Date(picked + 'T12:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}: ${sorted.length} ${sorted.length === 1 ? 'spark' : 'sparks'}` : 'Tap a day to see what you did.'}</p>
          </section>
        )}
        {sorted.length === 0 && view === 'list' && events.length > 0 && <p className="cal-note">No sparks for this area yet.</p>}
        {groups.map((g) => (
          <section key={g.label} className="log-group" aria-label={g.label}>
            <h3>{g.label}</h3>
            {g.rows.map((e) => (
              <article key={e.id} className="log-row">
                <header>
                  <span className="log-dot" style={{ background: e.swatch }} aria-hidden="true" />
                  <b>{e.areaName || 'Unnamed'}</b>
                  <time dateTime={new Date(e.at).toISOString()}>{clock(e.at)}</time>
                </header>
                {editing === e.id ? (
                  <form className="log-edit" onSubmit={(ev) => { ev.preventDefault(); save(e.id); }}>
                    <input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="What did you do?" aria-label="What you did" maxLength={140} />
                    <label>Minutes <input type="number" inputMode="numeric" min={1} max={1440} value={minutes} onChange={(ev) => setMinutes(ev.target.value)} aria-label="Minutes" /></label>
                    <div className="log-actions">
                      <button type="submit" className="log-btn primary">Save</button>
                      <button type="button" className="log-btn" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="log-note">{e.note || 'No note'}</p>
                    <p className="log-meta">{e.minutes} min · +{e.gain}%{e.xp ? ` · +${e.xp} XP` : ''}</p>
                    {asking === e.id ? (
                      <div className="log-actions">
                        <span>Delete this spark?</span>
                        <button type="button" className="log-btn danger" onClick={() => { onDelete(e.id); setAsking(null); }}>Yes, delete</button>
                        <button type="button" className="log-btn" onClick={() => setAsking(null)}>Keep</button>
                      </div>
                    ) : (
                      <div className="log-actions">
                        <button type="button" className="log-btn" onClick={() => startEdit(e)}>Edit</button>
                        <button type="button" className="log-btn" onClick={() => setAsking(e.id)}>Delete</button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>
    </Sheet>
  );
}
