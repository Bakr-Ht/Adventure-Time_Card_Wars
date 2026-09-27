export interface DeckList {
  id: string;
  name: string;
  heroId: string;
  /** Exactly four landscapes, left to right. */
  landscapes: [string, string, string, string];
  /** Card id → copies. */
  cards: Record<string, number>;
  summary: string;
}

export const DECK_SIZE = 40;

export const DECKS: Record<'finn' | 'jake', DeckList> = {
  finn: {
    id: 'finn',
    name: 'Blue Plains Brigade',
    heroId: 'finn',
    landscapes: ['blue-plains', 'blue-plains', 'useless-swamp', 'blue-plains'],
    summary: 'Cheap creatures, sniping FLOOPs and Pierce finishers. Three Blue Plains and one Useless Swamp.',
    cards: {
      'cool-dog': 3,
      'sharpshooter-squire': 3,
      'plains-pup': 3,
      'earling-swarm': 2,
      'heroic-paladin': 2,
      'blue-colossus': 2,
      'bluebell-medic': 2,
      'bog-hopper': 2,
      'mud-golem': 2,
      'rainbow-wisp': 2,
      'candy-butler': 1,
      'blue-bastion': 2,
      'sword-rack': 2,
      'lookout-tower': 1,
      'tree-fort': 1,
      'swamp-shrine': 1,
      'hero-strike': 2,
      'rally-cry': 2,
      'rousing-tale': 2,
      landslide: 1,
      'frost-snap': 1,
      demolish: 1,
    },
  },
  jake: {
    id: 'jake',
    name: 'Corn Fields Crew',
    heroId: 'jake',
    landscapes: ['corn-fields', 'nice-lands', 'corn-fields', 'corn-fields'],
    summary: 'Sturdy bodies, healing and area damage. Three Corn Fields and one Nice Lands.',
    cards: {
      'husker-knight': 4,
      'corn-ronin': 3,
      'kernel-kid': 2,
      'field-scarecrow': 2,
      'stretchy-mastiff': 2,
      cornzilla: 2,
      'popcorn-pixie': 2,
      'nice-nurse': 2,
      'snuggle-bear': 2,
      'rainbow-wisp': 1,
      'candy-butler': 2,
      'corn-silo': 2,
      'cob-catapult': 2,
      'barn-of-plenty': 1,
      'nice-gazebo': 1,
      'tree-fort': 1,
      'bacon-pancakes': 2,
      'stretch-slam': 2,
      'corn-storm': 2,
      'sandwich-time': 1,
      'stretchy-shuffle': 1,
      'sour-candy': 1,
    },
  },
};

export type DeckId = keyof typeof DECKS;

export function expandDeck(deck: DeckList): string[] {
  const out: string[] = [];
  for (const [id, copies] of Object.entries(deck.cards)) {
    for (let i = 0; i < copies; i++) out.push(id);
  }
  return out;
}
