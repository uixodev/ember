import { IconMinus, IconPlus } from './Icons';
import './ui.css';

/** Cooling speed stepper: minus, big sun-yellow number, plus. */
export function Stepper({ title = 'Cools every', value, caption, onMinus, onPlus, minusDisabled, plusDisabled }: {
  title?: string;
  value: string;
  caption?: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}) {
  return (
    <div className="stepper glass">
      <div className="stepper-title">{title}</div>
      <div className="stepper-row">
        <button type="button" className="stepper-btn minus" aria-label="Slower" onClick={onMinus} disabled={minusDisabled}><IconMinus size={22} /></button>
        <div className="stepper-value" aria-live="polite">{value}</div>
        <button type="button" className="stepper-btn plus" aria-label="Faster" onClick={onPlus} disabled={plusDisabled}><IconPlus size={22} /></button>
      </div>
      {caption && <div className="stepper-caption">{caption}</div>}
    </div>
  );
}
