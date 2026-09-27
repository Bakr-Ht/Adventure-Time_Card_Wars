import type { ActivatedAbility, Effect, PlayableDef, TargetRule } from '../cards/types';
import { FACTION_NAMES } from '../cards/types';
import { getBuilding, getCreature, getHero, getPlayable } from '../data/cards';
import {
  countLandscapes,
  findBuilding,
  findCreature,
  isLaneCompatible,
} from '../state/queries';
import { opponentOf, type GameState, type PlayerId } from '../state/types';
import { fail, OK, type Action, type Check } from './actions';

/** Uids that satisfy a target rule, optionally filtered by what the effects need to succeed. */
export function validTargets(state: GameState, player: PlayerId, rule: TargetRule, effects: Effect[] = []): string[] {
  const me = state.players[player];
  const foe = state.players[opponentOf(player)];
  const creatures = (p: typeof me) => p.lanes.flatMap((l) => (l.creature ? [l.creature.uid] : []));
  let out: string[];
  switch (rule) {
    case 'NONE':
      return [];
    case 'FRIENDLY_CREATURE':
      out = creatures(me);
      break;
    case 'ENEMY_CREATURE':
      out = creatures(foe);
      break;
    case 'ANY_CREATURE':
      out = [...creatures(me), ...creatures(foe)];
      break;
    case 'ENEMY_BUILDING':
      out = foe.lanes.flatMap((l) => (l.building ? [l.building.uid] : []));
      break;
  }
  if (effects.some((e) => e.kind === 'MOVE_ADJACENT')) {
    out = out.filter((uid) => {
      const loc = findCreature(state, uid);
      if (!loc) return false;
      const def = getCreature(loc.creature.defId);
      return [loc.lane.index - 1, loc.lane.index + 1].some((i) => {
        const lane = loc.player.lanes[i];
        return lane !== undefined && lane.creature === null && isLaneCompatible(lane, def.faction);
      });
    });
  }
  return out;
}

function needsTarget(rule: TargetRule): boolean {
  return rule !== 'NONE';
}

function checkTurn(state: GameState, player: PlayerId): Check {
  if (state.phase === 'GAME_OVER') return fail('The game is over');
  if (state.activePlayer !== player) return fail('Not your turn');
  return OK;
}

export function landRequirementCheck(state: GameState, player: PlayerId, def: PlayableDef): Check {
  if (def.landRequirement <= 0 || def.faction === 'RAINBOW') return OK;
  const have = countLandscapes(state.players[player], def.faction);
  if (have < def.landRequirement) {
    return fail(`Needs ${def.landRequirement} ${FACTION_NAMES[def.faction]} landscapes`);
  }
  return OK;
}

/** Lanes a creature or building could be placed in (occupied lanes mean replacing). */
export function validLanes(state: GameState, player: PlayerId, defId: string): number[] {
  const def = getPlayable(defId);
  if (def.type === 'SPELL') return [];
  return state.players[player].lanes.filter((l) => isLaneCompatible(l, def.faction)).map((l) => l.index);
}

/** Can this card be played at all right now? Reasons are written for players. */
export function canPlayCard(state: GameState, player: PlayerId, cardUid: string): Check {
  const turn = checkTurn(state, player);
  if (!turn.ok) return turn;
  const card = state.players[player].hand.find((c) => c.uid === cardUid);
  if (!card) return fail('Card is not in your hand');
  const def = getPlayable(card.defId);
  if (state.players[player].ap < def.cost) return fail('Not enough Action Points');
  const land = landRequirementCheck(state, player, def);
  if (!land.ok) return land;
  if (def.type === 'SPELL') {
    if (needsTarget(def.target) && validTargets(state, player, def.target, def.effects).length === 0) {
      return fail('No valid target');
    }
    return OK;
  }
  if (validLanes(state, player, def.id).length === 0) return fail('Wrong Landscape');
  return OK;
}

