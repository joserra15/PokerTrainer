const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

test.describe('Tipo de rival explotativo @smoke', () => {
  test('Avanzadas: tipo Fish + explotativo arranca mesa', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    await openPlaySetupAdvanced(page);
    await expect(page.locator('#setup-group-villain-type')).toBeVisible();
    await expect(page.locator('#setup-villain-type [data-val="random"]')).toHaveClass(/active/);
    await expect(page.locator('#setup-group-score-mode')).toBeHidden();

    await page.click('#setup-villain-type [data-val="fish"]');
    await expect(page.locator('#setup-villain-type [data-val="fish"]')).toHaveClass(/active/);
    await expect(page.locator('#setup-group-score-mode')).toBeVisible();
    await page.click('#setup-score-mode [data-val="exploit"]');
    await expect(page.locator('#setup-score-mode [data-val="exploit"]')).toHaveClass(/active/);

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await expect(page.locator('#play-active .table-felt')).toBeVisible();
  });

  test('Aleatorio oculta criterio explotativo', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await openPlaySetupAdvanced(page);
    await page.click('#setup-villain-type [data-val="nit"]');
    await expect(page.locator('#setup-group-score-mode')).toBeVisible();
    await page.click('#setup-villain-type [data-val="random"]');
    await expect(page.locator('#setup-group-score-mode')).toBeHidden();
    await expect(page.locator('#setup-score-mode [data-val="gto"]')).toHaveClass(/active/);
  });
});
