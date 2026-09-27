import type { PlayerId } from '../state/types';

/** Everything a player (human, AI or future network peer) can ask the engine to do. */
export type Action =
  | { type: 'PLAY_CARD'; player: PlayerId; cardUid: string; lane?: number; targetUid?: string }
  | { type: 'FLOOP'; player: PlayerId; sourceUid: string; targetUid?: string }
  | { type: 'HERO_ABILITY'; player: PlayerId; targetUid?: string }
  | { type: 'DRAW_CARD'; player: PlayerId }
  | { type: 'END_TURN'; player: PlayerId }
  | { type: 'CONCEDE'; player: PlayerId };

export type Check = { ok: true } | { ok: false; reason: string };

export const OK: Check = { ok: true };
export const fail = (reason: string): Check => ({ ok: false, reason });
