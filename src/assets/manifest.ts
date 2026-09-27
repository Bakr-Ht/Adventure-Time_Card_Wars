import type { Faction } from '../game/cards/types';
import { allCards } from '../game/data/cards';

/**
 * Every asset the game loads is declared here. To swap in real art, point a
 * key at a new file (PNG/WebP/SVG) — nothing else needs to change.
 */
export interface AssetEntry {
  key: string;
  url: string;
  /** Rasterisation size for SVGs; ignored for bitmaps. */
  width: number;
  height: number;
}

const BASE = 'assets';

function svgAsset(key: string, path: string, width: number, height: number): AssetEntry {
  return { key, url: `${BASE}/${path}`, width, height };
}

export const glyphKey = (faction: Faction): string => `glyph:${faction}`;
export const cardArtKey = (id: string): string => `card:${id}`;
export const heroKey = (id: string): string => `hero:${id}`;
export const landKey = (id: string): string => `land:${id}`;

export const UI_KEYS = {
  cardBack: 'ui:card-back',
  menuBg: 'bg:menu',
  table: 'bg:table',
  spark: 'fx:spark',
  star: 'fx:star',
  puff: 'fx:puff',
} as const;

export function buildManifest(): AssetEntry[] {
  const entries: AssetEntry[] = [];
  for (const def of allCards()) {
    if (def.type === 'CREATURE' || def.type === 'BUILDING' || def.type === 'SPELL') {
      entries.push(svgAsset(def.art, `cards/${def.id}.svg`, 400, 300));
    } else if (def.type === 'HERO') {
      entries.push(svgAsset(def.portrait, `heroes/${def.id}.svg`, 384, 384));
    } else if (def.type === 'LANDSCAPE') {
      entries.push(svgAsset(def.art, `landscapes/${def.id}.svg`, 480, 300));
    }
  }
  const factions: Faction[] = ['BLUE_PLAINS', 'CORN_FIELDS', 'USELESS_SWAMP', 'NICE_LANDS', 'RAINBOW'];
  for (const f of factions) entries.push(svgAsset(glyphKey(f), `ui/glyph-${f.toLowerCase().replace('_', '-')}.svg`, 96, 96));
  entries.push(svgAsset(UI_KEYS.cardBack, 'ui/card-back.svg', 300, 420));
  entries.push(svgAsset(UI_KEYS.menuBg, 'backgrounds/menu.svg', 1600, 900));
  entries.push(svgAsset(UI_KEYS.table, 'backgrounds/table.svg', 256, 256));
  entries.push(svgAsset(UI_KEYS.spark, 'fx/spark.svg', 32, 32));
  entries.push(svgAsset(UI_KEYS.star, 'fx/star.svg', 32, 32));
  entries.push(svgAsset(UI_KEYS.puff, 'fx/puff.svg', 32, 32));
  return entries;
}

/** Plain URL for DOM <img> usage (menus, deck select). */
export function assetUrl(path: string): string {
  return `${BASE}/${path}`;
}
