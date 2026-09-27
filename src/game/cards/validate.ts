import type { ActivatedAbility, CardDef, Effect, TargetRule } from './types';
import { allCards, getCard, hasCard } from '../data/cards';
import { DECK_SIZE, expandDeck, type DeckList } from '../data/decks';
import { ACTION_POINTS_PER_TURN } from '../rules/turn';

const usesTarget = (effects: Effect[]) => effects.some((e) => 'to' in e && e.to === 'TARGET');

function checkTargeting(where: string, rule: TargetRule, effects: Effect[], errors: string[]): void {
  if (usesTarget(effects) && rule === 'NONE') errors.push(`${where}: effect targets TARGET but target rule is NONE`);
  if (!usesTarget(effects) && rule !== 'NONE') errors.push(`${where}: asks for a target it never uses`);
  for (const e of effects) {
    if (e.kind === 'DESTROY_BUILDING' && rule !== 'ENEMY_BUILDING') errors.push(`${where}: DESTROY_BUILDING needs ENEMY_BUILDING`);
    if (e.kind === 'SUMMON' && !hasCard(e.tokenId)) errors.push(`${where}: unknown token ${e.tokenId}`);
  }
}

function checkAbility(where: string, ability: ActivatedAbility | undefined, errors: string[]): void {
  if (!ability) return;
  if (ability.cost < 0 || ability.cost > ACTION_POINTS_PER_TURN) errors.push(`${where}: ability cost out of range`);
  checkTargeting(where, ability.target, ability.effects, errors);
}

/** Returns human-readable problems with a card definition (empty when valid). */
export function validateCard(def: CardDef): string[] {
  const errors: string[] = [];
  const where = `${def.id}`;
  if (!def.name.trim()) errors.push(`${where}: missing name`);
  if (!def.description.trim()) errors.push(`${where}: missing description`);
  switch (def.type) {
    case 'CREATURE':
      if (def.cost < 0 || def.cost > ACTION_POINTS_PER_TURN) errors.push(`${where}: cost must be 0..${ACTION_POINTS_PER_TURN}`);
      if (def.landRequirement < 0 || def.landRequirement > 4) errors.push(`${where}: landRequirement must be 0..4`);
      if (def.faction === 'RAINBOW' && def.landRequirement !== 0) errors.push(`${where}: rainbow cards need no landscapes`);
      if (def.attack < 0) errors.push(`${where}: negative attack`);
      if (def.defense <= 0) errors.push(`${where}: defense must be positive`);
      if (def.attackRestriction === 'CANNOT_ATTACK' && def.keywords.includes('PIERCE')) errors.push(`${where}: a wall cannot pierce`);
      checkAbility(`${where}.floop`, def.floop, errors);
      for (const effects of Object.values(def.triggers ?? {})) {
        if (effects && usesTarget(effects)) errors.push(`${where}: triggers cannot use TARGET`);
      }
      break;
    case 'BUILDING':
      if (def.cost < 0 || def.cost > ACTION_POINTS_PER_TURN) errors.push(`${where}: cost must be 0..${ACTION_POINTS_PER_TURN}`);
      if (!def.laneAura && !def.floop && !def.triggers) errors.push(`${where}: building does nothing`);
      checkAbility(`${where}.floop`, def.floop, errors);
      break;
    case 'SPELL':
      if (def.cost < 0 || def.cost > ACTION_POINTS_PER_TURN) errors.push(`${where}: cost must be 0..${ACTION_POINTS_PER_TURN}`);
      if (def.effects.length === 0) errors.push(`${where}: spell has no effects`);
      checkTargeting(where, def.target, def.effects, errors);
      break;
    case 'HERO':
      if (def.maxHp <= 0) errors.push(`${where}: hero needs HP`);
      checkAbility(`${where}.ability`, def.ability, errors);
      break;
    case 'LANDSCAPE':
      break;
  }
  return errors;
}

export function validateDeck(deck: DeckList): string[] {
  const errors: string[] = [];
  const ids = expandDeck(deck);
  if (ids.length !== DECK_SIZE) errors.push(`${deck.id}: has ${ids.length} cards, expected ${DECK_SIZE}`);
  if (!hasCard(deck.heroId) || getCard(deck.heroId).type !== 'HERO') errors.push(`${deck.id}: bad hero`);
  for (const land of deck.landscapes) {
    if (!hasCard(land) || getCard(land).type !== 'LANDSCAPE') errors.push(`${deck.id}: bad landscape ${land}`);
  }
  const landFactions = new Set(deck.landscapes.filter(hasCard).map((l) => getCard(l).faction));
  for (const id of new Set(ids)) {
    if (!hasCard(id)) {
      errors.push(`${deck.id}: unknown card ${id}`);
      continue;
    }
    const def = getCard(id);
    if (def.type === 'LANDSCAPE' || def.type === 'HERO') errors.push(`${deck.id}: ${id} cannot be shuffled into a deck`);
    if (def.type === 'CREATURE' && def.keywords.includes('TOKEN')) errors.push(`${deck.id}: token ${id} in deck`);
    if (def.faction !== 'RAINBOW' && !landFactions.has(def.faction)) errors.push(`${deck.id}: ${id} can never be played (no ${def.faction} landscape)`);
  }
  return errors;
}

export function validateAllCards(): string[] {
  return allCards().flatMap(validateCard);
}
