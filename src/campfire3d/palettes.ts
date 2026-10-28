/**
 * Fire colours you can pick for each area. Solid colours only: reds, oranges and golds, greens, blues, and also
 * pinks, purples and black.
 * Each palette colours the flames, the coals, the glow on the ground and the sparks.
 */
export type PaletteId =
  | 'classic' | 'lava' | 'crimson' | 'amber' | 'gold' | 'lime' | 'green' | 'mint' | 'teal' | 'aurora' | 'sky' | 'blue' | 'sapphire' | 'ice' | 'star'
  | 'rose' | 'pink' | 'magenta' | 'orchid' | 'purple' | 'violet' | 'lavender' | 'black' | 'obsidian' | 'mahogany'
  | 'copper' | 'ember' | 'citrus' | 'forest' | 'emerald' | 'jade' | 'cyan' | 'turquoise' | 'arctic' | 'cobalt' | 'midnight' | 'silver';

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
  rose: { id: 'rose', name: 'Rose', swatch: '#FF8FB1', ramp: ['#FFF0F5', '#FFC2D6', '#FF8FB1', '#E5527F', '#B5305C'], coal: 0xff8fb1, pool: ['#B84B72', '#8A3A5C', '#4A2448'], sparks: ['#FFC2D6', '#FF8FB1', '#FFFFFF'] },
  pink: { id: 'pink', name: 'Pink', swatch: '#FF5FA8', ramp: ['#FFE6F2', '#FFA3CF', '#FF5FA8', '#D93A86', '#9E2262'], coal: 0xff5fa8, pool: ['#A93A78', '#7A2D62', '#432452'], sparks: ['#FFA3CF', '#FF5FA8', '#FFFFFF'] },
  magenta: { id: 'magenta', name: 'Magenta', swatch: '#E01FA8', ramp: ['#FFD9F3', '#FF7AD6', '#E01FA8', '#A8157F', '#6E0F55'], coal: 0xe01fa8, pool: ['#8F1F78', '#6A1B62', '#3A1A52'], sparks: ['#FF7AD6', '#E01FA8', '#FFFFFF'] },
  orchid: { id: 'orchid', name: 'Orchid', swatch: '#C86BE8', ramp: ['#F6E6FF', '#E2A8F7', '#C86BE8', '#9B3FC4', '#6A2894'], coal: 0xc86be8, pool: ['#7F3FA8', '#5E3490', '#35276E'], sparks: ['#E2A8F7', '#C86BE8', '#FFFFFF'] },
  purple: { id: 'purple', name: 'Purple', swatch: '#8A3FE0', ramp: ['#EBDDFF', '#BE92F5', '#8A3FE0', '#6224B8', '#411A82'], coal: 0x8a3fe0, pool: ['#5E2FA8', '#46288A', '#2A2068'], sparks: ['#BE92F5', '#8A3FE0', '#FFFFFF'] },
  violet: { id: 'violet', name: 'Violet', swatch: '#6B4FFF', ramp: ['#E3DEFF', '#A99BFF', '#6B4FFF', '#4A32D1', '#33229A'], coal: 0x6b4fff, pool: ['#4A3AC4', '#392F9E', '#262470'], sparks: ['#A99BFF', '#6B4FFF', '#FFFFFF'] },
  lavender: { id: 'lavender', name: 'Lavender', swatch: '#BDB0FF', ramp: ['#FFFFFF', '#EEE9FF', '#BDB0FF', '#8F7FE0', '#6256B8'], coal: 0xbdb0ff, pool: ['#7466C4', '#574DA0', '#35307A'], sparks: ['#FFFFFF', '#EEE9FF', '#BDB0FF'] },
  black: { id: 'black', name: 'Black', swatch: '#15151F', ramp: ['#B8B8CC', '#6A6A82', '#34344A', '#1A1A28', '#0A0A12'], coal: 0x8a8aa8, pool: ['#5A5A78', '#3A3A56', '#262644'], sparks: ['#D8D8E8', '#8A8AA8', '#FFFFFF'] },
  obsidian: { id: 'obsidian', name: 'Obsidian', swatch: '#2B1F4A', ramp: ['#E6D8FF', '#9D7FE0', '#4B3A8A', '#251B4A', '#0E0A22'], coal: 0x9d7fe0, pool: ['#5A3FA0', '#3E2F78', '#241C56'], sparks: ['#E6D8FF', '#9D7FE0', '#FFFFFF'] },
  mahogany: { id: 'mahogany', name: 'Mahogany', swatch: '#8A3B22', ramp: ['#FFD9B8', '#D98A5A', '#A8502C', '#7A3118', '#4A1C0E'], coal: 0xc8643a, pool: ['#7A3A22', '#5A2C1C', '#38201C'], sparks: ['#FFD9B8', '#D98A5A', '#FFF1E0'] },
  copper: { id: 'copper', name: 'Copper', swatch: '#D2792F', ramp: ['#FFE6C0', '#F2A860', '#D2792F', '#A8541F', '#6E3418'], coal: 0xd2792f, pool: ['#8A4A24', '#5E3520', '#3A2420'], sparks: ['#F2A860', '#D2792F', '#FFE6C0'] },
  ember: { id: 'ember', name: 'Ember', swatch: '#FF5A1F', ramp: ['#FFD7A0', '#FF8A3A', '#FF5A1F', '#D43A14', '#8A220F'], coal: 0xff5a1f, pool: ['#A83A1C', '#702A1A', '#3E1D1A'], sparks: ['#FF8A3A', '#FF5A1F', '#FFD7A0'] },
  citrus: { id: 'citrus', name: 'Citrus', swatch: '#FFC21F', ramp: ['#FFFBD0', '#FFEA6A', '#FFC21F', '#FF9A12', '#E06A0C'], coal: 0xffc21f, pool: ['#B08A22', '#76601F', '#463C22'], sparks: ['#FFEA6A', '#FFC21F', '#FFFFFF'] },
  forest: { id: 'forest', name: 'Forest', swatch: '#1F8F4A', ramp: ['#D8F5C0', '#7ED66A', '#2FA84F', '#1F8F4A', '#136638'], coal: 0x2fa84f, pool: ['#1F7A3E', '#1A5A33', '#1B3A36'], sparks: ['#7ED66A', '#2FA84F', '#FFFFFF'] },
  emerald: { id: 'emerald', name: 'Emerald', swatch: '#14C88A', ramp: ['#DDFFF0', '#6EEBB8', '#14C88A', '#0E9C76', '#0A6E62'], coal: 0x14c88a, pool: ['#12896A', '#106650', '#17404A'], sparks: ['#6EEBB8', '#14C88A', '#FFFFFF'] },
  jade: { id: 'jade', name: 'Jade', swatch: '#5CC6A0', ramp: ['#EAFFF6', '#B0EBD2', '#5CC6A0', '#38A084', '#26786A'], coal: 0x5cc6a0, pool: ['#2F8A74', '#26665A', '#234448'], sparks: ['#B0EBD2', '#5CC6A0', '#FFFFFF'] },
  cyan: { id: 'cyan', name: 'Cyan', swatch: '#22D3EE', ramp: ['#E4FCFF', '#9AF0FF', '#22D3EE', '#12A5D0', '#0E78AA'], coal: 0x22d3ee, pool: ['#1A8EAE', '#16688A', '#1C4466'], sparks: ['#9AF0FF', '#22D3EE', '#FFFFFF'] },
  turquoise: { id: 'turquoise', name: 'Turquoise', swatch: '#2ED8C8', ramp: ['#E6FFFB', '#9AF3E8', '#2ED8C8', '#1CAAB0', '#167C94'], coal: 0x2ed8c8, pool: ['#1E968F', '#18706F', '#1B4560'], sparks: ['#9AF3E8', '#2ED8C8', '#FFFFFF'] },
  arctic: { id: 'arctic', name: 'Arctic', swatch: '#A6E8FF', ramp: ['#FFFFFF', '#E0F7FF', '#A6E8FF', '#6ECBF0', '#3FA3D8'], coal: 0xa6e8ff, pool: ['#5C8CC0', '#46689E', '#34457A'], sparks: ['#E0F7FF', '#A6E8FF', '#FFFFFF'] },
  cobalt: { id: 'cobalt', name: 'Cobalt', swatch: '#2F6FEB', ramp: ['#E0ECFF', '#8AB4FF', '#2F6FEB', '#1F4DBF', '#173A8E'], coal: 0x2f6feb, pool: ['#2A56C0', '#203F94', '#1F2C6A'], sparks: ['#8AB4FF', '#2F6FEB', '#FFFFFF'] },
  midnight: { id: 'midnight', name: 'Midnight', swatch: '#1B2F8A', ramp: ['#9EB8FF', '#5A7DEA', '#2F4FC4', '#1B2F8A', '#121E5E'], coal: 0x2f4fc4, pool: ['#22348E', '#1A276A', '#181F52'], sparks: ['#9EB8FF', '#5A7DEA', '#FFFFFF'] },
  silver: { id: 'silver', name: 'Silver', swatch: '#C8D2E0', ramp: ['#FFFFFF', '#EEF2F8', '#C8D2E0', '#9FAEC4', '#7886A4'], coal: 0xc8d2e0, pool: ['#7684A8', '#586688', '#3E486A'], sparks: ['#FFFFFF', '#C8D2E0', '#A9D4FF'] },
};

/** The order in the picker: warm colours, pinks, purples, blues, greens, then the light and dark ones. */
export const PALETTE_IDS: PaletteId[] = [
  'classic', 'lava', 'ember', 'crimson', 'copper', 'mahogany', 'amber', 'citrus', 'gold',
  'rose', 'pink', 'magenta', 'orchid', 'purple', 'violet', 'lavender',
  'sapphire', 'midnight', 'cobalt', 'blue', 'sky', 'cyan', 'turquoise', 'teal', 'aurora',
  'forest', 'green', 'emerald', 'jade', 'mint', 'lime',
  'arctic', 'ice', 'silver', 'star', 'black', 'obsidian',
];
