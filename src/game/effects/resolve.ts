import type { CreatureDef, Effect, Selector } from '../cards/types';
import { getCreature } from '../data/cards';
import { emit, log, type Ctx } from '../rules/context';
import { creatureStats } from '../rules/stats';
import { discardCard, drawCards, newUid } from '../rules/zones';
import {
  cardName,
  findBuilding,
  findCreature,
  isLaneCompatible,
} from '../state/queries';
import { opponentOf, type CreatureInstance, type PlayerId } from '../state/types';
import {
  damageCreature,
  damageHero,
  healCreature,
  healHero,
} from './primitives';

/** Where an effect comes from. `lane` anchors lane-relative selectors. */
export interface EffectSource {
  player: PlayerId;
  lane: number | null;
  uid: string | null;
}

type Resolved =
  | { kind: 'CREATURE'; owner: PlayerId; lane: number }
  | { kind: 'HERO'; owner: PlayerId };

export function makeCreature(uid: string, defId: string, owner: PlayerId): CreatureInstance {
  return {
    uid,
    defId,
    owner,
    damage: 0,
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    tempDef: 0,
    flooped: false,
    drowsy: true,
    frozen: false,
    hasAttacked: false,
  };
}

function creatureTarget(ctx: Ctx, uid: string | null): Resolved[] {
  if (!uid) return [];
  const loc = findCreature(ctx.state, uid);
  return loc ? [{ kind: 'CREATURE', owner: loc.player.id, lane: loc.lane.index }] : [];
}

function resolveSelector(ctx: Ctx, selector: Selector, source: EffectSource, targetUid: string | null): Resolved[] {
  const me = source.player;
  const foe = opponentOf(me);
  const players = ctx.state.players;
  const creaturesOf = (owner: PlayerId): Resolved[] =>
    players[owner].lanes
      .filter((lane) => lane.creature)
      .map((lane) => ({ kind: 'CREATURE', owner, lane: lane.index }));
  const at = (owner: PlayerId, lane: number | null): Resolved[] =>
    lane !== null && players[owner].lanes[lane]?.creature ? [{ kind: 'CREATURE', owner, lane }] : [];

  switch (selector) {
    case 'TARGET':
      return creatureTarget(ctx, targetUid);
    case 'SELF':
      return creatureTarget(ctx, source.uid);
    case 'LANE_CREATURE':
      return at(me, source.lane);
    case 'OPPOSING_CREATURE':
      return at(foe, source.lane);
    case 'OPPOSING_CREATURE_OR_HERO': {
      const hit = at(foe, source.lane);
      return hit.length > 0 ? hit : [{ kind: 'HERO', owner: foe }];
    }
    case 'ADJACENT_FRIENDLIES':
      return source.lane === null ? [] : [...at(me, source.lane - 1), ...at(me, source.lane + 1)];
    case 'ALL_FRIENDLY_CREATURES':
      return creaturesOf(me);
    case 'ALL_ENEMY_CREATURES':
      return creaturesOf(foe);
    case 'ENEMY_HERO':
      return [{ kind: 'HERO', owner: foe }];
    case 'FRIENDLY_HERO':
      return [{ kind: 'HERO', owner: me }];
  }
}

/** Empty neighbouring lanes, right side first, optionally filtered by faction. */
export function emptyAdjacentLanes(ctx: Ctx, owner: PlayerId, lane: number, def: CreatureDef | null): number[] {
  const lanes = ctx.state.players[owner].lanes;
  return [lane + 1, lane - 1].filter((i) => {
    const l = lanes[i];
    return l !== undefined && l.creature === null && (def === null || isLaneCompatible(l, def.faction));
  });
}

function moveCreature(ctx: Ctx, owner: PlayerId, from: number, to: number): void {
  const lanes = ctx.state.players[owner].lanes;
  const creature = lanes[from].creature;
  if (!creature) return;
  lanes[to].creature = creature;
  lanes[from].creature = null;
  emit(ctx, { type: 'MOVE', player: owner, uid: creature.uid, from, to });
}

