import type { Faction } from '../game/cards/types';

/** Design tokens shared by canvas and DOM UI. "Cardboard sticker diorama". */
export const COLORS = {
  ink: 0x2a1b3d,
  kraft: 0xd9a866,
  kraftDark: 0xb9834a,
  kraftDeep: 0x9c6b3f,
  sky: 0x8ed8e8,
  lemon: 0xffd64a,
  mint: 0x5fd08a,
  tomato: 0xf2545b,
  bubblegum: 0xff7fb0,
  paper: 0xfffbf0,
  grape: 0x5b3fa0,
  white: 0xffffff,
  frost: 0xa9e8ff,
} as const;

export const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export const FONTS = {
  display: '"Luckiest Guy", "Arial Black", sans-serif',
  body: '"Grandstander", "Trebuchet MS", sans-serif',
} as const;

export const FACTION_COLORS: Record<Faction, number> = {
  BLUE_PLAINS: 0x5b8def,
  CORN_FIELDS: 0xf2b632,
  USELESS_SWAMP: 0x7a9a3a,
  NICE_LANDS: 0xf58fba,
  RAINBOW: 0x9b7bea,
};

export const RARITY_PIPS = { COMMON: 1, UNCOMMON: 2, RARE: 3, LEGENDARY: 4 } as const;

export const TONE_COLORS = {
  neutral: '#2A1B3D',
  damage: '#B8232E',
  heal: '#17733F',
  play: '#2F3FA8',
  floop: '#6A2FA8',
  turn: '#2A1B3D',
  death: '#6B4A2C',
} as const;

/** Hard offset shadow used for the sticker look (no blur, ever). */
export const SHADOW = { x: 5, y: 6, alpha: 0.9 } as const;
