import { getHero, getPlayable } from '../data/cards';
import type { Action } from '../rules/actions';
import {
  canDrawCard,
  canFloop,
  canPlayCard,
  canUseHero,
  floopAbilityOf,
  validLanes,
  validTargets,
} from '../rules/legality';
import type { GameState, PlayerId } from '../state/types';

/** Every concrete, legal action except ending the turn. */
export function enumerateActions(state: GameState, me: PlayerId): Action[] {
  const out: Action[] = [];
  const player = state.players[me];

  const seen = new Set<string>();
  for (const card of player.hand) {
    // Identical cards produce identical outcomes; only consider one copy.
    if (seen.has(card.defId)) continue;
    seen.add(card.defId);
    if (!canPlayCard(state, me, card.uid).ok) continue;
    const def = getPlayable(card.defId);
    if (def.type === 'SPELL') {
      if (def.target === 'NONE') out.push({ type: 'PLAY_CARD', player: me, cardUid: card.uid });
      for (const targetUid of validTargets(state, me, def.target, def.effects)) {
        out.push({ type: 'PLAY_CARD', player: me, cardUid: card.uid, targetUid });
      }
    } else {
      for (const lane of validLanes(state, me, def.id)) {
        out.push({ type: 'PLAY_CARD', player: me, cardUid: card.uid, lane });
      }
    }
  }

  for (const lane of player.lanes) {
    for (const source of [lane.creature, lane.building]) {
      if (!source || !canFloop(state, me, source.uid).ok) continue;
      const ability = floopAbilityOf(state, source.uid)!;
      if (ability.target === 'NONE') out.push({ type: 'FLOOP', player: me, sourceUid: source.uid });
      for (const targetUid of validTargets(state, me, ability.target, ability.effects)) {
        out.push({ type: 'FLOOP', player: me, sourceUid: source.uid, targetUid });
      }
    }
  }

  if (canUseHero(state, me).ok) {
    const ability = getHero(player.heroId).ability;
    if (ability.target === 'NONE') out.push({ type: 'HERO_ABILITY', player: me });
    for (const targetUid of validTargets(state, me, ability.target, ability.effects)) {
      out.push({ type: 'HERO_ABILITY', player: me, targetUid });
    }
  }

  if (canDrawCard(state, me).ok) out.push({ type: 'DRAW_CARD', player: me });
  return out;
}
