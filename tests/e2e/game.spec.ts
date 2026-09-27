import { expect, test } from '@playwright/test';
import { clickOn, handUid, setup, startBattle, state, waitForMyTurn, waitIdle, watchErrors } from './helpers';

test.describe('menus', () => {
  test('title screen loads cleanly and shows every menu entry', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Card Wars: Land of Ooo/i })).toBeVisible();
    for (const id of ['menu-play', 'menu-decks', 'menu-howto', 'menu-settings']) await expect(page.getByTestId(id)).toBeVisible();
    await page.getByTestId('menu-settings').click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.getByLabel('Reduce motion').check();
    await page.getByRole('button', { name: 'Done' }).click();
    expect(errors).toEqual([]);
  });

  test('deck selection shows both heroes and the deck browser lists cards', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('menu-play').click();
    await expect(page.getByRole('heading', { name: 'Finn the Human' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jake the Dog' })).toBeVisible();
    await page.getByTestId('back').click();
    await page.getByTestId('menu-decks').click();
    await expect(page.locator('.mini-card')).toHaveCount(22);
    await page.getByRole('tab', { name: 'Corn Fields Crew' }).click();
    await expect(page.locator('.mini-card').first()).toContainText('Husker Knight');
  });

  test('the tutorial is interactive', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('menu-howto').click();
    const demo = page.locator('.tutorial__demo');
    await demo.waitFor();
    await page.waitForTimeout(300);
    const box = (await demo.boundingBox())!;
    // Step 1: click the Useless Swamp lane (third tile).
    await page.mouse.click(box.x + box.width * 0.62, box.y + box.height / 2 - 10);
    await expect(page.locator('.tutorial__try')).toHaveAttribute('data-done', 'true');
    await page.getByTestId('tut-next').click();
    await expect(page.locator('#tut-title')).toHaveText('Cards');
  });
});

