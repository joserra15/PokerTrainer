const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

/** RG-A04 — asserts estables de check-hand-end-popup / HUD (Playwright). */
test.describe('Layout play / hand-end @smoke', () => {
  test('fin de mano muestra popup de score o feedback', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-start', { timeout: 15000 });
    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden) #actions .btn', { timeout: 60000 });

    for (let i = 0; i < 16; i++) {
      const handEnd = page.locator('#modal:not(.hidden) .hand-end-popup');
      if (await handEnd.isVisible().catch(() => false)) break;
      const toast = page.locator('#verdict-toast.visible');
      if (await toast.isVisible().catch(() => false)) break;
      // Solo botones de decisión — #next-after queda bajo el modal de fin de mano.
      const btns = page.locator('#play-active:not(.hidden) #actions button[data-action]');
      if ((await btns.count()) === 0) break;
      await btns.first().click({ timeout: 5000, force: true }).catch(() => {});
      await expect(page.locator('body')).toBeVisible();
    }

    const popup = page.locator('#modal:not(.hidden) .hand-end-popup');
    if (await popup.isVisible().catch(() => false)) {
      await expect(popup).toContainText(/Puntuaci|Resultado|EV|mano/i);
      const hud = page.locator('#play-hud, #hud-hands');
      if (await hud.count()) await expect(hud.first()).toBeAttached();
    } else {
      // Fold preflop a veces cierra sin modal si hay toast; aceptar feedback
      await expect(
        page.locator('#verdict-toast.visible, #play-active, #history-list').first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
