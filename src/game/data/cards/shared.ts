import { building, creature, hero, landscape } from './builders';

/** Rainbow cards fit on any landscape; both starter decks draw from this pool. */
export const SHARED_CARDS = [
  creature({
    id: 'rainbow-wisp',
    name: 'Rainbow Wisp',
    faction: 'RAINBOW',
    rarity: 'UNCOMMON',
    cost: 1,
    landRequirement: 0,
    attack: 1,
    defense: 4,
    floop: {
      name: 'Glimmer',
      text: 'Draw a card.',
      cost: 0,
      target: 'NONE',
      effects: [{ kind: 'DRAW', count: 1 }],
    },
    description: 'Rainbow. FLOOP: Draw a card.',
  }),
  creature({
    id: 'candy-butler',
    name: 'Candy Butler',
    faction: 'RAINBOW',
    cost: 0,
    landRequirement: 0,
    attack: 1,
    defense: 4,
    triggers: { onPlay: [{ kind: 'HEAL', amount: 2, to: 'FRIENDLY_HERO' }] },
    description: 'Rainbow. When played, heal your hero 2 HP.',
    flavor: 'Would you care for a gumdrop, sir?',
  }),
  building({
    id: 'tree-fort',
    name: 'Tree Fort',
    faction: 'RAINBOW',
    cost: 1,
    landRequirement: 0,
    triggers: { onTurnStart: [{ kind: 'HEAL', amount: 2, to: 'LANE_CREATURE' }] },
    description: 'Rainbow. At the start of your turn, heal 2 damage from your creature in this lane.',
  }),
];

export const TOKENS = [
  creature({
    id: 'earling',
    name: 'Earling',
    faction: 'BLUE_PLAINS',
    cost: 0,
    landRequirement: 0,
    attack: 1,
    defense: 2,
    keywords: ['TOKEN'],
    description: 'Token.',
  }),
  creature({
    id: 'popcorn-buddy',
    name: 'Popcorn Buddy',
    faction: 'CORN_FIELDS',
    cost: 0,
    landRequirement: 0,
    attack: 1,
    defense: 2,
    keywords: ['TOKEN'],
    description: 'Token.',
  }),
];

export const LANDSCAPES = [
  landscape({
    id: 'blue-plains',
    name: 'Blue Plains',
    faction: 'BLUE_PLAINS',
    theme: 'blue-plains',
    description: 'Rolling blue grass. Home of the Blue Plains creatures.',
  }),
  landscape({
    id: 'corn-fields',
    name: 'Corn Fields',
    faction: 'CORN_FIELDS',
    theme: 'corn-fields',
    description: 'Tall rows of corn. Home of the Corn Fields creatures.',
  }),
  landscape({
    id: 'useless-swamp',
    name: 'Useless Swamp',
    faction: 'USELESS_SWAMP',
    theme: 'useless-swamp',
    laneAura: { atk: 1, def: 0 },
    description: 'Creatures standing here get +1 ATK. The mud makes everyone cranky.',
  }),
  landscape({
    id: 'nice-lands',
    name: 'Nice Lands',
    faction: 'NICE_LANDS',
    theme: 'nice-lands',
    triggers: { onTurnStart: [{ kind: 'HEAL', amount: 1, to: 'LANE_CREATURE' }] },
    description: 'At the start of your turn, heal 1 damage from your creature standing here.',
  }),
];

export const HEROES = [
  hero({
    id: 'finn',
    name: 'Finn the Human',
    faction: 'BLUE_PLAINS',
    maxHp: 25,
    description: 'Heroic Punch: spend 1 AP to deal 2 damage to an enemy creature. Recharges in 2 turns.',
    playstyle: 'Aggressive tempo. Snipe blockers, then pierce through.',
    ability: {
      name: 'Heroic Punch',
      text: 'Deal 2 damage to an enemy creature.',
      cost: 1,
      cooldown: 2,
      target: 'ENEMY_CREATURE',
      effects: [{ kind: 'DAMAGE', amount: 2, to: 'TARGET' }],
    },
  }),
  hero({
    id: 'jake',
    name: 'Jake the Dog',
    faction: 'CORN_FIELDS',
    maxHp: 25,
    description: 'Stretchy Hug: spend 1 AP to heal 4 damage from a friendly creature and give it +1 ATK this turn. Recharges in 2 turns.',
    playstyle: 'Durable midrange. Heal up, swing big, grind them down.',
    ability: {
      name: 'Stretchy Hug',
      text: 'Heal 4 damage from a friendly creature. It gets +1 ATK this turn.',
      cost: 1,
      cooldown: 2,
      target: 'FRIENDLY_CREATURE',
      effects: [
        { kind: 'HEAL', amount: 4, to: 'TARGET' },
        { kind: 'BUFF', atk: 1, def: 0, to: 'TARGET', duration: 'TURN' },
      ],
    },
  }),
];
