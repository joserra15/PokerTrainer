const { test, expect } = require('@playwright/test');
const {
  mockAuthenticatedUser,
  waitForAppShell,
  skipActionPlaybackIfNeeded,
  playActionButtons
} = require('./helpers');

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
    // Modo rápido evita la animación «Saltar» (flaky en viewport móvil por re-render).
    const quick = page.locator('#setup-action-mode [data-val="quick"]');
    if (await quick.isVisible().catch(() => false)) {
      await quick.click({ force: true });
    }
    await page.locator('#play-start').click({ force: true });
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });

    // Esperar botones estables (evitar scrollIntoView sobre nodos que se re-renderizan)
    await skipActionPlaybackIfNeeded(page);
    const actions = playActionButtons(page);
    await expect(actions.first()).toBeVisible({ timeout: 20000 });
    expect(await actions.count()).toBeGreaterThan(0);
    await expect(page.locator('#play-active')).toBeVisible();
  });
});
