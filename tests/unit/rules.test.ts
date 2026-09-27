import { describe, expect, it } from 'vitest';
import { canPlayCard } from '../../src/game/rules/legality';
import { creatureStats } from '../../src/game/rules/stats';
import { createGame } from '../../src/game/state/create';
import { act, blankGame, build, give, place, reject } from './helpers';

describe('action points', () => {
  it('spends AP when a card is played', () => {
    let s = blankGame();
    const uid = give(s, 'P1', 'cool-dog');
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: uid, lane: 0 });
    expect(s.players.P1.ap).toBe(1);
    expect(s.players.P1.lanes[0].creature?.defId).toBe('cool-dog');
  });

  it('refuses a card the player cannot afford, with a reason', () => {
    const s = blankGame();
    s.players.P1.ap = 1;
    const uid = give(s, 'P1', 'heroic-paladin');
    expect(canPlayCard(s, 'P1', uid)).toEqual({ ok: false, reason: 'Not enough Action Points' });
    expect(reject(s, { type: 'PLAY_CARD', player: 'P1', cardUid: uid, lane: 0 })).toBe('Not enough Action Points');
  });

  it('drawing a card costs 1 AP and AP refills next turn', () => {
    let s = blankGame();
    const before = s.players.P1.hand.length;
    s = act(s, { type: 'DRAW_CARD', player: 'P1' });
    expect(s.players.P1.ap).toBe(1);
    expect(s.players.P1.hand.length).toBe(before + 1);
    s = act(s, { type: 'END_TURN', player: 'P1' });
    s = act(s, { type: 'END_TURN', player: 'P2' });
    expect(s.players.P1.ap).toBe(2);
  });

  it('the first player opens with 1 AP and no draw; the second player gets 2 AP and draws', () => {
    const { state } = createGame({ seed: 3, p1Deck: 'finn', p2Deck: 'jake', firstPlayer: 'P1' });
    expect(state.players.P1.ap).toBe(1);
    expect(state.players.P1.hand).toHaveLength(5);
    const next = act(state, { type: 'END_TURN', player: 'P1' });
    expect(next.players.P2.ap).toBe(2);
    expect(next.players.P2.hand).toHaveLength(6);
  });

  it('only the active player may act', () => {
    const s = blankGame();
    expect(reject(s, { type: 'END_TURN', player: 'P2' })).toBe('Not your turn');
  });
});

describe('landscapes', () => {
  it('rejects creatures on the wrong landscape', () => {
    const s = blankGame();
    const uid = give(s, 'P1', 'mud-golem');
    // Finn's lane 0 is Blue Plains; Mud Golem is a Useless Swamp creature.
    expect(reject(s, { type: 'PLAY_CARD', player: 'P1', cardUid: uid, lane: 0 })).toBe('Wrong Landscape');
    expect(act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: uid, lane: 2 }).players.P1.lanes[2].creature?.defId).toBe('mud-golem');
  });

  it('enforces landscape count requirements', () => {
    const s = blankGame();
    const uid = give(s, 'P1', 'cornzilla');
    expect(canPlayCard(s, 'P1', uid)).toEqual({ ok: false, reason: 'Needs 3 Corn Fields landscapes' });
  });

  it('rainbow cards fit any lane', () => {
    const s = blankGame();
    const uid = give(s, 'P1', 'rainbow-wisp');
    expect(act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: uid, lane: 2 }).players.P1.lanes[2].creature).not.toBeNull();
  });
});

describe('damage calculation', () => {
  it('folds building, landscape and adjacency bonuses into stats', () => {
    const s = blankGame();
    place(s, 'P1', 1, 'cool-dog');
    place(s, 'P1', 0, 'plains-pup');
    place(s, 'P1', 2, 'bog-hopper');
    build(s, 'P1', 1, 'sword-rack');
    const p = s.players.P1;
    // Cool Dog 2 + Sword Rack 2 + two adjacent friends 2
    expect(creatureStats(p, p.lanes[1]).attack).toBe(6);
    // Bog Hopper 4 + Useless Swamp 1
    expect(creatureStats(p, p.lanes[2]).attack).toBe(5);
  });

  it('damage persists and healing removes it', () => {
    let s = blankGame();
    const target = place(s, 'P2', 0, 'husker-knight');
    const strike = give(s, 'P1', 'hero-strike');
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: strike, targetUid: target });
    expect(s.players.P2.lanes[0].creature?.damage).toBe(4);
    expect(creatureStats(s.players.P2, s.players.P2.lanes[0]).health).toBe(4);
  });

  it('heroes cannot heal above max HP', () => {
    let s = blankGame();
    s.players.P1.hp = 23;
    s.players.P1.heroId = 'jake';
    const uid = give(s, 'P1', 'bacon-pancakes');
    s = act(s, { type: 'PLAY_CARD', player: 'P1', cardUid: uid });
    expect(s.players.P1.hp).toBe(25);
  });
});
