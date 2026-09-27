# Architecture

The project is split into a **pure rules core** (`src/game`) and a **presentation layer** (`src/scenes`, `src/ui`). The core has no Phaser, DOM or timing code. It is the same code the AI, the unit tests and (eventually) a network server run.

```
          ┌───────────── src/game (pure TS) ─────────────┐
 Action ─▶│ legality ─▶ engine.applyAction ─▶ effects     │─▶ { state', events[] }
          │                 │        combat   turn       │
          │                 └── data/cards (definitions) │
          └──────────────────────────────────────────────┘
                        ▲                         │
          AIController ─┘                         ▼
                                     Animator plays events on views,
                                     then BoardView.sync(state') repairs any drift
```

## Game state

`src/game/state/types.ts` defines plain objects only:

- **GameState:** the seed, RNG cursor, turn, active player, phase, winner, both players, the uid counter and the log.
- **PlayerState:** deck, hand and discard (lists of `CardRef {uid, defId}`), four `LaneState`s, HP, AP and hero cooldown.
- **LaneState:** `landscapeId`, `creature: CreatureInstance | null`, `building: BuildingInstance | null`.
- **CreatureInstance:** damage, permanent and temporary stat modifiers, plus flags: `flooped`, `drowsy`, `frozen`, `hasAttacked`.

Because state is plain data, `structuredClone` is enough to fork it. The AI and the engine both rely on that.

## The engine

`applyAction(state, action)` in `src/game/rules/engine.ts` is the only way state changes:

1. `validateAction` (`rules/legality.ts`) checks the move and returns a player-facing reason such as "Not enough Action Points", "Wrong Landscape", "Target required" or "Already FLOOPed this turn".
2. The state is cloned and a `Ctx { state, events }` is created.
3. The action runs through small modules:
   - `zones.ts`: draw, discard, fatigue, hand limit
   - `turn.ts`: start and end of turn, the fight phase, turn limit
   - `combat/combat.ts`: lane attacks and pierce; `fightStatus` explains readiness
   - `effects/resolve.ts`: the effect system: selectors → targets → primitive mutations, then `checkDeaths` (which loops for chained death triggers)
   - `effects/primitives.ts`: damage and heal for creatures and heroes, game-over detection
4. It returns the new state and an ordered event list (`events/types.ts`).

`rules/stats.ts` is the single place that computes live ATK/DEF. It folds in the base stats, permanent and temporary modifiers, landscape aura, building aura and dynamic rules such as Cool Dog's. Combat, the UI and the AI all call it, so they can never disagree.

The RNG (`core/rng.ts`, mulberry32) lives inside the state, so games replay from `(seed, actions)`.

## Effect system

Card behaviour is data. An `Effect` is `{ kind, …params, to: Selector }`.

| Selector | Resolves to |
| --- | --- |
| `TARGET` | The creature the player chose |
| `SELF` | The source creature |
| `LANE_CREATURE` | Your creature in the source's lane (used by buildings and landscapes) |
| `OPPOSING_CREATURE` | The enemy creature across the lane |
| `OPPOSING_CREATURE_OR_HERO` | As above, or the enemy hero if the lane is empty |
| `ADJACENT_FRIENDLIES` | Your creatures in neighbouring lanes |
| `ALL_FRIENDLY_CREATURES` / `ALL_ENEMY_CREATURES` | Every creature on that side |
| `ENEMY_HERO` / `FRIENDLY_HERO` | A hero |

Effects hang off `triggers.onPlay`, `triggers.onDeath`, `triggers.onTurnStart`, a `floop` ability, a spell's `effects`, or a hero ability. Target rules (`FRIENDLY_CREATURE`, `ENEMY_CREATURE`, `ENEMY_BUILDING`, …) decide what the UI lets you click. `validTargets` computes the legal set.

## Presentation

- **Scenes:** `Boot` loads the manifest. `MainMenu`, `DeckSelect`, `HowToPlay` and `Result` are DOM overlays over an animated canvas. `Battle` is canvas plus a DOM control rail.
- **Viewport** (`ui/viewport.ts`): the canvas always matches the window at device resolution (DPR capped at 2). The camera zoom maps a logical space onto it: about 1600×900 on desktop, and 1000 wide by 1000–1800 tall in portrait. Text and vectors stay crisp at every size.
- **Battle layout** (`ui/hud/battleLayout.ts`): a pure function of logical width and height with three modes:
  - `wide`: control rail on the right.
  - `compact` (4:3): rail in the bottom-right.
  - `tall` (portrait): rail as a strip above the hand, with creature and building stacked in each lane.
  Resizing rebuilds the views from state.
- **Views:** `CardFace` (hand and preview), `BoardCreatureView` and `BuildingView` (compact board pieces), `HeroView`, `PileView`, `HandView`, `BoardView` and `Rail` (DOM).
- **Interaction** (`ui/hud/Interaction.ts`): a selection state machine (play → lane or target / FLOOP → target / hero → target). It paints affordances: green = playable or valid, dimmed = unavailable, yellow = selected, red = danger or attack target. It turns every refusal into a toast.
- **Animator** (`ui/hud/Animator.ts`): plays engine events one after another (draw, summon, spell, FLOOP, lunge, hit, float numbers, destroy, banners). The board is only re-synced to the new state **after** the animations finish, so the player never sees an outcome before its cause.
- **Fx** (`ui/components/Fx.ts`): tweens, particles, shakes and banners. Every duration goes through `ms()`, so reduced motion and test speed-ups apply globally.
- **Audio** (`audio/AudioManager.ts`): semantic events (`cardDraw`, `cardPlay`, `attack`, `hit`, `damage`, `destroy`, `floop`, `spell`, `turnStart`, `victory`, `defeat`). They are synthesised with WebAudio today; `registerSample(event, url)` swaps in real files.
- **Assets** (`assets/manifest.ts`): every key and path lives in one place. Card definitions refer to art keys (`card:<id>`), never file paths.

## AI

`src/game/ai/`:

- `legalActions.ts` enumerates concrete legal actions, de-duplicating identical cards in hand.
- `AIController.ts`: for each candidate it runs `applyAction`, then plays the rest of the turn as `END_TURN` (which runs the fight). It scores the resulting position with `evaluate`, picks the best action if it beats ending the turn by a margin, and repeats. `MAX_ACTIONS_PER_TURN` guarantees termination.
- `evaluate.ts` sums named components:
  - **lethalPotential:** your pressure ≥ their HP (bonus), their threat ≥ your HP (heavy penalty)
  - **immediateDamage:** damage already dealt, plus the pressure you project
  - **defenseValue:** your HP minus expected incoming damage to your hero
  - **boardControl** and **removalValue:** your creature value minus theirs (ATK, health, FLOOP, pierce, walls)
  - **synergy:** buildings, and auras that are actually supporting a creature
  - **resources:** cards in hand, with a penalty for an empty deck

The AI only reads public information: the board, HP and hand *counts*. The debug panel shows the last decision's breakdown.

## Toward multiplayer

Nothing in `src/game` knows who is human. To play online you would:

1. Run `applyAction` on a server (or on the host peer) as the authority.
2. Send `Action`s up and `events` (plus state hashes) down.
3. Redact the opponent's hand and deck order from the state each client receives.

The renderer already animates from events rather than from state diffs.

## Performance

- Board pieces are containers of primitives. Hand faces are created once per card and reused.
- Nothing allocates per frame: no `update()` loops, only tweens.
- Particle emitters are one-shot and destroyed after about 0.7 s.
- SVGs are rasterised once at load, at 2× their display size.
- The AI evaluates about 20–60 cloned states per decision, well under a frame budget on desktop.
