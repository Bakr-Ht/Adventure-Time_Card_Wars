import { getHero, getPlayable } from '../data/cards';
import type { GameEvent } from '../events/types';
import { makeCreature, resolveEffects } from '../effects/resolve';
import { checkGameOver } from '../effects/primitives';
import { cardName, findBuilding, findCreature, heroShortName } from '../state/queries';
import { opponentOf, type GameState, type PlayerId } from '../state/types';
import type { Action } from './actions';
import { emit, log, type Ctx } from './context';
import { floopAbilityOf, validateAction } from './legality';
import { endTurn } from './turn';
import { discardCard, drawCards } from './zones';

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: string };

function spendAp(ctx: Ctx, player: PlayerId, amount: number): void {
  if (amount <= 0) return;
  const p = ctx.state.players[player];
  p.ap -= amount;
  emit(ctx, { type: 'AP', player, ap: p.ap });
}

function playCard(ctx: Ctx, player: PlayerId, cardUid: string, lane: number | undefined, targetUid: string | undefined): void {
  const p = ctx.state.players[player];
  const index = p.hand.findIndex((c) => c.uid === cardUid);
  const [card] = p.hand.splice(index, 1);
  const def = getPlayable(card.defId);
  spendAp(ctx, player, def.cost);

  if (def.type === 'SPELL') {
    emit(ctx, { type: 'CAST_SPELL', player, card, targetUid: targetUid ?? null });
    log(ctx, `${heroShortName(ctx.state, player)} casts ${def.name}.`, 'play');
    resolveEffects(ctx, def.effects, { player, lane: null, uid: card.uid }, targetUid ?? null);
    discardCard(ctx, player, card);
    return;
  }

  const slot = p.lanes[lane!];
  if (def.type === 'CREATURE') {
    const replaced = slot.creature;
    if (replaced) discardCard(ctx, player, replaced);
    slot.creature = makeCreature(card.uid, card.defId, player);
    emit(ctx, { type: 'PLAY_CREATURE', player, card, lane: slot.index, replaced: replaced ? { uid: replaced.uid, defId: replaced.defId } : null });
    log(ctx, replaced
      ? `${def.name} replaces ${cardName(replaced.defId)} in lane ${slot.index + 1}.`
      : `${heroShortName(ctx.state, player)} plays ${def.name} in lane ${slot.index + 1}.`, 'play');
    if (def.triggers?.onPlay) resolveEffects(ctx, def.triggers.onPlay, { player, lane: slot.index, uid: card.uid }, targetUid ?? null);
    return;
  }

  const replaced = slot.building;
  if (replaced) discardCard(ctx, player, replaced);
  slot.building = { uid: card.uid, defId: card.defId, owner: player, flooped: false };
  emit(ctx, { type: 'PLAY_BUILDING', player, card, lane: slot.index, replaced: replaced ? { uid: replaced.uid, defId: replaced.defId } : null });
  log(ctx, `${heroShortName(ctx.state, player)} builds ${def.name} in lane ${slot.index + 1}.`, 'play');
}

function floop(ctx: Ctx, player: PlayerId, uid: string, targetUid: string | undefined): void {
  const ability = floopAbilityOf(ctx.state, uid)!;
  const c = findCreature(ctx.state, uid);
  const b = c ? null : findBuilding(ctx.state, uid);
  const lane = (c?.lane ?? b?.lane)!.index;
  if (c) c.creature.flooped = true;
  if (b) b.building.flooped = true;
  spendAp(ctx, player, ability.cost);
  const name = cardName((c?.creature ?? b?.building)!.defId);
  emit(ctx, { type: 'FLOOP', player, uid, lane, source: c ? 'CREATURE' : 'BUILDING' });
  log(ctx, `${name} FLOOPs: ${ability.name}!`, 'floop');
  resolveEffects(ctx, ability.effects, { player, lane, uid }, targetUid ?? null);
}

function heroAbility(ctx: Ctx, player: PlayerId, targetUid: string | undefined): void {
  const p = ctx.state.players[player];
  const hero = getHero(p.heroId);
  spendAp(ctx, player, hero.ability.cost);
  p.heroCooldown = hero.ability.cooldown;
  emit(ctx, { type: 'HERO_ABILITY', player, heroId: hero.id, targetUid: targetUid ?? null });
  log(ctx, `${heroShortName(ctx.state, player)} uses ${hero.ability.name}!`, 'floop');
  resolveEffects(ctx, hero.ability.effects, { player, lane: null, uid: null }, targetUid ?? null);
}

/**
 * The only way game state changes. Validates, clones, applies, and returns
 * the new state plus the events that explain what happened.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  const check = validateAction(state, action);
  if (!check.ok) return { ok: false, reason: check.reason };

  const ctx: Ctx = { state: structuredClone(state), events: [] };
  switch (action.type) {
    case 'PLAY_CARD':
      playCard(ctx, action.player, action.cardUid, action.lane, action.targetUid);
      break;
    case 'FLOOP':
      floop(ctx, action.player, action.sourceUid, action.targetUid);
      break;
    case 'HERO_ABILITY':
      heroAbility(ctx, action.player, action.targetUid);
      break;
    case 'DRAW_CARD':
      spendAp(ctx, action.player, 1);
      log(ctx, `${heroShortName(ctx.state, action.player)} spends an action to draw.`);
      drawCards(ctx, action.player, 1);
      break;
    case 'END_TURN':
      endTurn(ctx, action.player);
      break;
    case 'CONCEDE':
      ctx.state.players[action.player].hp = Math.min(0, ctx.state.players[action.player].hp);
      log(ctx, `${heroShortName(ctx.state, action.player)} concedes.`, 'turn');
      checkGameOver(ctx);
      if (ctx.state.winner === null) ctx.state.winner = opponentOf(action.player);
      break;
  }
  return { ok: true, state: ctx.state, events: ctx.events };
}
