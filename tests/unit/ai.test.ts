import { describe, expect, it } from 'vitest';
import { chooseAction, playFullTurn } from '../../src/game/ai/AIController';
import { getCard } from '../../src/game/data/cards';
import { creatureStats } from '../../src/game/rules/stats';
import { createGame } from '../../src/game/state/create';
import type { GameState } from '../../src/game/state/types';
import { blankGame, give, place } from './helpers';

function isToken(defId: string): boolean {
  const def = getCard(defId);
  return def.type === 'CREATURE' && def.keywords.includes('TOKEN');
}

function assertInvariants(s: GameState): void {
  for (const p of Object.values(s.players)) {
    expect(p.hand.length).toBeLessThanOrEqual(8);
    expect(p.ap).toBeGreaterThanOrEqual(0);
    expect(p.ap).toBeLessThanOrEqual(2);
    let onBoard = 0;
    for (const lane of p.lanes) {
      if (lane.creature) {
        expect(creatureStats(p, lane).health).toBeGreaterThan(0);
        if (!isToken(lane.creature.defId)) onBoard++;
      }
      if (lane.building) onBoard++;
    }
    // Every real card is somewhere: deck, hand, discard or board.
    expect(p.deck.length + p.hand.length + p.discard.length + onBoard).toBe(40);
  }
}

describe('AI', () => {
  it('plays complete AI-vs-AI games to a legal finish', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let { state } = createGame({ seed, p1Deck: seed % 2 ? 'finn' : 'jake', p2Deck: seed % 2 ? 'jake' : 'finn', p1IsAI: true });
      let turns = 0;
      while (state.phase !== 'GAME_OVER') {
        state = playFullTurn(state, state.activePlayer);
        assertInvariants(state);
        turns++;
        expect(turns).toBeLessThan(200);
      }
      expect(state.winner).not.toBeNull();
    }
  });

  it('takes lethal when it is available', () => {
    const s = blankGame();
    s.activePlayer = 'P2';
    s.players.P1.hp = 3;
    place(s, 'P2', 0, 'corn-ronin'); // 4 ATK into an empty lane
    const choice = chooseAction(s, 'P2');
    const after = playFullTurn(s, 'P2');
    expect(after.winner).toBe('P2');
    expect(['END_TURN', 'PLAY_CARD', 'FLOOP', 'HERO_ABILITY', 'DRAW_CARD']).toContain(choice.action.type);
  });

  it('removes a dangerous creature instead of ignoring it', () => {
    const s = blankGame();
    s.activePlayer = 'P1';
    s.players.P1.hp = 6;
    place(s, 'P2', 1, 'corn-ronin', { damage: 1 }); // threatens 4 into an empty lane
    const strike = give(s, 'P1', 'hero-strike');
    const choice = chooseAction(s, 'P1');
    expect(choice.action).toMatchObject({ type: 'PLAY_CARD', cardUid: strike });
  });

  it('never picks an action it cannot afford', () => {
    const s = blankGame();
    s.players.P1.ap = 0;
    give(s, 'P1', 'heroic-paladin');
    expect(chooseAction(s, 'P1').action.type).toBe('END_TURN');
  });
});
