import type {
  BuildingDef,
  CreatureDef,
  HeroDef,
  LandscapeDef,
  SpellDef,
} from '../../cards/types';

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Small factories that fill in sensible defaults so card files stay readable. */
export function creature(
  def: Optional<Omit<CreatureDef, 'type'>, 'keywords' | 'attackRestriction' | 'rarity' | 'art'>,
): CreatureDef {
  return {
    type: 'CREATURE',
    rarity: 'COMMON',
    keywords: [],
    attackRestriction: 'NONE',
    art: `card:${def.id}`,
    ...def,
  };
}

export function building(def: Optional<Omit<BuildingDef, 'type'>, 'rarity' | 'art'>): BuildingDef {
  return { type: 'BUILDING', rarity: 'COMMON', art: `card:${def.id}`, ...def };
}

export function spell(def: Optional<Omit<SpellDef, 'type'>, 'rarity' | 'art'>): SpellDef {
  return { type: 'SPELL', rarity: 'COMMON', art: `card:${def.id}`, ...def };
}

export function landscape(def: Optional<Omit<LandscapeDef, 'type'>, 'rarity' | 'art'>): LandscapeDef {
  return { type: 'LANDSCAPE', rarity: 'COMMON', art: `land:${def.id}`, ...def };
}

export function hero(def: Optional<Omit<HeroDef, 'type'>, 'rarity' | 'art' | 'portrait'>): HeroDef {
  return {
    type: 'HERO',
    rarity: 'LEGENDARY',
    art: `hero:${def.id}`,
    portrait: `hero:${def.id}`,
    ...def,
  };
}
