import { useState } from 'react';
import type { Place } from '../../engine/heat';
import { play } from '../../sound';
import {
  canStep, coolingCaption, coolingValue, customHint, customToMinutes, SIDE_PRESETS, stepCooling, unitsFor,
} from '../../model/cooling';
import { Button } from './Button';
import { Stepper } from './Stepper';

/** Cooling speed for an area: "+" makes it cool slower, "-" faster. Presets and an exact time too. */
export function CoolingStepper({ place, minutes, onChange }: { place: Exclude<Place, 'archive'>; minutes: number; onChange: (m: number) => void }) {
  const units = unitsFor(place);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState(units[units.length - 1].value);
  const [error, setError] = useState(false);

  const apply = () => {
    const u = units.find((x) => x.value === unit) ?? units[0];
    const m = customToMinutes(place, Number(amount.replace(',', '.')), u);
    if (m === null) { setError(true); play('error'); return; }
    setError(false);
    setAmount('');
    onChange(m);
  };

  return (
    <div className="stack">
      <Stepper
        value={coolingValue(place, minutes)} caption={coolingCaption(place)}
        minusDisabled={!canStep(place, minutes, -1)} plusDisabled={!canStep(place, minutes, 1)}
        onMinus={() => onChange(stepCooling(place, minutes, -1))} onPlus={() => onChange(stepCooling(place, minutes, 1))}
      />
      {place === 'side' && (
        <div className="chips" role="group" aria-label="Cooling presets">
          {SIDE_PRESETS.map((p) => (
            <button key={p.label} type="button" className={`chip${p.minutes === minutes ? ' on' : ''}`} onClick={() => onChange(p.minutes)}>{p.label}</button>
          ))}
        </div>
      )}
      <details className="custom-cooling">
        <summary>Set an exact time</summary>
        <form className="custom-row" onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <input
            className="field" inputMode="decimal" placeholder="e.g. 36" aria-label="Amount" value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(false); }}
          />
          <select className="field" aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          <Button variant="white" small type="submit" disabled={!amount.trim()}>Set</Button>
        </form>
        <p className={`note${error ? ' bad' : ''}`} role={error ? 'alert' : undefined}>
          {error ? `That is out of range. ${customHint(place)}` : customHint(place)}
        </p>
      </details>
    </div>
  );
}
