/**
 * Fire colours you can pick for each area. Solid colours only, and no pinks or purples.
 * Each palette colours the flames, the coals, the glow on the ground and the sparks.
 */
export type PaletteId =
  | 'classic' | 'lava' | 'crimson' | 'amber' | 'gold' | 'lime' | 'green' | 'mint' | 'teal' | 'aurora' | 'sky' | 'blue' | 'sapphire' | 'ice' | 'star';

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
  lava: { id: 'lava', name: 'Lava', swatch: '#E8451E', ramp: ['#FFE0A0', '#FF9A2E', '#E8451E', '#B0261A', '#5A1414'], coal: 0xff4a1e, pool: ['#8A2A1C', '#5A2018', '#34161A'], sparks: ['#FF9A2E', '#E8451E', '#FFE0A0'] },
  crimson: { id: 'crimson', name: 'Crimson', swatch: '#C0302A', ramp: ['#FFD0A8', '#FF8A5E', '#E8553A', '#C0302A', '#8A1E24'], coal: 0xe8402e, pool: ['#A8302A', '#7A2824', '#43201F'], sparks: ['#FF8A5E', '#E8553A', '#FFD0A8'] },
  amber: { id: 'amber', name: 'Amber', swatch: '#FFB030', ramp: ['#FFF4D0', '#FFD680', '#FFB030', '#E88A10', '#B8610C'], coal: 0xffb030, pool: ['#A8701F', '#6E4A1C', '#43301F'], sparks: ['#FFD680', '#FFB030', '#FFFFFF'] },
  gold: { id: 'gold', name: 'Gold', swatch: '#FFD84D', ramp: ['#FFFBE0', '#FFF0A0', '#FFD84D', '#F2B21E', '#D98E1A'], coal: 0xf2b53a, pool: ['#B58A2E', '#7A5A24', '#4A3A22'], sparks: ['#FFE98A', '#FFD84D', '#FFFFFF'] },
  lime: { id: 'lime', name: 'Lime', swatch: '#9BEF2F', ramp: ['#F8FFD8', '#D8FF6A', '#9BEF2F', '#5FC22B', '#3A8A22'], coal: 0x9bef2f, pool: ['#5E9A2A', '#3F6B26', '#2C4A2E'], sparks: ['#D8FF6A', '#9BEF2F', '#FFFFFF'] },
  green: { id: 'green', name: 'Green', swatch: '#3FC56B', ramp: ['#EFFFD0', '#B8F070', '#5FD35F', '#2FA84F', '#1E7A3F'], coal: 0x4fd35a, pool: ['#2F8A4A', '#245F3A', '#1F3A38'], sparks: ['#B8F070', '#5FD35F', '#FFFFFF'] },
  mint: { id: 'mint', name: 'Mint', swatch: '#6CF0C0', ramp: ['#F0FFF8', '#B8FFE0', '#6CF0C0', '#2FCFA0', '#1E9C86'], coal: 0x6cf0c0, pool: ['#2F9A86', '#25705F', '#234A4A'], sparks: ['#B8FFE0', '#6CF0C0', '#FFFFFF'] },
  teal: { id: 'teal', name: 'Teal', swatch: '#1FA3B5', ramp: ['#E0FFF6', '#8AF0DA', '#33D0C0', '#1FA3B5', '#177C9A'], coal: 0x33d0c0, pool: ['#1F8C93', '#1B6678', '#1F3F57'], sparks: ['#8AF0DA', '#33D0C0', '#FFFFFF'] },
  aurora: { id: 'aurora', name: 'Aurora', swatch: '#3EDDB0', ramp: ['#E9FFF3', '#8CF5C8', '#3EDDB0', '#2BA5D8', '#2B67C9'], coal: 0x3eddb0, pool: ['#2A9AA0', '#237888', '#243F70'], sparks: ['#8CF5C8', '#2BA5D8', '#FFFFFF'] },
  sky: { id: 'sky', name: 'Sky', swatch: '#6FD2FF', ramp: ['#F2FCFF', '#BDEBFF', '#6FD2FF', '#2FA8E8', '#1D78C0'], coal: 0x6fd2ff, pool: ['#2F8CC0', '#25649A', '#26407A'], sparks: ['#BDEBFF', '#6FD2FF', '#FFFFFF'] },
  blue: { id: 'blue', name: 'Blue', swatch: '#4F8EF7', ramp: ['#EAF4FF', '#A9D4FF', '#4F8EF7', '#2C5BC4', '#22409A'], coal: 0x4f8ef7, pool: ['#3F63C8', '#2C4A9E', '#25306E'], sparks: ['#A9D4FF', '#4F8EF7', '#FFFFFF'] },
  sapphire: { id: 'sapphire', name: 'Sapphire', swatch: '#2A45B8', ramp: ['#CFE0FF', '#7FA6FF', '#3F6BE8', '#2A45B8', '#1C2C80'], coal: 0x3f6be8, pool: ['#2A45B8', '#1F3394', '#1F2564'], sparks: ['#7FA6FF', '#3F6BE8', '#FFFFFF'] },
  ice: { id: 'ice', name: 'Ice', swatch: '#DCEBFF', ramp: ['#FFFFFF', '#F2F7FF', '#DCEBFF', '#BFD6F5', '#9DB8E6'], coal: 0xdcebff, pool: ['#7F94C8', '#566AA6', '#3A4780'], sparks: ['#FFFFFF', '#DCEBFF', '#A9D4FF'] },
  star: { id: 'star', name: 'White-hot', swatch: '#FFFFFF', ramp: ['#FFFFFF', '#FFFFFF', '#FFF8E0', '#FFE9A8', '#FFD27A'], coal: 0xffffff, pool: ['#9A8A7A', '#6E6460', '#463F52'], sparks: ['#FFFFFF', '#FFF8E0', '#FFE9A8'] },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