function applyEffect(ctx: Ctx, effect: Effect, source: EffectSource, targetUid: string | null): void {
  const players = ctx.state.players;
  switch (effect.kind) {
    case 'DAMAGE':
      for (const t of resolveSelector(ctx, effect.to, source, targetUid)) {
        if (t.kind === 'HERO') damageHero(ctx, t.owner, effect.amount);
        else damageCreature(ctx, t.owner, t.lane, effect.amount);
      }
      return;
    case 'HEAL':
      for (const t of resolveSelector(ctx, effect.to, source, targetUid)) {
        if (t.kind === 'HERO') healHero(ctx, t.owner, effect.amount);
        else healCreature(ctx, t.owner, t.lane, effect.amount);
      }
      return;
    case 'BUFF':
      for (const t of resolveSelector(ctx, effect.to, source, targetUid)) {
        if (t.kind !== 'CREATURE') continue;
        const c = players[t.owner].lanes[t.lane].creature;
        if (!c) continue;
        if (effect.duration === 'PERMANENT') {
          c.atkMod += effect.atk;
          c.defMod += effect.def;
        } else {
          c.tempAtk += effect.atk;
          c.tempDef += effect.def;
        }
        emit(ctx, { type: 'BUFF', player: t.owner, uid: c.uid, lane: t.lane, atk: effect.atk, def: effect.def });
        const parts = [effect.atk && `${effect.atk > 0 ? '+' : ''}${effect.atk} ATK`, effect.def && `${effect.def > 0 ? '+' : ''}${effect.def} DEF`]
          .filter(Boolean)
          .join(' ');
        log(ctx, `${cardName(c.defId)} gets ${parts}${effect.duration === 'TURN' ? ' this turn' : ''}.`, 'play');
      }
      return;
    case 'DRAW':
      drawCards(ctx, source.player, effect.count);
      return;
    case 'SUMMON': {
      if (source.lane === null) return;
      const token = getCreature(effect.tokenId);
      const [lane] = emptyAdjacentLanes(ctx, source.player, source.lane, token);
      if (lane === undefined) {
        log(ctx, `No room to summon ${token.name}.`);
        return;
      }
      const card = { uid: newUid(ctx), defId: token.id };
      players[source.player].lanes[lane].creature = makeCreature(card.uid, card.defId, source.player);
      emit(ctx, { type: 'SUMMON', player: source.player, card, lane });
      log(ctx, `${token.name} joins lane ${lane + 1}.`, 'play');
      return;
    }
    case 'DESTROY_BUILDING': {
      const loc = targetUid ? findBuilding(ctx.state, targetUid) : null;
      if (!loc) return;
      loc.lane.building = null;
      discardCard(ctx, loc.player.id, loc.building);
      emit(ctx, { type: 'BUILDING_DESTROYED', player: loc.player.id, card: loc.building, lane: loc.lane.index });
      log(ctx, `${cardName(loc.building.defId)} is demolished.`, 'death');
      return;
    }
    case 'FREEZE':
      for (const t of resolveSelector(ctx, effect.to, source, targetUid)) {
        if (t.kind !== 'CREATURE') continue;
        const c = players[t.owner].lanes[t.lane].creature;
        if (!c) continue;
        c.frozen = true;
        emit(ctx, { type: 'FREEZE', player: t.owner, uid: c.uid, lane: t.lane });
        log(ctx, `${cardName(c.defId)} is frozen solid.`, 'floop');
      }
      return;
    case 'PUSH':
      for (const t of resolveSelector(ctx, effect.to, source, targetUid)) {
        if (t.kind !== 'CREATURE') continue;
        const [to] = emptyAdjacentLanes(ctx, t.owner, t.lane, null);
        if (to === undefined) {
          damageCreature(ctx, t.owner, t.lane, effect.fallbackDamage);
        } else {
          const c = players[t.owner].lanes[t.lane].creature;
          moveCreature(ctx, t.owner, t.lane, to);
          if (c) log(ctx, `${cardName(c.defId)} is shoved into lane ${to + 1}.`, 'play');
        }
      }
      return;
    case 'MOVE_ADJACENT':
      for (const t of resolveSelector(ctx, effect.to, source, targetUid)) {
        if (t.kind !== 'CREATURE') continue;
        const c = players[t.owner].lanes[t.lane].creature;
        if (!c) continue;
        const [to] = emptyAdjacentLanes(ctx, t.owner, t.lane, getCreature(c.defId));
        if (to === undefined) {
          log(ctx, `${cardName(c.defId)} has nowhere to go.`);
          continue;
        }
        moveCreature(ctx, t.owner, t.lane, to);
        log(ctx, `${cardName(c.defId)} stretches over to lane ${to + 1}.`, 'play');
      }
      return;
  }
}

/** Resolves effects in order, clearing out the dead after each one. */
export function resolveEffects(ctx: Ctx, effects: Effect[], source: EffectSource, targetUid: string | null): void {
  for (const effect of effects) {
    if (ctx.state.phase === 'GAME_OVER') return;
    applyEffect(ctx, effect, source, targetUid);
    checkDeaths(ctx);
  }
}

/**
 * Removes every creature whose damage meets its defense, then fires death
 * triggers. Loops because a death trigger can kill something else.
 */
export function checkDeaths(ctx: Ctx): void {
  for (let guard = 0; guard < 32; guard++) {
    const dead: { owner: PlayerId; lane: number; creature: CreatureInstance }[] = [];
    for (const player of Object.values(ctx.state.players)) {
      for (const lane of player.lanes) {
        if (lane.creature && creatureStats(player, lane).health <= 0) {
          dead.push({ owner: player.id, lane: lane.index, creature: lane.creature });
        }
      }
    }
    if (dead.length === 0) return;
    for (const d of dead) {
      ctx.state.players[d.owner].lanes[d.lane].creature = null;
      discardCard(ctx, d.owner, d.creature);
      emit(ctx, { type: 'CREATURE_DESTROYED', player: d.owner, card: d.creature, lane: d.lane });
      log(ctx, `${cardName(d.creature.defId)} is defeated.`, 'death');
    }
    for (const d of dead) {
      const onDeath = getCreature(d.creature.defId).triggers?.onDeath;
      if (onDeath && ctx.state.phase !== 'GAME_OVER') {
        for (const effect of onDeath) applyEffect(ctx, effect, { player: d.owner, lane: d.lane, uid: null }, null);
      }
    }
  }
}
