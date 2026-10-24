import fire from '../../assets/fire-3d.png';
import sun from '../../assets/heat-warm.png';
import leaves from '../../assets/heat-embers.png';
import snowflake from '../../assets/heat-cold.png';
import type { Level } from '../../engine/heat';

const ICONS: Record<Level, string> = { 3: fire, 2: sun, 1: leaves, 0: snowflake };

/** The picture for an area at a given heat: fire, sun, leaves or snowflake. */
export function HeatIcon({ level, size = 24, className = '' }: { level: Level; size?: number; className?: string }) {
  return (
    <img
      src={ICONS[level]} alt="" width={size} height={size} draggable={false}
      className={`heat-icon ${className}`} data-level={level} style={{ flex: 'none' }}
    />
  );
}
