/**
 * Card definitions are pure data. Nothing in here knows about Phaser or the DOM.
 * The rules engine interprets these shapes; the UI only reads them for display.
 */

export type LandFaction = 'BLUE_PLAINS' | 'CORN_FIELDS' | 'USELESS_SWAMP' | 'NICE_LANDS';
export type Faction = LandFaction | 'RAINBOW';

export type CardType = 'CREATURE' | 'BUILDING' | 'SPELL' | 'LANDSCAPE' | 'HERO';
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';

/** HASTY: may fight the turn it arrives. PIERCE: excess damage hits the hero. TOKEN: summoned, never shuffled. */
export type Keyword = 'HASTY' | 'PIERCE' | 'TOKEN';

/** WALL creatures never attack; CREATURES_ONLY creatures never hit heroes directly. */
export type AttackRestriction = 'NONE' | 'CANNOT_ATTACK' | 'CREATURES_ONLY';

/** What the player must pick when a card or ability needs a target. */
export type TargetRule =
  | 'NONE'
  | 'FRIENDLY_CREATURE'
  | 'ENEMY_CREATURE'
  | 'ANY_CREATURE'
  | 'ENEMY_BUILDING';

/** Who an effect lands on, resolved relative to the card that produced it. */
export type Selector =
  | 'TARGET'
  | 'SELF'
  | 'LANE_CREATURE'
  | 'OPPOSING_CREATURE'
  | 'OPPOSING_CREATURE_OR_HERO'
  | 'ADJACENT_FRIENDLIES'
  | 'ALL_FRIENDLY_CREATURES'
  | 'ALL_ENEMY_CREATURES'
  | 'ENEMY_HERO'
  | 'FRIENDLY_HERO';

export type Effect =
  | { kind: 'DAMAGE'; amount: number; to: Selector }
  | { kind: 'HEAL'; amount: number | 'FULL'; to: Selector }
  | { kind: 'BUFF'; atk: number; def: number; to: Selector; duration: 'TURN' | 'PERMANENT' }
  | { kind: 'DRAW'; count: number }
  | { kind: 'SUMMON'; tokenId: string }
  | { kind: 'DESTROY_BUILDING'; to: 'TARGET' }
  | { kind: 'FREEZE'; to: Selector }
  | { kind: 'PUSH'; to: Selector; fallbackDamage: number }
  | { kind: 'MOVE_ADJACENT'; to: Selector };

export interface ActivatedAbility {
  name: string;
  text: string;
  /** Action Points spent to activate. FLOOPs are usually free. */
  cost: number;
  target: TargetRule;
  effects: Effect[];
}

export interface Triggers {
  onPlay?: Effect[];
  onDeath?: Effect[];
  onTurnStart?: Effect[];
}

export interface StatAura {
  atk: number;
  def: number;
}

interface CardBase {
  id: string;
  name: string;
  type: CardType;
  faction: Faction;
  rarity: Rarity;
  /** Rules text shown on the card face. */
  description: string;
  /** Short line of flavor, optional. */
  flavor?: string;
  /** Asset key resolved through the central asset manifest. */
  art: string;
}

export interface CreatureDef extends CardBase {
  type: 'CREATURE';
  cost: number;
  /** How many landscapes of this card's faction its owner must control. Rainbow cards use 0. */
  landRequirement: number;
  attack: number;
  defense: number;
  keywords: Keyword[];
  attackRestriction: AttackRestriction;
  floop?: ActivatedAbility;
  triggers?: Triggers;
  /** Special scaling rule evaluated by the stats module. */
  dynamicAttack?: 'PER_ADJACENT_FRIENDLY';
}

export interface BuildingDef extends CardBase {
  type: 'BUILDING';
  cost: number;
  landRequirement: number;
  /** Passive bonus to the friendly creature standing in the same lane. */
  laneAura?: StatAura;
  floop?: ActivatedAbility;
  triggers?: Pick<Triggers, 'onTurnStart'>;
}

export interface SpellDef extends CardBase {
  type: 'SPELL';
  cost: number;
  landRequirement: number;
  target: TargetRule;
  effects: Effect[];
}

export interface LandscapeDef extends CardBase {
  type: 'LANDSCAPE';
  faction: LandFaction;
  /** Visual theme id used by the renderer for lane backdrops. */
  theme: string;
  /** Passive bonus for any friendly creature standing on this landscape. */
  laneAura?: StatAura;
  triggers?: Pick<Triggers, 'onTurnStart'>;
}

export interface HeroDef extends CardBase {
  type: 'HERO';
  maxHp: number;
  portrait: string;
  ability: ActivatedAbility & { cooldown: number };
  playstyle: string;
}

export type PlayableDef = CreatureDef | BuildingDef | SpellDef;
export type CardDef = PlayableDef | LandscapeDef | HeroDef;

export const FACTION_NAMES: Record<Faction, string> = {
  BLUE_PLAINS: 'Blue Plains',
  CORN_FIELDS: 'Corn Fields',
  USELESS_SWAMP: 'Useless Swamp',
  NICE_LANDS: 'Nice Lands',
  RAINBOW: 'Rainbow',
};