test.describe('battle', () => {
  test('plays a creature, refuses a wrong landscape, fights and survives an AI turn', async ({ page }) => {
    const errors = watchErrors(page);
    await startBattle(page, 'finn', 42);
    const pup = await handUid(page, 'plains-pup');
    const apBefore = (await state(page)).players.P1.ap;
    await clickOn(page, 'hand', pup);
    await clickOn(page, 'lane-bottom', '0');
    await waitIdle(page);
    let s = await state(page);
    expect(s.players.P1.lanes[0].creature?.defId).toBe('plains-pup');
    expect(s.players.P1.ap).toBe(apBefore);

    const hopper = await handUid(page, 'bog-hopper');
    await clickOn(page, 'hand', hopper);
    await clickOn(page, 'lane-bottom', '0');
    await expect(page.locator('.toast').last()).toHaveText('Wrong Landscape');
    await clickOn(page, 'lane-bottom', '2');
    await waitIdle(page);
    s = await state(page);
    expect(s.players.P1.lanes[2].creature?.defId).toBe('bog-hopper');
    expect(s.players.P1.ap).toBe(apBefore - 1);

    await page.getByTestId('fight').click();
    await page.waitForFunction(() => window.__cardwars!.state().turn >= 3, null, { timeout: 60_000 });
    await waitForMyTurn(page);
    s = await state(page);
    expect(s.log).toContain('Plains Pup attacks Jake directly.'); // hasty pup hit the empty lane
    expect(s.log.some((l) => l.startsWith('Turn 2: Jake'))).toBe(true);
    expect(s.players.P2.lanes.some((l) => l.creature)).toBe(true); // the AI deployed
    expect(errors).toEqual([]);
  });

  test('casts a targeted spell and uses a FLOOP', async ({ page }) => {
    await startBattle(page, 'finn', 7);
    await setup(page, {
      ap: 2,
      hand: [{ uid: 'e2e-strike', defId: 'hero-strike' }],
      creatures: [
        { uid: 'e2e-squire', defId: 'sharpshooter-squire', owner: 'P1', lane: 1 },
        { uid: 'e2e-foe', defId: 'husker-knight', owner: 'P2', lane: 3 },
      ],
    });
    await clickOn(page, 'hand', 'e2e-strike');
    await clickOn(page, 'creature', 'e2e-foe');
    await waitIdle(page);
    expect((await state(page)).players.P2.lanes[3].creature?.damage).toBe(4);

    await clickOn(page, 'floop', 'e2e-squire');
    await clickOn(page, 'creature', 'e2e-foe');
    await waitIdle(page);
    const s = await state(page);
    expect(s.players.P2.lanes[3].creature?.damage).toBe(6);
    expect(s.players.P1.lanes[1].creature?.flooped).toBe(true);

    await clickOn(page, 'floop', 'e2e-squire');
    await expect(page.locator('.toast').last()).toHaveText('Already FLOOPed this turn');
  });

  test('unaffordable cards explain themselves', async ({ page }) => {
    await startBattle(page, 'jake', 5);
    await setup(page, { ap: 0, hand: [{ uid: 'e2e-silo', defId: 'corn-silo' }] });
    await clickOn(page, 'hand', 'e2e-silo');
    await expect(page.locator('.toast').last()).toHaveText('Not enough Action Points');
  });

  test('victory, then rematch starts a fresh match', async ({ page }) => {
    await startBattle(page, 'finn', 9);
    await setup(page, { hp: { P2: 2 }, clearBoard: true, creatures: [{ uid: 'e2e-dog', defId: 'cool-dog', owner: 'P1', lane: 3 }] });
    await page.getByTestId('fight').click();
    await expect(page.getByTestId('result-title')).toHaveText('Victory!', { timeout: 30_000 });
    await page.getByTestId('rematch').click();
    await waitForMyTurn(page);
    const s = await state(page);
    // A brand-new match: at most one AI turn has happened and nothing from the old game remains.
    expect(s.turn).toBeLessThanOrEqual(2);
    expect(s.players.P2.hp).toBe(25);
    expect(s.log.some((l) => l.includes('wins the Card War'))).toBe(false);
  });

  test('defeat when the AI finishes you off', async ({ page }) => {
    await startBattle(page, 'jake', 13);
    await setup(page, { hp: { P1: 1 }, clearBoard: true, creatures: [{ uid: 'e2e-foe', defId: 'plains-pup', owner: 'P2', lane: 0 }] });
    await page.getByTestId('fight').click();
    await expect(page.getByTestId('result-title')).toHaveText('Defeat', { timeout: 60_000 });
    await page.getByTestId('to-title').click();
    await expect(page.getByTestId('menu-play')).toBeVisible();
  });

  test('reloading mid-match returns to a working title screen', async ({ page }) => {
    await startBattle(page, 'finn', 21);
    await page.reload();
    await page.getByTestId('menu-play').click();
    await page.getByTestId('pick-jake').click();
    await page.waitForFunction(() => window.__cardwars !== undefined && window.__cardwars.state().turn >= 1);
  });

  test('keyboard: number keys select, arrows pick a lane, Enter plays', async ({ page }) => {
    await startBattle(page, 'finn', 42);
    await setup(page, { ap: 2, hand: [{ uid: 'e2e-wisp', defId: 'rainbow-wisp' }] });
    const s0 = await state(page);
    const index = s0.players.P1.hand.findIndex((c) => c.uid === 'e2e-wisp');
    await page.locator('canvas').focus();
    await page.keyboard.press(String(index + 1));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await waitIdle(page);
    const s = await state(page);
    expect(s.players.P1.lanes.some((l) => l.creature?.uid === 'e2e-wisp')).toBe(true);
  });

  test('debug panel only appears with ?debug=true', async ({ page }) => {
    await startBattle(page, 'finn', 3);
    await expect(page.getByTestId('debug-panel')).toHaveCount(0);
    await page.goto('/?debug=true&seed=3&speed=4');
    await page.getByTestId('menu-play').click();
    await page.getByTestId('pick-finn').click();
    await expect(page.getByTestId('debug-panel')).toBeVisible();
    await expect(page.getByTestId('debug-panel')).toContainText('seed 3');
  });
});

test.describe('responsive', () => {
  for (const [w, h] of [[1280, 720], [1920, 1080], [1024, 768], [768, 1024]] as const) {
    test(`battle fits at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      const errors = watchErrors(page);
      await startBattle(page, 'finn', 11);
      const layout = await page.evaluate(() => {
        const rail = document.querySelector('.rail')!.getBoundingClientRect();
        const fight = document.querySelector('[data-testid="fight"]')!.getBoundingClientRect();
        return {
          scrollX: document.documentElement.scrollWidth > window.innerWidth,
          railInside: rail.left >= 0 && rail.top >= 0 && rail.right <= window.innerWidth + 1 && rail.bottom <= window.innerHeight + 1,
          fightInside: fight.bottom <= window.innerHeight && fight.right <= window.innerWidth,
        };
      });
      expect(layout).toEqual({ scrollX: false, railInside: true, fightInside: true });
      const s = await state(page);
      for (const card of s.players.P1.hand) {
        const p = await page.evaluate((uid) => window.__cardwars!.point('hand', uid), card.uid);
        expect(p!.x).toBeGreaterThan(0);
        expect(p!.x).toBeLessThan(w);
        expect(p!.y).toBeLessThan(h);
      }
      expect(errors).toEqual([]);
    });
  }
});
