import type { CardRef, PlayerId } from '../state/types';

/**
 * The engine emits an ordered list of events for every action. The renderer
 * replays them as animations; the rules never depend on them.
 */
export type GameEvent =
  | { type: 'TURN_START'; player: PlayerId; turn: number }
  | { type: 'TURN_END'; player: PlayerId }
  | { type: 'DRAW'; player: PlayerId; card: CardRef; burned: boolean }
  | { type: 'FATIGUE'; player: PlayerId; amount: number }
  | { type: 'AP'; player: PlayerId; ap: number }
  | { type: 'PLAY_CREATURE'; player: PlayerId; card: CardRef; lane: number; replaced: CardRef | null }
  | { type: 'PLAY_BUILDING'; player: PlayerId; card: CardRef; lane: number; replaced: CardRef | null }
  | { type: 'CAST_SPELL'; player: PlayerId; card: CardRef; targetUid: string | null }
  | { type: 'SUMMON'; player: PlayerId; card: CardRef; lane: number }
  | { type: 'FLOOP'; player: PlayerId; uid: string; lane: number; source: 'CREATURE' | 'BUILDING' }
  | { type: 'HERO_ABILITY'; player: PlayerId; heroId: string; targetUid: string | null }
  | { type: 'FIGHT_PHASE'; player: PlayerId }
  | { type: 'ATTACK'; player: PlayerId; uid: string; lane: number; target: 'CREATURE' | 'HERO'; targetUid: string | null }
  | { type: 'CREATURE_DAMAGE'; player: PlayerId; uid: string; lane: number; amount: number }
  | { type: 'HERO_DAMAGE'; player: PlayerId; amount: number; hp: number }
  | { type: 'CREATURE_HEAL'; player: PlayerId; uid: string; lane: number; amount: number }
  | { type: 'HERO_HEAL'; player: PlayerId; amount: number; hp: number }
  | { type: 'BUFF'; player: PlayerId; uid: string; lane: number; atk: number; def: number }
  | { type: 'FREEZE'; player: PlayerId; uid: string; lane: number }
  | { type: 'MOVE'; player: PlayerId; uid: string; from: number; to: number }
  | { type: 'CREATURE_DESTROYED'; player: PlayerId; card: CardRef; lane: number }
  | { type: 'BUILDING_DESTROYED'; player: PlayerId; card: CardRef; lane: number }
  | { type: 'LOG'; text: string; tone: LogTone }
  | { type: 'GAME_OVER'; winner: PlayerId };

export type LogTone = 'neutral' | 'damage' | 'heal' | 'play' | 'floop' | 'turn' | 'death';
