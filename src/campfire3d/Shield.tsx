import { useState } from 'react';
import { tierOfLevel, TIERS, type Tier } from './mastery';

/** A little shield with the level on it, in the colours of the fire's mastery design. */
let shieldCount = 0;

export function Shield({ level, tier, size = 32 }: { level: number; tier?: Tier; size?: number }) {
  const t = tier ? TIERS[tier - 1] : tierOfLevel(level);
  const [id] = useState(() => `holo${shieldCount++}`);
  const holo = t.tier === 8;
  const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const digits = String(level).length;
  const font = digits >= 4 ? 7.5 : digits === 3 ? 9 : digits === 2 ? 11 : 13;
  return (
    <svg className="shield" width={size} height={size * 1.08} viewBox="0 0 24 26" role="img" aria-label={`Level ${level}, ${t.name}`}>
      {holo && (
        <defs>
          {/* soft holographic colours, the same colour at both ends so the movement has no seam */}
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.6" spreadMethod="repeat">
            {['#FFB8DC', '#D9C6FF', '#A9DCFF', '#B4F5E4', '#FFF2B0', '#FFD0B8', '#FFB8DC'].map((c, i, a) => <stop key={i} offset={i / (a.length - 1)} stopColor={c} />)}
            {!calm && <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="1 0" dur="3.2s" repeatCount="indefinite" />}
          </linearGradient>
          <linearGradient id={`${id}r`} x1="1" y1="0" x2="0" y2="1" spreadMethod="repeat">
            {['#A9DCFF', '#B4F5E4', '#FFF2B0', '#FFD0B8', '#FFB8DC', '#D9C6FF', '#A9DCFF'].map((c, i, a) => <stop key={i} offset={i / (a.length - 1)} stopColor={c} />)}
            {!calm && <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="-1 0" dur="4.4s" repeatCount="indefinite" />}
          </linearGradient>
        </defs>
      )}
      <path d="M12 1.5 21.5 5v7.2c0 5.4-4 9.3-9.5 12.3C6.5 21.5 2.5 17.600 2.500 12.200V5Z" fill={holo ? `url(#${id}r)` : t.rim} />
      <path d="M12 3.2 20 6.100v6c0 4.500-3.300 7.800-8 10.400-4.700-2.600-8-5.900-8-10.400v-6Z" fill={holo ? `url(#${id})` : t.fill} />
      {t.tier >= 4 && <path d="M12 5.2 17.800 7.400v4.700c0 3.200-2.200 5.700-5.800 7.900-3.600-2.200-5.800-4.700-5.800-7.900V7.400Z" fill="none" stroke={t.rim} strokeWidth=".7" />}
      {t.tier >= 7 && <path d="M12 0 13.300 2.300 15.800 1 15 3.500H9L8.200 1l2.500 1.300Z" fill="#F2B21E" />}
      <text x="12" y="15.200" textAnchor="middle" fontSize={font} fontWeight="800" fill={t.ink} fontFamily="'Inter Tight', system-ui, sans-serif">{level}</text>
    </svg>
  );
}
