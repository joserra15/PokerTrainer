const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Mobile play layout @mobile @smoke', () => {
  test('play en viewport móvil: acciones visibles', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    // En móvil el tab puede estar fuera del viewport → navegar por API
    await page.evaluate(() => {
      if (window.goToTab) window.goToTab('play', { setup: true });
      else document.querySelector('button.tab[data-tab="play"]')?.click();
    });
    await page.waitForSelector('#play-setup:not(.hidden), #play-start', { timeout: 15000 });
    await page.locator('#play-start').click({ force: true });
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await page.waitForSelector('#actions .btn', { timeout: 60000 });

    const actions = page.locator('#actions .btn').first();
    await actions.scrollIntoViewIfNeeded();
    await expect(actions).toBeVisible();
    expect(await page.locator('#actions .btn').count()).toBeGreaterThan(0);
    await expect(page.locator('#play-active')).toBeVisible();
  });
});

