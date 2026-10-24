import type { Place } from '../../engine/heat';
import { canStep, coolingCaption, coolingValue, SIDE_PRESETS, stepCooling } from '../../model/cooling';
import { Stepper } from './Stepper';

/** Cooling speed for an area: "+" slows the cooling down, "-" speeds it up. */
export function CoolingStepper({ place, minutes, onChange }: { place: Exclude<Place, 'archive'>; minutes: number; onChange: (m: number) => void }) {
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
    </div>
  );
}
