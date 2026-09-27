import { expect, type Page } from '@playwright/test';
// Brings in the window.__cardwars type declaration.
import type {} from '../../src/debug/testHooks';

type Kind = 'hand' | 'creature' | 'building' | 'floop' | 'lane-bottom' | 'lane-top';

interface CreatureSeed {
  uid: string;
  defId: string;
  owner: 'P1' | 'P2';
}

/** Collects console errors and uncaught exceptions for the whole test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    if (r.url().includes('/assets/')) errors.push(`missing asset: ${r.url()}`);
  });
  return errors;
}

export async function startBattle(page: Page, deck: 'finn' | 'jake' = 'finn', seed = 7): Promise<void> {
  await page.goto(`/?test=true&seed=${seed}&speed=8`);
  await page.getByTestId('menu-play').click();
  await page.getByTestId(`pick-${deck}`).click();
  await waitForMyTurn(page);
}

export async function waitIdle(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__cardwars !== undefined && !window.__cardwars.busy(), null, { timeout: 60_000 });
}

export async function waitForMyTurn(page: Page): Promise<void> {
  await page.waitForFunction(
    () => window.__cardwars !== undefined && window.__cardwars.state().activePlayer === 'P1' && !window.__cardwars.busy(),
    null,
    { timeout: 60_000 },
  );
}

export function state(page: Page) {
  return page.evaluate(() => window.__cardwars!.state());
}

/** Clicks the real canvas at the centre of a battle object. */
export async function clickOn(page: Page, kind: Kind, id: string): Promise<void> {
  const p = await page.evaluate(([k, i]) => window.__cardwars!.point(k as Kind, i), [kind, id] as const);
  expect(p, `${kind} ${id} should be on screen`).not.toBeNull();
  await page.mouse.click(p!.x, p!.y);
}

export async function handUid(page: Page, defId: string): Promise<string> {
  const s = await state(page);
  const card = s.players.P1.hand.find((c) => c.defId === defId);
  expect(card, `${defId} in hand`).toBeTruthy();
  return card!.uid;
}

/** Test-only setup through the debug hook (never used for the action under test). */
export async function setup(page: Page, patch: { hand?: { uid: string; defId: string }[]; creatures?: (CreatureSeed & { lane: number })[]; hp?: { P1?: number; P2?: number }; ap?: number; clearBoard?: boolean }): Promise<void> {
  await page.evaluate((patch) => {
    window.__cardwars!.mutate((s) => {
      if (patch.clearBoard) for (const p of Object.values(s.players)) for (const l of p.lanes) l.creature = null;
      for (const c of patch.hand ?? []) s.players.P1.hand.push(c);
      for (const c of patch.creatures ?? []) {
        s.players[c.owner].lanes[c.lane].creature = {
          uid: c.uid, defId: c.defId, owner: c.owner, damage: 0, atkMod: 0, defMod: 0, tempAtk: 0, tempDef: 0,
          flooped: false, drowsy: false, frozen: false, hasAttacked: false,
        };
      }
      if (patch.hp?.P1 !== undefined) s.players.P1.hp = patch.hp.P1;
      if (patch.hp?.P2 !== undefined) s.players.P2.hp = patch.hp.P2;
      if (patch.ap !== undefined) s.players.P1.ap = patch.ap;
    });
  }, patch);
  await waitIdle(page);
}
