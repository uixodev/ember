import { useState } from 'react';
import { PALETTES, type PaletteId } from './palettes';
import type { Rarity } from './collection';

/** Mix a #RRGGBB colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const t = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const ch = (v: number) => Math.round(v + (t - v) * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

let gemCount = 0;

/** A cut gem in the colour of a fire. The better the rarity, the more facets and the more it sparkles. */
export function Gem({ color, rarity, size = 40, dim = false }: { color: string; rarity: Rarity; size?: number; dim?: boolean }) {
  const base = PALETTES[color as PaletteId]?.swatch ?? '#9FB0D0';
  const [id] = useState(() => `gem${gemCount++}`);
  const light = shade(base, 0.45), lighter = shade(base, 0.75), dark = shade(base, -0.28), darker = shade(base, -0.5);
  const fill = dim ? '#2C2778' : undefined;
  const f = (c: string) => fill ?? c;
  return (
    <svg className={`gem gem-${rarity}${dim ? ' dim' : ''}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {rarity === 'legendary' && !dim && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" spreadMethod="repeat">
            {['#FFB8DC', '#D9C6FF', '#A9DCFF', '#B4F5E4', '#FFF2B0', '#FFB8DC'].map((c, i, a) => <stop key={i} offset={i / (a.length - 1)} stopColor={c} />)}
            <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="1 0" dur="3s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      )}
      {rarity === 'epic' && !dim && <circle cx="16" cy="17" r="14" fill={shade(base, 0.2)} opacity=".28" />}
      {rarity === 'common' && (
        <>
          <path d="M5 19c0-6 5-11 11-11s11 5 11 11-5 9-11 9S5 25 5 19Z" fill={f(dark)} />
          <path d="M5.500 17.500C6.500 11.500 11 8 16 8s9.500 3.500 10.500 9.500C23 21 9 21 5.500 17.500Z" fill={f(base)} />
          <path d="M9 14c1.500-3 4-4.500 7-4.500-3 1-5.500 3-6.500 6Z" fill={f(lighter)} opacity=".8" />
          <path d="M14 22c3 .5 7-.5 9-3 0 3-3 6-7 6.500-1.500 0-2.200-1.500-2-3.500Z" fill={f(darker)} opacity=".35" />
        </>
      )}
      {rarity === 'uncommon' && (
        <>
          <path d="M9 4h14l5 5v14l-5 5H9l-5-5V9Z" fill={f(dark)} />
          <path d="M10 6h12l4 4v12l-4 4H10l-4-4V10Z" fill={f(base)} />
          <path d="M12 9h8l3 3v8l-3 3h-8l-3-3v-8Z" fill={f(light)} />
          <path d="M14 12h4l1 1v6l-1 1h-4l-1-1v-6Z" fill={f(lighter)} />
          <path d="M10 6h12l-3 3H13ZM26 10v12l-3-3v-6Z" fill={f(lighter)} opacity=".55" />
          <path d="M6 10l3 3v6l-3 3ZM10 26l3-3h6l3 3Z" fill={f(darker)} opacity=".4" />
        </>
      )}
      {(rarity === 'rare' || rarity === 'epic') && (
        <>
          <path d="M5 12 10 5h12l5 7-11 17Z" fill={f(base)} />
          <path d="M5 12h22L16 29Z" fill={f(dark)} />
          <path d="M5 12 10 5l3 7Z" fill={f(light)} />
          <path d="M10 5h12l-3 7h-6Z" fill={f(lighter)} />
          <path d="M22 5l5 7h-8Z" fill={f(shade(base, 0.3))} />
          <path d="M5 12h8l3 17ZM19 12h8l-11 17Z" fill={f(shade(base, 0.08))} />
          <path d="M13 12l3 17 3-17Z" fill={f(dark)} opacity=".45" />
          <path d="M5 12h22M10 5l3 7M22 5l-3 7M16 5v7" stroke={f('#fff')} strokeWidth=".5" opacity=".6" fill="none" />
          {rarity === 'epic' && <path d="M26 2v5M23.500 4.500h5M5 22v4M3 24h4" stroke={f('#fff')} strokeWidth="1.500" strokeLinecap="round" />}
        </>
      )}
      {rarity === 'legendary' && (
        <>
          <path d="M5 12 10 4h12l5 8-11 18Z" fill={dim ? '#2C2778' : `url(#${id})`} stroke={f('#fff')} strokeWidth="1.300" strokeLinejoin="round" />
          <path d="M5 12h22L16 30Z" fill={f(darker)} opacity=".16" />
          <path d="M10 4h12l-3 8h-6Z" fill={f('#fff')} opacity=".6" />
          <path d="M5 12h22M10 4l3 8M22 4l-3 8M13 12l3 18 3-18" stroke={f('#fff')} strokeWidth=".7" fill="none" opacity=".75" />
          {!dim && <path d="M27 2v5M24.500 4.500h5M4 21v5M1.500 23.500h5" stroke="#fff" strokeWidth="1.500" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}
