import { expect, test } from '@playwright/test';

test.describe('game library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('browse, filter, select, rate and persist', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await expect(page.getByRole('heading', { name: 'Your shelf' })).toBeVisible();
    await expect(page.locator('.cart')).toHaveCount(10);

    await page.getByRole('radio', { name: /Wishlist/ }).click();
    await expect(page.locator('.cart')).toHaveCount(2);
    await page.getByRole('radio', { name: /^All/ }).click();

    await page.getByLabel('Search games').fill('cherry');
    await expect(page.locator('.cart')).toHaveCount(1);
    await page.locator('.cart').first().click();
    await expect(page.locator('#screen-title')).toHaveText('Hollow Knight');

    await page.getByRole('radio', { name: '4 hearts' }).click();
    await page.getByRole('radio', { name: 'Finished', exact: true }).click();
    await page.reload();
    await page.getByLabel('Search games').fill('cherry');
    await expect(page.locator('.cart').first()).toContainText('Finished');
    await expect(page.locator('.cart-hearts .ic')).toHaveCount(4);
    expect(errors).toEqual([]);
  });

  test('add a game, then remove and undo', async ({ page }) => {
    await page.getByRole('button', { name: 'Add a game' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add a cartridge' });
    await dialog.getByRole('button', { name: 'Put it on the shelf' }).click();
    await expect(dialog.getByRole('alert')).toContainText('title');
    await dialog.getByLabel('Title').fill('Tunic');
    await dialog.getByLabel('Genre').fill('Adventure');
    await dialog.getByRole('button', { name: 'Put it on the shelf' }).click();
    await expect(page.locator('#screen-title')).toHaveText('Tunic');
    await expect(page.locator('.cart')).toHaveCount(11);

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('.cart')).toHaveCount(10);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.cart')).toHaveCount(11);
  });

  test('BMO picks something from up next', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Pick for me' }).click();
    await expect(page.locator('.seg-btn[aria-checked="true"]')).toHaveText('Up next');
  });
});
