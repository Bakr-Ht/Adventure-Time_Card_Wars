import type { Faction, LandFaction } from '../cards/types';
import { getCard, getHero, getLandscape } from '../data/cards';
import type {
  BuildingInstance,
  CreatureInstance,
  GameState,
  LaneState,
  PlayerId,
  PlayerState,
} from './types';

export interface CreatureLocation {
  player: PlayerState;
  lane: LaneState;
  creature: CreatureInstance;
}

export interface BuildingLocation {
  player: PlayerState;
  lane: LaneState;
  building: BuildingInstance;
}

export function findCreature(state: GameState, uid: string): CreatureLocation | null {
  for (const player of Object.values(state.players)) {
    for (const lane of player.lanes) {
      if (lane.creature?.uid === uid) return { player, lane, creature: lane.creature };
    }
  }
  return null;
}

export function findBuilding(state: GameState, uid: string): BuildingLocation | null {
  for (const player of Object.values(state.players)) {
    for (const lane of player.lanes) {
      if (lane.building?.uid === uid) return { player, lane, building: lane.building };
    }
  }
  return null;
}

export function landFactionOf(lane: LaneState): LandFaction {
  return getLandscape(lane.landscapeId).faction;
}

/** Rainbow cards fit anywhere; everything else needs a matching landscape. */
export function isLaneCompatible(lane: LaneState, faction: Faction): boolean {
  return faction === 'RAINBOW' || landFactionOf(lane) === faction;
}

export function countLandscapes(player: PlayerState, faction: Faction): number {
  if (faction === 'RAINBOW') return player.lanes.length;
  return player.lanes.filter((lane) => landFactionOf(lane) === faction).length;
}

export function cardName(defId: string): string {
  return getCard(defId).name;
}

export function heroShortName(state: GameState, id: PlayerId): string {
  return getHero(state.players[id].heroId).name.split(' ')[0];
}

export function friendlyCreatures(player: PlayerState): CreatureLocation[] {
  const out: CreatureLocation[] = [];
  for (const lane of player.lanes) {
    if (lane.creature) out.push({ player, lane, creature: lane.creature });
  }
  return out;
}

export function adjacentLanes(player: PlayerState, index: number): LaneState[] {
  return [player.lanes[index - 1], player.lanes[index + 1]].filter(
    (lane): lane is LaneState => lane !== undefined,
  );
}
