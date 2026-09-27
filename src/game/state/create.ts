import { getHero } from '../data/cards';
import { DECKS, expandDeck, type DeckId } from '../data/decks';
import type { GameEvent } from '../events/types';
import { roll, shuffleInPlace } from '../core/rng';
import type { Ctx } from '../rules/context';
import { startTurn } from '../rules/turn';
import { drawCards, newUid } from '../rules/zones';
import type { GameState, PlayerId, PlayerState } from './types';

export const STARTING_HAND = 5;

export interface MatchSetup {
  seed: number;
  p1Deck: DeckId;
  p2Deck: DeckId;
  p1IsAI?: boolean;
  p2IsAI?: boolean;
  /** Omit to decide by coin flip from the seed. */
  firstPlayer?: PlayerId;
}

function makePlayer(ctx: Ctx, id: PlayerId, deckId: DeckId, isAI: boolean): PlayerState {
  const deck = DECKS[deckId];
  const hero = getHero(deck.heroId);
  const cards = expandDeck(deck).map((defId) => ({ uid: newUid(ctx), defId }));
  shuffleInPlace(ctx.state, cards);
  return {
    id,
    deckId,
    heroId: hero.id,
    hp: hero.maxHp,
    maxHp: hero.maxHp,
    ap: 0,
    deck: cards,
    hand: [],
    discard: [],
    lanes: deck.landscapes.map((landscapeId, index) => ({ index, landscapeId, creature: null, building: null })),
    heroCooldown: 0,
    isAI,
  };
}

export function createGame(setup: MatchSetup): { state: GameState; events: GameEvent[] } {
  const seed = setup.seed >>> 0;
  const state: GameState = {
    seed,
    rng: seed,
    turn: 0,
    activePlayer: 'P1',
    firstPlayer: 'P1',
    phase: 'MAIN',
    winner: null,
    // Filled in below once the RNG is available through the context.
    players: {} as GameState['players'],
    nextUid: 1,
    log: [],
  };
  const ctx: Ctx = { state, events: [] };
  state.players = {
    P1: makePlayer(ctx, 'P1', setup.p1Deck, setup.p1IsAI ?? false),
    P2: makePlayer(ctx, 'P2', setup.p2Deck, setup.p2IsAI ?? true),
  };
  state.firstPlayer = setup.firstPlayer ?? (roll(state) < 0.5 ? 'P1' : 'P2');
  drawCards(ctx, 'P1', STARTING_HAND);
  drawCards(ctx, 'P2', STARTING_HAND);
  startTurn(ctx, state.firstPlayer);
  return { state, events: ctx.events };
}
