const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Paywall free @smoke', () => {
  test('techo trainer muestra paywall', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.evaluate(() => {
      if (!window.PTEntitlements) throw new Error('PTEntitlements missing');
      window.PTEntitlements.canStartTrainerHand = function () {
        return { ok: false, reason: 'trainer_limit', used: 15, limit: 15 };
      };
      window.PTEntitlements.canUseAI = function () {
        return { ok: false, reason: 'ai_limit', used: 3, limit: 3 };
      };
    });

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await page.click('#play-start');

    await expect(page.locator('#paywall-modal:not(.hidden)')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#paywall-body')).toContainText(/manos|plan|Gratis|Study|15/i);
    await expect(page.locator('#paywall-to-pricing')).toBeVisible();
  });

  test('cuota IA agotada muestra paywall al invocar showPaywall', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.evaluate(() => {
      window.PTBilling.showPaywall('ai_limit');
    });

    await expect(page.locator('#paywall-modal:not(.hidden)')).toBeVisible();
    await expect(page.locator('#paywall-title')).toContainText(/IA/i);
    await expect(page.locator('#paywall-body')).toContainText(/consultas|bono|IA/i);
  });
});
