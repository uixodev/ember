import { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';

export interface LogEvent { id: number; areaId: string; areaName: string; swatch: string; at: number; note: string; minutes: number; gain: number }

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

  const sorted = [...events].sort((a, b) => b.at - a.at);
  const groups: { label: string; rows: LogEvent[] }[] = [];
  for (const e of sorted) {
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
      <p>{events.length === 0 ? 'Nothing logged yet. Drop some wood on a fire.' : 'Everything you fed, from every fire.'}</p>
      <div className="sheet-body log-body">
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
                    <p className="log-meta">{e.minutes} min · +{e.gain}%</p>
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
