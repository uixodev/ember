import type { Heat } from '../../engine/heat';
import { LEVEL_NAMES } from '../../engine/format';
import { FireRing } from '../FireRing/FireRing';
import { Button } from '../ui/Button';
import './AreaCard.css';

export type CardVariant = 'glass' | 'sunrise' | 'sunken';

interface Props {
  name: string;
  heat: Heat;
  /** Top-right label such as "Daily". */
  tag: string;
  /** Second line, e.g. "fed today". */
  status: string;
  variant?: CardVariant;
  fed?: boolean;
  /** Archive cards say "Thaw it". */
  action?: 'feed' | 'thaw' | 'none';
  onOpen: () => void;
  onAction?: () => void;
}

export function AreaCard({ name, heat, tag, status, variant = 'glass', fed, action = 'feed', onOpen, onAction }: Props) {
  const label = action === 'thaw' ? 'Thaw it' : fed ? 'Fed' : 'Feed it';
  return (
    <div className={`area-card ${variant}`}>
      <button type="button" className="area-card-open" onClick={onOpen} aria-label={`Open ${name}`} />
      <div className="area-card-top">
        <FireRing level={heat.level} size={34} progress={heat.progress} thin />
        <span className="area-card-tag">{tag}</span>
      </div>
      <div className="area-card-name">{name}</div>
      <div className="area-card-status">{LEVEL_NAMES[heat.level]} · {status}</div>
      {action !== 'none' && (
        <Button
          variant={variant === 'sunrise' ? 'white' : 'glass'} small block className="area-card-btn"
          disabled={action === 'feed' && fed && variant !== 'sunrise'}
          onClick={onAction}
        >{label}</Button>
      )}
    </div>
  );
}
