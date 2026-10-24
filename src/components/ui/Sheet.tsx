import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { play } from '../../sound';
import { IconClose } from './Icons';
import './ui.css';

const EXIT_MS = 180;

/** White bottom sheet over a dimmed scrim. Dismissing it slides it away before `onClose` runs. */
export function Sheet({ children, onClose, label, closable = true }: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  closable?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const dismiss = useCallback(() => {
    setClosing((was) => {
      if (was) return was;
      play('close');
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => closeRef.current(), calm ? 0 : EXIT_MS);
      return true;
    });
  }, []);

  useEffect(() => { play('open'); }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [dismiss]);

  return (
    <div className={`sheet-scrim${closing ? ' closing' : ''}`} onClick={dismiss}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {closable && (
          <button type="button" className="sheet-close" aria-label="Close" onClick={dismiss}><IconClose size={14} /></button>
        )}
        {children}
      </div>
    </div>
  );
}
