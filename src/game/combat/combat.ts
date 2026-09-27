import { getCreature } from '../data/cards';
import { checkDeaths } from '../effects/resolve';
import { damageCreature, damageHero } from '../effects/primitives';
import { emit, log, type Ctx } from '../rules/context';
import { creatureStats } from '../rules/stats';
import { cardName, heroShortName } from '../state/queries';
import { opponentOf, type GameState, type PlayerId } from '../state/types';

export type FightStatus =
  | { ready: true }
  | { ready: false; reason: string };

/** Why a creature will (or won't) swing in its owner's fight phase. Shared by UI, AI and combat. */
export function fightStatus(state: GameState, owner: PlayerId, laneIndex: number): FightStatus {
  const player = state.players[owner];
  const lane = player.lanes[laneIndex];
  const creature = lane.creature;
  if (!creature) return { ready: false, reason: 'Empty lane' };
  const def = getCreature(creature.defId);
  if (def.attackRestriction === 'CANNOT_ATTACK') return { ready: false, reason: 'Wall — never attacks' };
  if (creature.frozen) return { ready: false, reason: 'Frozen — skips this fight' };
  if (creature.flooped) return { ready: false, reason: 'FLOOPed — resting this turn' };
  if (creature.hasAttacked) return { ready: false, reason: 'Creature already acted' };
  if (creature.drowsy && !def.keywords.includes('HASTY')) return { ready: false, reason: 'Just arrived — fights next turn' };
  if (creatureStats(player, lane).attack <= 0) return { ready: false, reason: 'No ATK to fight with' };
  const blocked = state.players[opponentOf(owner)].lanes[laneIndex].creature === null;
  if (blocked && def.attackRestriction === 'CREATURES_ONLY') {
    return { ready: false, reason: 'Only fights creatures — lane is empty' };
  }
  return { ready: true };
}

/**
 * Resolves one creature's attack down its lane. Damage is one-directional
 * (as in Card Wars): defenders strike back on their own turn.
 */
export function resolveAttack(ctx: Ctx, owner: PlayerId, laneIndex: number): void {
  const { state } = ctx;
  if (!fightStatus(state, owner, laneIndex).ready) return;
  const player = state.players[owner];
  const lane = player.lanes[laneIndex];
  const attacker = lane.creature;
  if (!attacker) return;
  const def = getCreature(attacker.defId);
  const foe = opponentOf(owner);
  const defender = state.players[foe].lanes[laneIndex].creature;
  const { attack } = creatureStats(player, lane);
  attacker.hasAttacked = true;

  if (defender) {
    emit(ctx, { type: 'ATTACK', player: owner, uid: attacker.uid, lane: laneIndex, target: 'CREATURE', targetUid: defender.uid });
    log(ctx, `${def.name} attacks ${cardName(defender.defId)}.`, 'damage');
    const absorbed = damageCreature(ctx, foe, laneIndex, attack);
    const excess = attack - absorbed;
    if (def.keywords.includes('PIERCE') && excess > 0) {
      log(ctx, `${def.name} pierces through!`, 'damage');
      damageHero(ctx, foe, excess);
    }
  } else {
    emit(ctx, { type: 'ATTACK', player: owner, uid: attacker.uid, lane: laneIndex, target: 'HERO', targetUid: null });
    log(ctx, `${def.name} attacks ${heroShortName(state, foe)} directly.`, 'damage');
    damageHero(ctx, foe, attack);
  }
  checkDeaths(ctx);
}

/** Every ready creature fights, left lane to right lane. */
export function runFightPhase(ctx: Ctx, owner: PlayerId): void {
  emit(ctx, { type: 'FIGHT_PHASE', player: owner });
  for (let lane = 0; lane < ctx.state.players[owner].lanes.length; lane++) {
    if (ctx.state.phase === 'GAME_OVER') return;
    resolveAttack(ctx, owner, lane);
  }
}
