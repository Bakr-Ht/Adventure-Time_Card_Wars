# Testing

## Unit tests (Vitest)

```bash
npm test
```

| File | Covers |
| --- | --- |
| `tests/unit/cards.test.ts` | All definitions valid; both decks legal at 40 cards; minimum variety (10+ creatures, 5+ buildings, 5+ spells); the validator catches broken cards |
| `tests/unit/rules.test.ts` | AP spending and refunds; first-player handicap; turn ownership; wrong landscape; landscape-count requirements; Rainbow placement; stat folding (buildings, landscapes, adjacency); persistent damage; hero heal cap |
| `tests/unit/combat.test.ts` | One-way lane damage; destruction; Pierce; hero damage through empty lanes; drowsy, Hasty, Wall and creatures-only rules; freeze and thaw; win condition, death-trigger wins, concede |
| `tests/unit/floop.test.ts` | FLOOP applies its effect and prevents fighting; once per turn; resets on the owner's next turn; target requirements; ownership; building FLOOPs |
| `tests/unit/ai.test.ts` | Full AI-vs-AI games on several seeds with state invariants checked every turn (card conservation, hand limit, AP bounds, no dead creatures left on board); takes lethal; removes a threat; never overspends |
| `tests/unit/balance.sim.test.ts` | Opt-in (`npm run sim`): win-rate report over 80 games |

Helpers in `tests/unit/helpers.ts` build a blank board (`blankGame`), put cards in hand (`give`), place creatures and buildings (`place`, `build`), and apply or expect-reject actions.

## Browser tests (Playwright)

```bash
npm run test:e2e
```

The config builds the game and serves `dist/` with `vite preview` on port 5199, so the tests cover the production bundle and are not affected by dev-server hot reloads. If `/opt/pw-browsers/chromium` exists, or `PW_CHROMIUM_PATH` is set, that browser is used; otherwise Playwright's own Chromium is used (`npx playwright install chromium`).

Tests drive the **real canvas**. `?test=true` exposes `window.__cardwars` with:

- `state()`: a clone of the current `GameState`
- `busy()`: true while animations or tweens are running
- `point(kind, id)`: the CSS-pixel centre of a hand card, creature, building, FLOOP pill or lane, so tests click exactly where a player would
- `mutate(fn)`: **setup only** (e.g. put a specific card in hand). The action under test is always performed with real clicks.

Suites in `tests/e2e/game.spec.ts`:

- **Menus:** title loads without console errors; settings dialog; deck selection; deck browser (22 unique cards); tutorial step completion.
- **Battle:**
  - play a creature; "Wrong Landscape" feedback; FIGHT; the AI takes a full turn and deploys
  - targeted spell; FLOOP with target; "Already FLOOPed this turn"
  - "Not enough Action Points"
  - victory, then rematch into a fresh match
  - defeat, then return to title
  - reload mid-match
  - keyboard play (number key, arrow, Enter)
  - debug panel only with `?debug=true`
- **Responsive:** 1280×720, 1920×1080, 1024×768 and 768×1024. Checks there is no horizontal scroll, the rail and FIGHT button are inside the viewport, every hand card is on screen, and there are no errors.

## Manual QA checklist

- [ ] Hover a hand card: it lifts. Unplayable cards are dimmed; clicking one shows the reason.
- [ ] Select a creature: valid lanes pulse green with a plus marker.
- [ ] Targeting shows red rings (enemies) or green rings (friends), with a yellow hint banner.
- [ ] Enemy creatures facing an empty lane of yours show a red danger ring on your turn.
- [ ] FLOOP turns the card sideways; the log explains the ability.
- [ ] FIGHT: lunges, hit numbers, shakes, destruction bursts, HP bars tween.
- [ ] Turn banners, and a readable AI turn (the AI's cards are shown centre-screen before they land).
- [ ] Settings: volume, mute, reduced motion (animations become short fades), opponent speed.
- [ ] `?debug=true` panel buttons all work.
