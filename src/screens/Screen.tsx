import type { ReactNode } from 'react';
import './screens.css';

/** Phone-width column with safe areas. `tabs` leaves room for the tab bar. */
export function Screen({ children, tabs = false, className = '' }: { children: ReactNode; tabs?: boolean; className?: string }) {
  return <main className={`screen${tabs ? ' with-tabs' : ''} ${className}`}>{children}</main>;
}

export function minutesToTime(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
