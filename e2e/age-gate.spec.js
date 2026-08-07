const { test, expect } = require('@playwright/test');
const { mockFreshAuthenticatedUser } = require('./helpers');

test.describe('Age-gate y cookies @smoke', () => {
  test('perfil fresco muestra age-gate o cookie banner', async ({ page }) => {
    await mockFreshAuthenticatedUser(page);
    await page.goto('/');
    await page.waitForSelector('#app-shell:not(.hidden), #age-gate-modal, #cookie-banner', {
      timeout: 30000
    });

    const age = page.locator('#age-gate-modal:not(.hidden), #age-gate-modal:not([hidden])');
    const cookie = page.locator('#cookie-banner:not(.hidden), #cookie-banner:not([hidden])');
    const ageVisible = await age.isVisible().catch(() => false);
    const cookieVisible = await cookie.isVisible().catch(() => false);

    // Al menos uno de los flujos legales debe aparecer sin seeds
    expect(ageVisible || cookieVisible || await page.locator('body.age-gate-open').count()).toBeTruthy();

    if (ageVisible) {
      await expect(page.locator('#age-gate-confirm, #age-gate-exit').first()).toBeVisible();
      if (await page.locator('#age-gate-confirm').isVisible()) {
        await page.click('#age-gate-confirm');
      }
    }
    if (await cookie.isVisible().catch(() => false)) {
      const accept = page.locator('#cookie-accept-necessary, #cookie-accept-all').first();
      if (await accept.isVisible()) await accept.click();
    }
  });
});
