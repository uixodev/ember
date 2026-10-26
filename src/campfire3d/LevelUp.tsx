import { useEffect, useState } from 'react';
import { Shield } from './Shield';
import { TIERS, type Tier } from './mastery';

/**
 * The level-up badge that floats over the fire. It looks different for each design: more rays and bigger flourishes
 * the higher the design, and a Mythic one is rainbow. The level number rolls from the old to the new one, and a new
 * design swaps the old shield for the new one with a flash. It never blocks the screen.
 */
export function LevelUp({ from, to, tierFrom, tierTo, text }: { from: number; to: number; tierFrom: Tier; tierTo: Tier; text: string }) {
  const [shown, setShown] = useState({ level: from, tier: tierFrom, flip: 0 });
  useEffect(() => {
    const t = window.setTimeout(() => setShown({ level: to, tier: tierTo, flip: 1 }), 700);
    return () => window.clearTimeout(t);
  }, [to, tierTo]);

  const info = TIERS[tierTo - 1];
  const rays = 8 + tierTo * 2;
  const holo = tierTo >= 8;
  const newDesign = tierTo > tierFrom;
  return (
    <div className={`lu lu-t${tierTo}${newDesign ? ' lu-design' : ''}`} style={{ ['--lu' as string]: info.fill, ['--lu-rim' as string]: info.rim }}>
      <svg className="lu-rays" viewBox="-100 -100 200 200" aria-hidden="true">
        <g className="lu-spin">
          {Array.from({ length: rays }, (_, i) => (
            <path key={i} d="M0 0 L-7 -96 L7 -96 Z" transform={`rotate(${(i / rays) * 360})`}
              fill={holo ? ['#FFD0B8', '#FFF2B0', '#B4F5E4', '#A9DCFF', '#D9C6FF', '#FFB8DC'][i % 6] : info.fill} opacity={i % 2 ? 0.45 : 0.8} />
          ))}
        </g>
        {tierTo >= 4 && <circle className="lu-ring" r="40" fill="none" stroke={holo ? '#fff' : info.fill} strokeWidth="2.500" />}
        {tierTo >= 6 && <circle className="lu-ring r2" r="40" fill="none" stroke="#fff" strokeWidth="1.500" />}
      </svg>
      <span className="lu-ribbon">{text}</span>
      <span className={`lu-shield f${shown.flip}`} key={shown.flip}><Shield level={shown.level} tier={shown.tier} size={74} /></span>
      <span className="lu-sparks" aria-hidden="true">{Array.from({ length: 6 + tierTo }, (_, i) => <i key={i} style={{ ['--a' as string]: `${(i / (6 + tierTo)) * 360}deg`, animationDelay: `${(i % 4) * 0.07}s`, background: holo ? ['#FFB8DC', '#A9DCFF', '#B4F5E4', '#FFF2B0'][i % 4] : i % 2 ? '#fff' : info.fill }} />)}</span>
      {newDesign && <span className="lu-look">{info.name}: {info.look}</span>}
    </div>
  );
}
