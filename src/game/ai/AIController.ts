import type { Action } from '../rules/actions';
import { applyAction } from '../rules/engine';
import type { GameState, PlayerId } from '../state/types';
import { evaluate, type Evaluation } from './evaluate';
import { enumerateActions } from './legalActions';

export interface ScoredAction {
  action: Action;
  score: number;
  breakdown: Evaluation;
}

/** Minimum gain over simply ending the turn before the AI bothers acting. */
const ACT_THRESHOLD = 0.25;
/** Hard cap on actions per turn so a scoring quirk can never stall the game. */
export const MAX_ACTIONS_PER_TURN = 24;

/**
 * Looks one action ahead, then plays out the rest of the turn as "fight now"
 * so every candidate is judged by where it leaves the board after combat.
 */
function scoreAfterFight(state: GameState, me: PlayerId): Evaluation {
  if (state.phase === 'GAME_OVER') return evaluate(state, me);
  const ended = applyAction(state, { type: 'END_TURN', player: me });
  return evaluate(ended.ok ? ended.state : state, me);
}

export function rankActions(state: GameState, me: PlayerId): ScoredAction[] {
  const ranked: ScoredAction[] = [];
  for (const action of enumerateActions(state, me)) {
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const breakdown = scoreAfterFight(result.state, me);
    ranked.push({ action, score: breakdown.total, breakdown });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/** Chooses the next action for `me`. Returns END_TURN when nothing beats fighting now. */
export function chooseAction(state: GameState, me: PlayerId, actionsTakenThisTurn = 0): ScoredAction {
  const baseline = scoreAfterFight(state, me);
  const endTurn: ScoredAction = { action: { type: 'END_TURN', player: me }, score: baseline.total, breakdown: baseline };
  if (state.phase === 'GAME_OVER' || state.activePlayer !== me) return endTurn;
  if (actionsTakenThisTurn >= MAX_ACTIONS_PER_TURN) return endTurn;
  const [best] = rankActions(state, me);
  if (!best || best.score < baseline.total + ACT_THRESHOLD) return endTurn;
  return best;
}

/** Plays a whole turn for `me` without animation. Used by tests and simulations. */
export function playFullTurn(state: GameState, me: PlayerId): GameState {
  let current = state;
  for (let i = 0; i <= MAX_ACTIONS_PER_TURN; i++) {
    const choice = chooseAction(current, me, i);
    const result = applyAction(current, choice.action);
    if (!result.ok) throw new Error(`AI chose an illegal action: ${result.reason}`);
    current = result.state;
    if (choice.action.type === 'END_TURN' || current.phase === 'GAME_OVER') return current;
  }
  const forced = applyAction(current, { type: 'END_TURN', player: me });
  return forced.ok ? forced.state : current;
}
