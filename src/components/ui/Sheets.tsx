import { useState } from 'react';
import { Button } from './Button';
import { Sheet } from './Sheet';

export function ConfirmSheet({ title, body, confirmLabel, cancelLabel = 'Keep it as it is', onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Sheet label={title} onClose={onCancel}>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="sheet-actions">
        <Button variant="navy" block onClick={onConfirm}>{confirmLabel}</Button>
        <button type="button" className="sheet-link" onClick={onCancel}>{cancelLabel}</button>
      </div>
    </Sheet>
  );
}

const QUICK = [30, 60, 90, 120];

export function BigSessionSheet({ onSubmit, onClose, initialMinutes = 60 }: { onSubmit: (minutes: number, note: string) => void; onClose: () => void; initialMinutes?: number }) {
  const [minutes, setMinutes] = useState(String(initialMinutes));
  const [note, setNote] = useState('');
  const n = Math.round(Number(minutes));
  const valid = Number.isFinite(n) && n >= 1 && n <= 1440;
  return (
    <Sheet label="Log a big session" onClose={onClose}>
      <h2>Log a big session</h2>
      <p>Takes the fire straight to Hot.</p>
      <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(n, note); }}>
        <label className="sheet-label">How long, in minutes
          <input className="sheet-field" type="number" inputMode="numeric" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <div className="chips light" role="group" aria-label="Quick lengths">
          {QUICK.map((q) => (
            <button key={q} type="button" className={`chip${String(q) === minutes ? ' on' : ''}`} onClick={() => setMinutes(String(q))}>{q} min</button>
          ))}
        </div>
        <label className="sheet-label">What did you do? (optional)
          <input className="sheet-field" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="Built the todo list" />
        </label>
        <Button variant="navy" block type="submit" disabled={!valid}>Log big session</Button>
      </form>
    </Sheet>
  );
}
