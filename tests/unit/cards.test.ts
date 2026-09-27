import { describe, expect, it } from 'vitest';
import { validateAllCards, validateCard, validateDeck } from '../../src/game/cards/validate';
import { getCard } from '../../src/game/data/cards';
import { DECKS, expandDeck } from '../../src/game/data/decks';
import { creature, spell } from '../../src/game/data/cards/builders';

describe('card validation', () => {
  it('every card definition is valid', () => {
    expect(validateAllCards()).toEqual([]);
  });

  it('both starter decks are legal 40-card decks', () => {
    for (const deck of Object.values(DECKS)) {
      expect(validateDeck(deck)).toEqual([]);
      expect(expandDeck(deck)).toHaveLength(40);
    }
  });

  it('each deck has enough variety', () => {
    for (const deck of Object.values(DECKS)) {
      const unique = [...new Set(expandDeck(deck))].map(getCard);
      expect(unique.filter((c) => c.type === 'CREATURE').length).toBeGreaterThanOrEqual(10);
      expect(unique.filter((c) => c.type === 'BUILDING').length).toBeGreaterThanOrEqual(5);
      expect(unique.filter((c) => c.type === 'SPELL').length).toBeGreaterThanOrEqual(5);
    }
  });

  it('catches broken definitions', () => {
    const bad = creature({
      id: 'bad', name: 'Bad', faction: 'RAINBOW', cost: 5, landRequirement: 2,
      attack: 1, defense: 0, description: 'x',
    });
    const errors = validateCard(bad);
    expect(errors.some((e) => e.includes('cost'))).toBe(true);
    expect(errors.some((e) => e.includes('defense'))).toBe(true);
    expect(errors.some((e) => e.includes('rainbow'))).toBe(true);

    const untargeted = spell({
      id: 'oops', name: 'Oops', faction: 'RAINBOW', cost: 1, landRequirement: 0,
      target: 'NONE', effects: [{ kind: 'DAMAGE', amount: 1, to: 'TARGET' }], description: 'x',
    });
    expect(validateCard(untargeted)).toContain('oops: effect targets TARGET but target rule is NONE');
  });
});
