const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

test.describe('Modo completo de mesa @smoke', () => {
  test('completo: reproduce acción y permite saltar a la decisión', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await openPlaySetupAdvanced(page);
    await page.click('#setup-action-mode [data-val="complete"]');
    await page.click('#setup-scenario [data-val="rfi"]');
    await page.waitForSelector('#setup-hero-pos [data-val="CO"]', { timeout: 10000 });
    await page.click('#setup-hero-pos [data-val="CO"]');
    await page.click('#play-start');

    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    const skip = page.locator('.action-play-skip');
    const actionBtn = page.locator('#play-active:not(.hidden) #actions button[data-action]');
    await expect(skip.or(actionBtn)).toBeVisible({ timeout: 20000 });

    if (await skip.isVisible().catch(() => false)) {
      await expect(page.locator('.action-play-status')).toBeVisible();
      await skip.click();
    }

    await page.waitForSelector('#play-active:not(.hidden) #actions button[data-action]', { timeout: 15000 });
    await actionBtn.first().click();

    const toast = page.locator('#verdict-toast.visible');
    const handEnd = page.locator('#modal:not(.hidden) .hand-end-popup');
    const nextSkip = page.locator('.action-play-skip');
    const nextBtn = page.locator('#play-active:not(.hidden) #actions button[data-action]');
    await expect(toast.or(handEnd).or(nextSkip).or(nextBtn)).toBeVisible({ timeout: 20000 });
  });

  test('rápido: la decisión aparece sin reproductor', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await openPlaySetupAdvanced(page);
    await page.click('#setup-action-mode [data-val="quick"]');
    await page.click('#play-start');

    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await page.waitForSelector('#play-active:not(.hidden) #actions button[data-action]', { timeout: 20000 });
    await expect(page.locator('.action-play-skip')).toHaveCount(0);
  });
});
