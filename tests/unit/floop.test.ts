import { describe, expect, it } from 'vitest';
import { fightStatus } from '../../src/game/combat/combat';
import { canFloop } from '../../src/game/rules/legality';
import { act, blankGame, build, place, reject } from './helpers';

describe('FLOOP restrictions', () => {
  it('applies the ability, turns the creature sideways, and stops it fighting', () => {
    let s = blankGame();
    const squire = place(s, 'P1', 0, 'sharpshooter-squire');
    const target = place(s, 'P2', 2, 'husker-knight');
    s = act(s, { type: 'FLOOP', player: 'P1', sourceUid: squire, targetUid: target });
    expect(s.players.P2.lanes[2].creature?.damage).toBe(2);
    expect(s.players.P1.lanes[0].creature?.flooped).toBe(true);
    expect(fightStatus(s, 'P1', 0)).toEqual({ ready: false, reason: 'FLOOPed — resting this turn' });
    s = act(s, { type: 'END_TURN', player: 'P1' });
    expect(s.players.P2.hp).toBe(25);
  });

  it('cannot FLOOP twice in one turn', () => {
    let s = blankGame();
    const wisp = place(s, 'P1', 0, 'rainbow-wisp');
    s = act(s, { type: 'FLOOP', player: 'P1', sourceUid: wisp });
    expect(reject(s, { type: 'FLOOP', player: 'P1', sourceUid: wisp })).toBe('Already FLOOPed this turn');
  });

  it('resets at the start of the owner’s next turn', () => {
    let s = blankGame();
    const wisp = place(s, 'P1', 0, 'rainbow-wisp');
    s = act(s, { type: 'FLOOP', player: 'P1', sourceUid: wisp });
    s = act(s, { type: 'END_TURN', player: 'P1' });
    expect(s.players.P1.lanes[0].creature?.flooped).toBe(true);
    s = act(s, { type: 'END_TURN', player: 'P2' });
    expect(s.players.P1.lanes[0].creature?.flooped).toBe(false);
    expect(canFloop(s, 'P1', wisp).ok).toBe(true);
  });

  it('requires a target when the ability needs one', () => {
    const s = blankGame();
    const squire = place(s, 'P1', 0, 'sharpshooter-squire');
    expect(canFloop(s, 'P1', squire)).toEqual({ ok: false, reason: 'No valid target' });
    place(s, 'P2', 0, 'corn-ronin');
    expect(reject(s, { type: 'FLOOP', player: 'P1', sourceUid: squire })).toBe('Target required');
  });

  it('cannot FLOOP an opponent’s card or a card without FLOOP', () => {
    const s = blankGame();
    const enemy = place(s, 'P2', 0, 'stretchy-mastiff');
    const dog = place(s, 'P1', 0, 'cool-dog');
    expect(reject(s, { type: 'FLOOP', player: 'P1', sourceUid: enemy })).toBe('That card belongs to your opponent');
    expect(reject(s, { type: 'FLOOP', player: 'P1', sourceUid: dog })).toBe('This card has no FLOOP ability');
  });

  it('buildings can FLOOP too', () => {
    let s = blankGame();
    const tower = build(s, 'P1', 0, 'lookout-tower');
    s = act(s, { type: 'FLOOP', player: 'P1', sourceUid: tower });
    expect(s.players.P2.hp).toBe(24);
    expect(s.players.P1.lanes[0].building?.flooped).toBe(true);
  });
});
