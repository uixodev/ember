/**
 * Fire colours you can pick for each area. Solid colours only, and no pinks or purples.
 * Each palette colours the flames, the coals, the glow on the ground and the sparks.
 */
export type PaletteId = 'classic' | 'gold' | 'crimson' | 'green' | 'teal' | 'blue' | 'ice';

export interface Palette {
  id: PaletteId;
  name: string;
  /** The round swatch in the picker. */
  swatch: string;
  /** Flame colour from the base up to the tip. */
  ramp: [string, string, string, string, string];
  coal: number;
  /** Glow on the ground: centre, middle, edge. */
  pool: [string, string, string];
  sparks: [string, string, string];
}

export const PALETTES: Record<PaletteId, Palette> = {
  classic: { id: 'classic', name: 'Classic', swatch: '#FF9A2E', ramp: ['#FFF1B0', '#FFD25A', '#FF9A2E', '#E8553A', '#D2402F'], coal: 0xff7a2e, pool: ['#B4483A', '#8A3A2A', '#4A2420'], sparks: ['#FFD25A', '#FF9A2E', '#FFFBE0'] },
  gold: { id: 'gold', name: 'Gold', swatch: '#FFD84D', ramp: ['#FFFBE0', '#FFF0A0', '#FFD84D', '#F2B21E', '#D98E1A'], coal: 0xf2b53a, pool: ['#B58A2E', '#7A5A24', '#4A3A22'], sparks: ['#FFE98A', '#FFD84D', '#FFFFFF'] },
  crimson: { id: 'crimson', name: 'Crimson', swatch: '#E8553A', ramp: ['#FFD0A8', '#FF8A5E', '#E8553A', '#C0302A', '#8A1E24'], coal: 0xe8402e, pool: ['#A8302A', '#7A2824', '#43201F'], sparks: ['#FF8A5E', '#E8553A', '#FFD0A8'] },
  green: { id: 'green', name: 'Green', swatch: '#5FD35F', ramp: ['#EFFFD0', '#B8F070', '#5FD35F', '#2FA84F', '#1E7A3F'], coal: 0x4fd35a, pool: ['#2F8A4A', '#245F3A', '#1F3A38'], sparks: ['#B8F070', '#5FD35F', '#FFFFFF'] },
  teal: { id: 'teal', name: 'Teal', swatch: '#33D0C0', ramp: ['#E0FFF6', '#8AF0DA', '#33D0C0', '#1FA3B5', '#177C9A'], coal: 0x33d0c0, pool: ['#1F8C93', '#1B6678', '#1F3F57'], sparks: ['#8AF0DA', '#33D0C0', '#FFFFFF'] },
  blue: { id: 'blue', name: 'Blue', swatch: '#4F8EF7', ramp: ['#EAF4FF', '#A9D4FF', '#4F8EF7', '#2C5BC4', '#22409A'], coal: 0x4f8ef7, pool: ['#3F63C8', '#2C4A9E', '#25306E'], sparks: ['#A9D4FF', '#4F8EF7', '#FFFFFF'] },
  ice: { id: 'ice', name: 'Ice', swatch: '#DCEBFF', ramp: ['#FFFFFF', '#F2F7FF', '#DCEBFF', '#BFD6F5', '#9DB8E6'], coal: 0xdcebff, pool: ['#7F94C8', '#566AA6', '#3A4780'], sparks: ['#FFFFFF', '#DCEBFF', '#A9D4FF'] },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
