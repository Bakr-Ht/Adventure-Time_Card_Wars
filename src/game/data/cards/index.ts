import type {
  BuildingDef,
  CardDef,
  CreatureDef,
  HeroDef,
  LandscapeDef,
  PlayableDef,
} from '../../cards/types';
import { FINN_CARDS } from './finn';
import { JAKE_CARDS } from './jake';
import { HEROES, LANDSCAPES, SHARED_CARDS, TOKENS } from './shared';

const ALL: CardDef[] = [
  ...FINN_CARDS,
  ...JAKE_CARDS,
  ...SHARED_CARDS,
  ...TOKENS,
  ...LANDSCAPES,
  ...HEROES,
];

const REGISTRY = new Map<string, CardDef>();
for (const def of ALL) {
  if (REGISTRY.has(def.id)) throw new Error(`Duplicate card id: ${def.id}`);
  REGISTRY.set(def.id, def);
}

export function allCards(): readonly CardDef[] {
  return ALL;
}

export function getCard(id: string): CardDef {
  const def = REGISTRY.get(id);
  if (!def) throw new Error(`Unknown card id: ${id}`);
  return def;
}

export function hasCard(id: string): boolean {
  return REGISTRY.has(id);
}

export function getPlayable(id: string): PlayableDef {
  const def = getCard(id);
  if (def.type !== 'CREATURE' && def.type !== 'BUILDING' && def.type !== 'SPELL') {
    throw new Error(`Card ${id} is not playable from hand`);
  }
  return def;
}

export function getCreature(id: string): CreatureDef {
  const def = getCard(id);
  if (def.type !== 'CREATURE') throw new Error(`Card ${id} is not a creature`);
  return def;
}

export function getLandscape(id: string): LandscapeDef {
  const def = getCard(id);
  if (def.type !== 'LANDSCAPE') throw new Error(`Card ${id} is not a landscape`);
  return def;
}

export function getHero(id: string): HeroDef {
  const def = getCard(id);
  if (def.type !== 'HERO') throw new Error(`Card ${id} is not a hero`);
  return def;
}

export function getBuilding(id: string): BuildingDef {
  const def = getCard(id);
  if (def.type !== 'BUILDING') throw new Error(`Card ${id} is not a building`);
  return def;
}