function abilityCheck(state: GameState, player: PlayerId, ability: ActivatedAbility): Check {
  if (state.players[player].ap < ability.cost) return fail('Not enough Action Points');
  if (needsTarget(ability.target) && validTargets(state, player, ability.target, ability.effects).length === 0) {
    return fail('No valid target');
  }
  return OK;
}

export function floopAbilityOf(state: GameState, uid: string): ActivatedAbility | null {
  const c = findCreature(state, uid);
  if (c) return getCreature(c.creature.defId).floop ?? null;
  const b = findBuilding(state, uid);
  if (b) return getBuilding(b.building.defId).floop ?? null;
  return null;
}

export function canFloop(state: GameState, player: PlayerId, uid: string): Check {
  const turn = checkTurn(state, player);
  if (!turn.ok) return turn;
  const c = findCreature(state, uid);
  const b = c ? null : findBuilding(state, uid);
  const owner = c?.player.id ?? b?.player.id;
  if (!owner) return fail('Nothing to FLOOP');
  if (owner !== player) return fail('That card belongs to your opponent');
  const ability = floopAbilityOf(state, uid);
  if (!ability) return fail('This card has no FLOOP ability');
  if (c?.creature.flooped || b?.building.flooped) return fail('Already FLOOPed this turn');
  if (c?.creature.frozen) return fail('Frozen — cannot FLOOP');
  return abilityCheck(state, player, ability);
}

export function canUseHero(state: GameState, player: PlayerId): Check {
  const turn = checkTurn(state, player);
  if (!turn.ok) return turn;
  const p = state.players[player];
  if (p.heroCooldown > 0) return fail(`Recharging: ${p.heroCooldown} more turn${p.heroCooldown > 1 ? 's' : ''}`);
  return abilityCheck(state, player, getHero(p.heroId).ability);
}

export function canDrawCard(state: GameState, player: PlayerId): Check {
  const turn = checkTurn(state, player);
  if (!turn.ok) return turn;
  if (state.players[player].ap < 1) return fail('Not enough Action Points');
  if (state.players[player].deck.length === 0) return fail('Your deck is empty');
  return OK;
}

function targetCheck(state: GameState, player: PlayerId, rule: TargetRule, effects: Effect[], targetUid?: string): Check {
  if (!needsTarget(rule)) return OK;
  if (!targetUid) return fail('Target required');
  if (!validTargets(state, player, rule, effects).includes(targetUid)) return fail('Invalid target');
  return OK;
}

/** Full validation of a concrete action, including lane and target choices. */
export function validateAction(state: GameState, action: Action): Check {
  switch (action.type) {
    case 'PLAY_CARD': {
      const base = canPlayCard(state, action.player, action.cardUid);
      if (!base.ok) return base;
      const card = state.players[action.player].hand.find((c) => c.uid === action.cardUid);
      const def = getPlayable(card!.defId);
      if (def.type === 'SPELL') return targetCheck(state, action.player, def.target, def.effects, action.targetUid);
      if (action.lane === undefined) return fail('Choose a lane');
      if (!validLanes(state, action.player, def.id).includes(action.lane)) return fail('Wrong Landscape');
      return OK;
    }
    case 'FLOOP': {
      const base = canFloop(state, action.player, action.sourceUid);
      if (!base.ok) return base;
      const ability = floopAbilityOf(state, action.sourceUid)!;
      return targetCheck(state, action.player, ability.target, ability.effects, action.targetUid);
    }
    case 'HERO_ABILITY': {
      const base = canUseHero(state, action.player);
      if (!base.ok) return base;
      const ability = getHero(state.players[action.player].heroId).ability;
      return targetCheck(state, action.player, ability.target, ability.effects, action.targetUid);
    }
    case 'DRAW_CARD':
      return canDrawCard(state, action.player);
    case 'END_TURN':
    case 'CONCEDE':
      return checkTurn(state, action.player);
  }
}
