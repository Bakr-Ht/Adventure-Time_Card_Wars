import { getBuilding, getCreature, getLandscape } from '../data/cards';
import { adjacentLanes } from '../state/queries';
import type { LaneState, PlayerState } from '../state/types';

export interface CreatureStats {
  attack: number;
  defense: number;
  /** defense - damage; the creature dies at 0 or below. */
  health: number;
}

/**
 * The single source of truth for a creature's live numbers. Every aura and
 * modifier is folded in here so UI, combat and AI all agree.
 */
export function creatureStats(player: PlayerState, lane: LaneState): CreatureStats {
  const creature = lane.creature;
  if (!creature) return { attack: 0, defense: 0, health: 0 };
  const def = getCreature(creature.defId);

  let attack = def.attack + creature.atkMod + creature.tempAtk;
  let defense = def.defense + creature.defMod + creature.tempDef;

  const land = getLandscape(lane.landscapeId);
  if (land.laneAura) {
    attack += land.laneAura.atk;
    defense += land.laneAura.def;
  }
  if (lane.building) {
    const aura = getBuilding(lane.building.defId).laneAura;
    if (aura) {
      attack += aura.atk;
      defense += aura.def;
    }
  }
  if (def.dynamicAttack === 'PER_ADJACENT_FRIENDLY') {
    attack += adjacentLanes(player, lane.index).filter((l) => l.creature !== null).length;
  }

  attack = Math.max(0, attack);
  defense = Math.max(0, defense);
  return { attack, defense, health: defense - creature.damage };
}
