import { getCard } from '../data/cards';
import type { CardRef, PlayerId } from '../state/types';
import { cardName, heroShortName } from '../state/queries';
import { emit, log, type Ctx } from './context';
import { damageHero } from '../effects/primitives';

export const HAND_LIMIT = 8;
export const FATIGUE_DAMAGE = 2;

export function newUid(ctx: Ctx): string {
  const uid = `c${ctx.state.nextUid}`;
  ctx.state.nextUid += 1;
  return uid;
}

/** Tokens vanish instead of going to the discard pile. */
export function discardCard(ctx: Ctx, owner: PlayerId, card: CardRef): void {
  const def = getCard(card.defId);
  if (def.type === 'CREATURE' && def.keywords.includes('TOKEN')) return;
  ctx.state.players[owner].discard.push({ uid: card.uid, defId: card.defId });
}

/**
 * Draws from the top of the deck. An empty deck deals fatigue damage instead,
 * and a full hand burns the drawn card, so games always move toward an end.
 */
export function drawCards(ctx: Ctx, owner: PlayerId, count: number): void {
  const player = ctx.state.players[owner];
  for (let i = 0; i < count; i++) {
    if (ctx.state.phase === 'GAME_OVER') return;
    const card = player.deck.pop();
    if (!card) {
      emit(ctx, { type: 'FATIGUE', player: owner, amount: FATIGUE_DAMAGE });
      log(ctx, `${heroShortName(ctx.state, owner)}'s deck is empty! Fatigue deals ${FATIGUE_DAMAGE} damage.`, 'damage');
      damageHero(ctx, owner, FATIGUE_DAMAGE);
      continue;
    }
    if (player.hand.length >= HAND_LIMIT) {
      player.discard.push(card);
      emit(ctx, { type: 'DRAW', player: owner, card, burned: true });
      log(ctx, `${heroShortName(ctx.state, owner)}'s hand is full. ${cardName(card.defId)} is burned.`);
      continue;
    }
    player.hand.push(card);
    emit(ctx, { type: 'DRAW', player: owner, card, burned: false });
  }
}
