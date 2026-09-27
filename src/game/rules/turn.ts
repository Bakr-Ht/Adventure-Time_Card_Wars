import { runFightPhase } from '../combat/combat';
import { getBuilding, getCreature, getLandscape } from '../data/cards';
import { checkDeaths, resolveEffects } from '../effects/resolve';
import { heroShortName } from '../state/queries';
import { opponentOf, type PlayerId } from '../state/types';
import { emit, isOver, log, type Ctx } from './context';
import { drawCards } from './zones';

export const ACTION_POINTS_PER_TURN = 2;
/** Safety valve: a game this long is called on HP so nothing can loop forever. */
export const TURN_LIMIT = 120;

export function startTurn(ctx: Ctx, id: PlayerId): void {
  const { state } = ctx;
  const player = state.players[id];
  state.activePlayer = id;
  state.turn += 1;
  // Going first is an advantage, so the opening turn gets one fewer action.
  player.ap = state.turn === 1 ? ACTION_POINTS_PER_TURN - 1 : ACTION_POINTS_PER_TURN;
  player.heroCooldown = Math.max(0, player.heroCooldown - 1);

  for (const lane of player.lanes) {
    if (lane.creature) {
      lane.creature.flooped = false;
      lane.creature.drowsy = false;
      lane.creature.hasAttacked = false;
    }
    if (lane.building) lane.building.flooped = false;
  }

  emit(ctx, { type: 'TURN_START', player: id, turn: state.turn });
  emit(ctx, { type: 'AP', player: id, ap: player.ap });
  log(ctx, `Turn ${state.turn}: ${heroShortName(state, id)}'s move.`, 'turn');

  // Landscapes, then buildings, then creatures — each in lane order.
  for (const lane of player.lanes) {
    const effects = getLandscape(lane.landscapeId).triggers?.onTurnStart;
    if (effects) resolveEffects(ctx, effects, { player: id, lane: lane.index, uid: null }, null);
  }
  for (const lane of player.lanes) {
    const effects = lane.building ? getBuilding(lane.building.defId).triggers?.onTurnStart : undefined;
    if (effects && lane.building) resolveEffects(ctx, effects, { player: id, lane: lane.index, uid: lane.building.uid }, null);
  }
  for (const lane of player.lanes) {
    const effects = lane.creature ? getCreature(lane.creature.defId).triggers?.onTurnStart : undefined;
    if (effects && lane.creature) resolveEffects(ctx, effects, { player: id, lane: lane.index, uid: lane.creature.uid }, null);
  }

  // The player who goes first skips their very first draw.
  const skipDraw = state.turn === 1 && id === state.firstPlayer;
  if (!skipDraw) drawCards(ctx, id, 1);
}

export function endTurn(ctx: Ctx, id: PlayerId): void {
  const { state } = ctx;
  runFightPhase(ctx, id);
  if (isOver(ctx)) return;

  for (const player of Object.values(state.players)) {
    for (const lane of player.lanes) {
      const c = lane.creature;
      if (!c) continue;
      c.tempAtk = 0;
      c.tempDef = 0;
      if (player.id === id) c.frozen = false;
    }
  }
  checkDeaths(ctx);
  if (isOver(ctx)) return;
  emit(ctx, { type: 'TURN_END', player: id });

  if (state.turn >= TURN_LIMIT) {
    const [p1, p2] = [state.players.P1, state.players.P2];
    state.phase = 'GAME_OVER';
    state.winner = p1.hp >= p2.hp ? 'P1' : 'P2';
    emit(ctx, { type: 'GAME_OVER', winner: state.winner });
    log(ctx, `Time! ${heroShortName(state, state.winner)} wins on hit points.`, 'turn');
    return;
  }
  startTurn(ctx, opponentOf(id));
}
