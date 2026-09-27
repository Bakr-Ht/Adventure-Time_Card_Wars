import { getCard } from '../../src/game/data/cards';
import { makeCreature } from '../../src/game/effects/resolve';
import { applyAction } from '../../src/game/rules/engine';
import type { Action } from '../../src/game/rules/actions';
import { createGame } from '../../src/game/state/create';
import type { CreatureInstance, GameState, PlayerId } from '../../src/game/state/types';

let counter = 0;

/** A fresh Finn (P1) vs Jake (P2) game on P1's first turn with empty hands and boards. */
export function blankGame(seed = 7): GameState {
  const { state } = createGame({ seed, p1Deck: 'finn', p2Deck: 'jake', firstPlayer: 'P1' });
  for (const p of Object.values(state.players)) {
    p.hand = [];
    for (const lane of p.lanes) {
      lane.creature = null;
      lane.building = null;
    }
    p.ap = 2;
  }
  state.log = [];
  return state;
}

export function give(state: GameState, player: PlayerId, defId: string): string {
  getCard(defId);
  const uid = `t${++counter}`;
  state.players[player].hand.push({ uid, defId });
  return uid;
}

export function place(
  state: GameState,
  player: PlayerId,
  lane: number,
  defId: string,
  patch: Partial<CreatureInstance> = {},
): string {
  const uid = `t${++counter}`;
  state.players[player].lanes[lane].creature = { ...makeCreature(uid, defId, player), drowsy: false, ...patch };
  return uid;
}

export function build(state: GameState, player: PlayerId, lane: number, defId: string): string {
  const uid = `t${++counter}`;
  state.players[player].lanes[lane].building = { uid, defId, owner: player, flooped: false };
  return uid;
}

export function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Action rejected: ${result.reason}`);
  return result.state;
}

export function reject(state: GameState, action: Action): string {
  const result = applyAction(state, action);
  if (result.ok) throw new Error('Expected action to be rejected');
  return result.reason;
}
