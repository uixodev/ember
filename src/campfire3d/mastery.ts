/**
 * Levels for a campfire. A fire goes up one level every time its heat reaches 100%: feed it wood until it is full.
 * Levels never end. The fire's look changes through seven mastery designs as the level grows.
 */

export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TierInfo {
  tier: Tier;
  name: string;
  /** First level of this design. */
  from: number;
  /** One line about how the fire looks. */
  look: string;
  /** Shield colours. */
  fill: string;
  rim: string;
  ink: string;
}

export const TIERS: TierInfo[] = [
  { tier: 1, name: 'Camp', from: 1, look: 'A simple ring of stones', fill: '#9FB0D0', rim: '#6F82AA', ink: '#1C1850' },
  { tier: 2, name: 'Hearth', from: 5, look: 'A second ring and glowing embers', fill: '#D9975B', rim: '#A5693A', ink: '#1C1850' },
  { tier: 3, name: 'Cookfire', from: 10, look: 'A tripod with a hanging pot', fill: '#DDE4F0', rim: '#A3B0C8', ink: '#1C1850' },
  { tier: 4, name: 'Beacon', from: 15, look: 'Four torch pillars', fill: '#F2B21E', rim: '#C48A0C', ink: '#1C1850' },
  { tier: 5, name: 'Forge', from: 25, look: 'A glowing iron ring joins the pillars', fill: '#2FCFA0', rim: '#1B9C78', ink: '#10304A' },
  { tier: 6, name: 'Inferno', from: 40, look: 'Embers circle the fire', fill: '#4F8EF7', rim: '#2C5BC4', ink: '#FFFFFF' },
  { tier: 7, name: 'Legend', from: 60, look: 'Gold pillars and a crown of light', fill: '#FFF4C2', rim: '#E0A810', ink: '#5A3C00' },
];

export function tierOfLevel(level: number): TierInfo {
  let t = TIERS[0];
  for (const x of TIERS) if (level >= x.from) t = x;
  return t;
}
