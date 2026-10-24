import { useEffect, type ReactNode } from 'react';
import { IconClose } from './Icons';
import './ui.css';

/** White bottom sheet over a dimmed scrim. */
export function Sheet({ children, onClose, label, closable = true }: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  closable?: boolean;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {closable && (
          <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}><IconClose size={14} /></button>
        )}
        {children}
      </div>
    </div>
  );
}
