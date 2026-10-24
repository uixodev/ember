import { useState } from 'react';
import { EFFORT_LABELS, type Effort } from '../../engine/hold';

const MINUTE_CHOICES = [1, 5, 10, 20, 30, 60, 90];

/** How long you spent. Chips for the usual lengths plus an exact number. */
export function MinutesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field-block">
      <span className="sheet-label-text">How many minutes?</span>
      <div className="chips light left" role="group" aria-label="Minutes spent">
        {MINUTE_CHOICES.map((m) => (
          <button key={m} type="button" className={`chip${value === String(m) ? ' on' : ''}`} onClick={() => onChange(String(m))}>{m}</button>
        ))}
        <input
          className="sheet-field minutes-input" type="number" inputMode="numeric" min={1} max={1440}
          aria-label="Exact minutes" value={value} onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** How much effort it took, 1 to 5. */
export function EffortField({ value, onChange }: { value: Effort; onChange: (v: Effort) => void }) {
  return (
    <div className="field-block">
      <span className="sheet-label-text">How much effort? <b className="effort-name">{EFFORT_LABELS[value]}</b></span>
      <div className="effort" role="radiogroup" aria-label="Effort">
        {([1, 2, 3, 4, 5] as Effort[]).map((e) => (
          <button
            key={e} type="button" role="radio" aria-checked={value === e} aria-label={`${e}, ${EFFORT_LABELS[e]}`}
            className={`effort-btn${e <= value ? ' on' : ''}${e === value ? ' current' : ''}`} onClick={() => onChange(e)}
          >{e}</button>
        ))}
      </div>
    </div>
  );
}

export type NextChoice = { kind: 'auto' } | { kind: 'at'; at: number; label: string } | { kind: 'pick' };

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Quick next-time choices, relative to now and your active hours. */
export function nextOptions(now: number, startMinutes: number): { label: string; at: number }[] {
  const d = new Date(now);
  const at = (days: number, minutes: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0, minutes).getTime();
  const out: { label: string; at: number }[] = [];
  const tonight = at(0, 20 * 60);
  if (tonight - now > 60 * 60_000) out.push({ label: 'Tonight', at: tonight });
  const morning = startMinutes === 0 ? 9 * 60 : startMinutes;
  out.push({ label: 'Tomorrow', at: at(1, morning) });
  out.push({ label: 'In 3 days', at: now + 3 * 86_400_000 });
  return out;
}

/** When you plan to feed it next. "Auto" lets effort and minutes decide. */
export function NextField({ value, onChange, now, startMinutes, autoText }: {
  value: NextChoice;
  onChange: (v: NextChoice) => void;
  now: number;
  startMinutes: number;
  /** Text for the Auto chip, e.g. "in 1 h 05". */
  autoText: string;
}) {
  const options = nextOptions(now, startMinutes);
  const [pickText, setPickText] = useState(toLocalInput(now + 86_400_000));
  const sameAt = (o: { at: number }) => value.kind === 'at' && value.at === o.at;
  return (
    <div className="field-block">
      <span className="sheet-label-text">Next time</span>
      <div className="chips light left" role="group" aria-label="Next time">
        <button type="button" className={`chip${value.kind === 'auto' ? ' on' : ''}`} onClick={() => onChange({ kind: 'auto' })}>Auto, {autoText}</button>
        {options.map((o) => (
          <button key={o.label} type="button" className={`chip${sameAt(o) ? ' on' : ''}`} onClick={() => onChange({ kind: 'at', at: o.at, label: o.label })}>{o.label}</button>
        ))}
        <button
          type="button" className={`chip${value.kind === 'pick' ? ' on' : ''}`}
          onClick={() => { onChange({ kind: 'pick' }); }}
        >Pick a time</button>
      </div>
      {value.kind === 'pick' && (
        <input
          className="sheet-field" type="datetime-local" aria-label="Pick the next time" value={pickText} min={toLocalInput(now)}
          onChange={(e) => { setPickText(e.target.value); const t = new Date(e.target.value).getTime(); if (Number.isFinite(t)) onChange({ kind: 'at', at: t, label: 'Picked' }); }}
        />
      )}
    </div>
  );
}

/** Resolve the chosen next time into a timestamp, or undefined for Auto. */
export function nextAtOf(choice: NextChoice): number | undefined {
  return choice.kind === 'at' ? choice.at : undefined;
}
