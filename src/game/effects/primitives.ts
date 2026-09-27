import { emit, log, type Ctx } from '../rules/context';
import { creatureStats } from '../rules/stats';
import { cardName, heroShortName } from '../state/queries';
import { opponentOf, type PlayerId } from '../state/types';

/** Applies damage to a creature. Returns how much of its remaining health was consumed. */
export function damageCreature(ctx: Ctx, owner: PlayerId, laneIndex: number, amount: number): number {
  const player = ctx.state.players[owner];
  const lane = player.lanes[laneIndex];
  const creature = lane.creature;
  if (!creature || amount <= 0) return 0;
  const before = creatureStats(player, lane).health;
  creature.damage += amount;
  emit(ctx, { type: 'CREATURE_DAMAGE', player: owner, uid: creature.uid, lane: laneIndex, amount });
  log(ctx, `${cardName(creature.defId)} takes ${amount} damage.`, 'damage');
  return Math.min(amount, Math.max(0, before));
}

export function healCreature(ctx: Ctx, owner: PlayerId, laneIndex: number, amount: number | 'FULL'): void {
  const creature = ctx.state.players[owner].lanes[laneIndex].creature;
  if (!creature || creature.damage <= 0) return;
  const healed = amount === 'FULL' ? creature.damage : Math.min(amount, creature.damage);
  if (healed <= 0) return;
  creature.damage -= healed;
  emit(ctx, { type: 'CREATURE_HEAL', player: owner, uid: creature.uid, lane: laneIndex, amount: healed });
  log(ctx, `${cardName(creature.defId)} heals ${healed}.`, 'heal');
}

export function damageHero(ctx: Ctx, owner: PlayerId, amount: number): void {
  const player = ctx.state.players[owner];
  if (amount <= 0) return;
  player.hp -= amount;
  emit(ctx, { type: 'HERO_DAMAGE', player: owner, amount, hp: player.hp });
  log(ctx, `${amount} damage dealt to ${heroShortName(ctx.state, owner)}.`, 'damage');
  checkGameOver(ctx);
}

export function healHero(ctx: Ctx, owner: PlayerId, amount: number | 'FULL'): void {
  const player = ctx.state.players[owner];
  const room = player.maxHp - player.hp;
  const healed = amount === 'FULL' ? room : Math.min(amount, room);
  if (healed <= 0) return;
  player.hp += healed;
  emit(ctx, { type: 'HERO_HEAL', player: owner, amount: healed, hp: player.hp });
  log(ctx, `${heroShortName(ctx.state, owner)} recovers ${healed} HP.`, 'heal');
}

/** The first hero to reach 0 HP loses; later damage in the same action cannot flip the result. */
export function checkGameOver(ctx: Ctx): void {
  const { state } = ctx;
  if (state.phase === 'GAME_OVER') return;
  const loser = (['P1', 'P2'] as const).find((id) => state.players[id].hp <= 0);
  if (!loser) return;
  state.phase = 'GAME_OVER';
  state.winner = opponentOf(loser);
  emit(ctx, { type: 'GAME_OVER', winner: state.winner });
  log(ctx, `${heroShortName(state, state.winner)} wins the Card War!`, 'turn');
}
