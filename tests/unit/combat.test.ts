import { describe, expect, it } from 'vitest';
import { fightStatus } from '../../src/game/combat/combat';
import { act, blankGame, give, place, reject } from './helpers';

const endTurn = { type: 'END_TURN', player: 'P1' } as const;

describe('combat resolution', () => {
  it('attacks the creature across the lane; damage is one-way', () => {
    let s = blankGame();
    place(s, 'P1', 0, 'plains-pup'); // 2 ATK
    place(s, 'P2', 0, 'husker-knight'); // 2 ATK / 8 DEF
    s = act(s, endTurn);
    expect(s.players.P2.lanes[0].creature?.damage).toBe(2);
    expect(s.players.P1.lanes[0].creature?.damage).toBe(0);
  });

  it('destroys a creature whose damage reaches its defense', () => {
    let s = blankGame();
    place(s, 'P1', 3, 'heroic-paladin', { atkMod: 4 }); // 9 ATK
    place(s, 'P2', 3, 'corn-ronin'); // 4 DEF
    s = act(s, endTurn);
    expect(s.players.P2.lanes[3].creature).toBeNull();
    expect(s.players.P2.discard.some((c) => c.defId === 'corn-ronin')).toBe(true);
  });

  it('pierce spills excess damage onto the hero', () => {
    let s = blankGame();
    place(s, 'P1', 3, 'heroic-paladin', { atkMod: 4 }); // 9 ATK, pierce
    place(s, 'P2', 3, 'corn-ronin'); // 4 health
    s = act(s, endTurn);
    expect(s.players.P2.hp).toBe(25 - 5);
  });

  it('empty lanes let attacks hit the hero', () => {
    let s = blankGame();
    place(s, 'P1', 0, 'cool-dog'); // 2 ATK, no neighbours
    s = act(s, endTurn);
    expect(s.players.P2.hp).toBe(23);
  });

  it('respects drowsy, hasty, wall and creatures-only restrictions', () => {
    let s = blankGame();
    const dog = give(s, 'P1', 'cool-dog');
    const pup = give(s, 'P1', 'plains-pup');
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: dog, lane: 0 });
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: pup, lane: 3 });
    place(s, 'P1', 2, 'mud-golem');
    place(s, 'P1', 1, 'bluebell-medic');
    expect(fightStatus(s, 'P1', 0)).toEqual({ ready: false, reason: 'Just arrived — fights next turn' });
    expect(fightStatus(s, 'P1', 3).ready).toBe(true);
    expect(fightStatus(s, 'P1', 2).ready).toBe(false);
    expect(fightStatus(s, 'P1', 1)).toEqual({ ready: false, reason: 'Only fights creatures — lane is empty' });
    s = act(s, endTurn);
    expect(s.players.P2.hp).toBe(23); // only the hasty pup connected
  });

  it('frozen creatures skip their next fight and then thaw', () => {
    let s = blankGame();
    const ronin = place(s, 'P2', 1, 'corn-ronin');
    const snap = give(s, 'P1', 'frost-snap');
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: snap, targetUid: ronin });
    s = act(s, endTurn);
    expect(fightStatus(s, 'P2', 1).ready).toBe(false);
    expect(reject(s, { type: 'FLOOP', player: 'P2', sourceUid: ronin })).toBe('This card has no FLOOP ability');
    s = act(s, { type: 'END_TURN', player: 'P2' });
    expect(s.players.P1.hp).toBe(25);
    expect(s.players.P2.lanes[1].creature?.frozen).toBe(false);
  });
});

describe('win condition', () => {
  it('ends the game when a hero hits 0 HP and blocks further actions', () => {
    let s = blankGame();
    s.players.P2.hp = 2;
    place(s, 'P1', 0, 'cool-dog');
    s = act(s, endTurn);
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('P1');
    expect(reject(s, { type: 'END_TURN', player: 'P1' })).toBe('The game is over');
  });

  it('death triggers can win the game', () => {
    let s = blankGame();
    s.players.P1.hp = 3;
    const pixie = place(s, 'P2', 0, 'popcorn-pixie');
    const strike = give(s, 'P1', 'hero-strike');
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: strike, targetUid: pixie });
    expect(s.winner).toBe('P2');
  });

  it('conceding hands the win to the opponent', () => {
    const s = act(blankGame(), { type: 'CONCEDE', player: 'P1' });
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('P2');
  });
});
