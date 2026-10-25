import { tierOfLevel, TIERS, type Tier } from './mastery';

/** A little shield with the level on it, in the colours of the fire's mastery design. */
export function Shield({ level, tier, size = 32 }: { level: number; tier?: Tier; size?: number }) {
  const t = tier ? TIERS[tier - 1] : tierOfLevel(level);
  const digits = String(level).length;
  const font = digits >= 4 ? 7.5 : digits === 3 ? 9 : digits === 2 ? 11 : 13;
  return (
    <svg className="shield" width={size} height={size * 1.08} viewBox="0 0 24 26" role="img" aria-label={`Level ${level}, ${t.name}`}>
      <path d="M12 1.5 21.5 5v7.2c0 5.4-4 9.3-9.5 12.3C6.5 21.5 2.5 17.600 2.500 12.200V5Z" fill={t.rim} />
      <path d="M12 3.2 20 6.100v6c0 4.500-3.300 7.800-8 10.400-4.700-2.600-8-5.900-8-10.400v-6Z" fill={t.fill} />
      {t.tier >= 4 && <path d="M12 5.2 17.800 7.400v4.700c0 3.200-2.200 5.700-5.800 7.900-3.600-2.200-5.800-4.700-5.800-7.900V7.400Z" fill="none" stroke={t.rim} strokeWidth=".7" />}
      {t.tier === 7 && <path d="M12 0 13.300 2.300 15.800 1 15 3.500H9L8.200 1l2.500 1.300Z" fill="#F2B21E" />}
      <text x="12" y="15.200" textAnchor="middle" fontSize={font} fontWeight="800" fill={t.ink} fontFamily="'Inter Tight', system-ui, sans-serif">{level}</text>
    </svg>
  );
}
