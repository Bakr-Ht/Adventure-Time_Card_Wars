/**
 * GameState is a plain, serializable object (no classes, no functions) so it
 * can be cloned for AI simulation, snapshotted for debugging, and sent over a
 * network later without changes.
 */

export type PlayerId = 'P1' | 'P2';

export const LANE_COUNT = 4;

/** A physical card in a deck, hand or discard pile. */
export interface CardRef {
  uid: string;
  defId: string;
}

export interface CreatureInstance extends CardRef {
  owner: PlayerId;
  /** Damage accumulates and persists until healed. */
  damage: number;
  /** Permanent stat changes from effects. */
  atkMod: number;
  defMod: number;
  /** Stat changes that expire at the end of the current turn. */
  tempAtk: number;
  tempDef: number;
  /** FLOOPed creatures are turned sideways and do not fight this turn. */
  flooped: boolean;
  /** Arrived this turn; cannot fight unless HASTY. */
  drowsy: boolean;
  /** Frozen creatures skip their owner's next fight and cannot FLOOP. */
  frozen: boolean;
  hasAttacked: boolean;
}

export interface BuildingInstance extends CardRef {
  owner: PlayerId;
  flooped: boolean;
}

export interface LaneState {
  index: number;
  landscapeId: string;
  creature: CreatureInstance | null;
  building: BuildingInstance | null;
}

export interface PlayerState {
  id: PlayerId;
  deckId: string;
  heroId: string;
  hp: number;
  maxHp: number;
  ap: number;
  deck: CardRef[];
  hand: CardRef[];
  discard: CardRef[];
  lanes: LaneState[];
  /** Turns remaining before the hero ability can be used again. */
  heroCooldown: number;
  isAI: boolean;
}

export type Phase = 'MAIN' | 'GAME_OVER';

export interface GameState {
  seed: number;
  /** Mutable RNG cursor; every random roll advances it deterministically. */
  rng: number;
  turn: number;
  activePlayer: PlayerId;
  firstPlayer: PlayerId;
  phase: Phase;
  winner: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
  nextUid: number;
  log: string[];
}

export function opponentOf(id: PlayerId): PlayerId {
  return id === 'P1' ? 'P2' : 'P1';
}
