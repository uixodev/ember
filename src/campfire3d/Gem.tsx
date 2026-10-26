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
          <ellipse cx="16" cy="19" rx="11" ry="8.500" fill={f(dark)} />
          <ellipse cx="16" cy="17.500" rx="11" ry="8" fill={f(base)} />
          <ellipse cx="12.500" cy="14.500" rx="4" ry="2.200" fill={f(light)} />
        </>
      )}
      {rarity === 'uncommon' && (
        <>
          <path d="M8 11 12 5h8l4 6-8 16Z" fill={f(base)} />
          <path d="M8 11h16l-8 16Z" fill={f(dark)} />
          <path d="M12 5h8l-2 6h-4Z" fill={f(light)} />
          <path d="M8 11h6l2 16Z" fill={f(shade(base, 0.12))} />
        </>
      )}
      {(rarity === 'rare' || rarity === 'epic') && (
        <>
          <path d="M16 3 26 12 16 29 6 12Z" fill={f(base)} />
          <path d="M6 12h20L16 29Z" fill={f(dark)} />
          <path d="M16 3 26 12H6Z" fill={f(light)} />
          <path d="M16 12 6 12 16 29Z" fill={f(shade(base, 0.1))} />
          <path d="M16 3 12 12h8Z" fill={f(lighter)} />
          {rarity === 'epic' && <path d="M25 3v5M22.500 5.500h5" stroke={f('#fff')} strokeWidth="1.600" strokeLinecap="round" />}
        </>
      )}
      {rarity === 'legendary' && (
        <>
          <path d="M16 2 27 12 16 30 5 12Z" fill={dim ? '#2C2778' : `url(#${id})`} stroke={f('#fff')} strokeWidth="1.400" strokeLinejoin="round" />
          <path d="M5 12h22L16 30Z" fill={f(darker)} opacity=".18" />
          <path d="M16 2 12 12h8Z" fill={f('#fff')} opacity=".7" />
          <path d="M5 12h22M12 12l4 18 4-18" stroke={f('#fff')} strokeWidth=".8" fill="none" opacity=".7" />
          {!dim && <path d="M27 3v5M24.500 5.500h5M5 22v4M3 24h4" stroke="#fff" strokeWidth="1.500" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}
