import type { ReactNode } from 'react';
import './ui.css';

export function Pill({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label?: string }) {
  if (onClick) {
    return <button type="button" className="pill" onClick={onClick} aria-label={label}>{children}</button>;
  }
  return <span className="pill">{children}</span>;
}
