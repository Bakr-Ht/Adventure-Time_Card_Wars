import { fightStatus } from '../combat/combat';
import { getBuilding, getCreature } from '../data/cards';
import { creatureStats } from '../rules/stats';
import { opponentOf, type GameState, type PlayerId, type PlayerState } from '../state/types';

/**
 * The AI's view of a position, split into named terms so its choices can be
 * inspected in the debug panel and tuned without guesswork.
 */
export interface Evaluation {
  lethalPotential: number;
  immediateDamage: number;
  defenseValue: number;
  boardControl: number;
  removalValue: number;
  synergy: number;
  resources: number;
  total: number;
}

export const WEIGHTS = {
  win: 10_000,
  enemyHpLost: 1.3,
  ownHp: 1.0,
  incomingHeroDamage: 0.9,
  facingLethal: 300,
  creatureAttack: 1.1,
  creatureHealth: 0.5,
  floopAbility: 1.2,
  pierce: 0.8,
  wallBlocking: 1.0,
  buildingBase: 1.4,
  buildingSupportsCreature: 1.0,
  handCard: 1.3,
  pressure: 0.35,
  pressureLethal: 40,
};

function creatureValue(player: PlayerState, laneIndex: number): number {
  const lane = player.lanes[laneIndex];
  const c = lane.creature;
  if (!c) return 0;
  const def = getCreature(c.defId);
  const { attack, health } = creatureStats(player, lane);
  let value = attack * WEIGHTS.creatureAttack + Math.max(0, health) * WEIGHTS.creatureHealth;
  if (def.attackRestriction === 'CANNOT_ATTACK') value += WEIGHTS.wallBlocking * 2;
  if (def.floop) value += WEIGHTS.floopAbility;
  if (def.keywords.includes('PIERCE')) value += WEIGHTS.pierce;
  if (def.triggers?.onTurnStart) value += 1;
  return value;
}

/** Damage `attacker`'s ready creatures would deal to the other hero in one fight. */
function heroThreat(state: GameState, attacker: PlayerId, assumeReady: boolean): number {
  const atk = state.players[attacker];
  const def = state.players[opponentOf(attacker)];
  let total = 0;
  for (const lane of atk.lanes) {
    const c = lane.creature;
    if (!c) continue;
    const cdef = getCreature(c.defId);
    if (cdef.attackRestriction !== 'NONE') continue;
    if (!assumeReady && !fightStatus(state, attacker, lane.index).ready) continue;
    if (assumeReady && c.frozen) continue;
    const { attack } = creatureStats(atk, lane);
    const blocker = def.lanes[lane.index];
    if (!blocker.creature) total += attack;
    else if (cdef.keywords.includes('PIERCE')) total += Math.max(0, attack - creatureStats(def, blocker).health);
  }
  return total;
}

/** Scores `state` from `me`'s point of view. Higher is better for `me`. */
export function evaluate(state: GameState, me: PlayerId): Evaluation {
  const foe = opponentOf(me);
  const mine = state.players[me];
  const theirs = state.players[foe];

  if (state.phase === 'GAME_OVER') {
    const won = state.winner === me;
    const total = won ? WEIGHTS.win + mine.hp : -WEIGHTS.win - theirs.hp;
    return { lethalPotential: total, immediateDamage: 0, defenseValue: 0, boardControl: 0, removalValue: 0, synergy: 0, resources: 0, total };
  }

  // Threat assessment for whoever acts next. If it is the foe's turn their creatures have just readied.
  const incoming = heroThreat(state, foe, state.activePlayer !== foe);
  const pressure = heroThreat(state, me, true);

  let lethalPotential = pressure >= theirs.hp ? WEIGHTS.pressureLethal : 0;
  if (incoming >= mine.hp) lethalPotential -= WEIGHTS.facingLethal;

  const immediateDamage = (theirs.maxHp - theirs.hp) * WEIGHTS.enemyHpLost + pressure * WEIGHTS.pressure;
  const defenseValue = mine.hp * WEIGHTS.ownHp - incoming * WEIGHTS.incomingHeroDamage;

  let boardControl = 0;
  let removalValue = 0;
  let synergy = 0;
  for (let i = 0; i < mine.lanes.length; i++) {
    boardControl += creatureValue(mine, i);
    removalValue -= creatureValue(theirs, i);
    for (const [owner, sign] of [[mine, 1], [theirs, -1]] as const) {
      const b = owner.lanes[i].building;
      if (!b) continue;
      const bdef = getBuilding(b.defId);
      let v = WEIGHTS.buildingBase + (bdef.floop ? WEIGHTS.floopAbility : 0);
      if (bdef.laneAura && owner.lanes[i].creature) v += WEIGHTS.buildingSupportsCreature;
      synergy += sign * v;
    }
  }

  const handValue = (p: PlayerState) => Math.min(p.hand.length, 7) * WEIGHTS.handCard - (p.deck.length === 0 ? 3 : 0);
  const resources = handValue(mine) - handValue(theirs) * 0.5;

  const total = lethalPotential + immediateDamage + defenseValue + boardControl + removalValue + synergy + resources;
  return { lethalPotential, immediateDamage, defenseValue, boardControl, removalValue, synergy, resources, total };
}
