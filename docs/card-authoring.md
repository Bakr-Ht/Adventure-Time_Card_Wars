# Card authoring

Cards are TypeScript data, validated at test time and (in dev builds) at boot. Nothing about a card's behaviour lives in UI code.

## Where cards live

| File | Contents |
| --- | --- |
| `src/game/data/cards/finn.ts` | Blue Plains and Useless Swamp cards |
| `src/game/data/cards/jake.ts` | Corn Fields and Nice Lands cards |
| `src/game/data/cards/shared.ts` | Rainbow cards, tokens, landscapes, heroes |
| `src/game/data/decks.ts` | Deck lists (card id → copies), landscapes, hero |

Ids must be unique; the registry throws on duplicates.

## A creature

```ts
creature({
  id: 'sharpshooter-squire',
  name: 'Sharpshooter Squire',
  faction: 'BLUE_PLAINS',
  rarity: 'UNCOMMON',
  cost: 1,               // actions to play (0–2)
  landRequirement: 1,    // Blue Plains landscapes you must control
  attack: 2,
  defense: 5,
  keywords: [],          // 'HASTY' | 'PIERCE' | 'TOKEN'
  attackRestriction: 'NONE', // or 'CANNOT_ATTACK' (Wall) | 'CREATURES_ONLY'
  floop: {
    name: 'Pinpoint Shot',
    text: 'Deal 2 damage to an enemy creature.',
    cost: 0,
    target: 'ENEMY_CREATURE',
    effects: [{ kind: 'DAMAGE', amount: 2, to: 'TARGET' }],
  },
  description: 'FLOOP: Deal 2 damage to an enemy creature.',
})
```

`art` defaults to `card:<id>`. The manifest maps that key to `public/assets/cards/<id>.svg`.

## Triggers

```ts
triggers: {
  onPlay:      [{ kind: 'SUMMON', tokenId: 'earling' }],
  onDeath:     [{ kind: 'DAMAGE', amount: 2, to: 'ENEMY_HERO' }],
  onTurnStart: [{ kind: 'HEAL', amount: 2, to: 'SELF' }],
}
```

Triggers never have a player-chosen target, so they cannot use `TARGET`; the validator enforces this.

## A building

```ts
building({
  id: 'corn-silo', name: 'Corn Silo', faction: 'CORN_FIELDS', cost: 1, landRequirement: 1,
  laneAura: { atk: 0, def: 2 },                                           // passive for your creature in this lane
  triggers: { onTurnStart: [{ kind: 'HEAL', amount: 1, to: 'LANE_CREATURE' }] },
  description: 'Your creature here gets +2 DEF and heals 1 at the start of your turn.',
})
```

## A spell

```ts
spell({
  id: 'landslide', name: 'Landslide', faction: 'BLUE_PLAINS', cost: 1, landRequirement: 2,
  target: 'ENEMY_CREATURE',
  effects: [{ kind: 'PUSH', to: 'TARGET', fallbackDamage: 3 }],
  description: 'Shove an enemy creature into an adjacent empty lane. If it cannot move, deal 3 damage to it.',
})
```

## Effect reference

| Kind | Params | Notes |
| --- | --- | --- |
| `DAMAGE` | `amount`, `to` | Creatures or heroes |
| `HEAL` | `amount` (number or `'FULL'`), `to` | Creatures lose damage; heroes are capped at max HP |
| `BUFF` | `atk`, `def`, `to`, `duration: 'TURN' \| 'PERMANENT'` | Negative values debuff; DEF loss can kill |
| `DRAW` | `count` | For the source's owner |
| `SUMMON` | `tokenId` | Into an adjacent empty, compatible lane (right first) |
| `FREEZE` | `to` | Skips the next fight, no FLOOP |
| `PUSH` | `to`, `fallbackDamage` | Moves an enemy to an adjacent empty lane, or damages it |
| `MOVE_ADJACENT` | `to` | Moves your creature to an adjacent empty compatible lane; targets are pre-filtered |
| `DESTROY_BUILDING` | `to: 'TARGET'` | Needs target rule `ENEMY_BUILDING` |

## Checklist for a new card

1. Pick a job. Every card should do one clear thing: swarm, tank, snipe, heal, buff, debuff, draw, lane manipulation, or finisher.
2. Write the `description` as the player should read it. It is shown verbatim on the card.
3. Add copies to a deck (keep 40) or leave the card out of decks for later.
4. Art: add a subject to `tools/art/creatures.mjs` or `objects.mjs` and a backdrop entry in `tools/generate-art.mjs`. Then run `npm run art`. To use a bitmap instead, drop a PNG/WebP in `public/assets/cards/` and change the entry in `src/assets/manifest.ts`.
5. Run `npm test` (validation), then `npm run sim` (balance).

## What the validator checks

- Cost within 0–2; landscape requirement within 0–4; Rainbow cards need no landscapes.
- Positive DEF and non-negative ATK; a Wall cannot Pierce.
- Target rules match effects: a `TARGET` effect requires a target rule, a declared target must be used, and `DESTROY_BUILDING` requires `ENEMY_BUILDING`.
- Summoned tokens exist.
- Buildings do something.
- Decks: exactly 40 cards, a valid hero, four valid landscapes, no tokens, landscapes or heroes shuffled in, and no card whose faction has no landscape in that deck.
