const { test, expect } = require('@playwright/test');

test.describe('Landing nav móvil @mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hamburguesa abre el cajón y Entrar destaca', async ({ page }) => {
    await page.addInitScript(() => {
      window.PT_E2E_MODE = true;
      localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
        necessary: true, analytics: false, ts: Date.now()
      }));
    });

    await page.goto('/');
    await page.waitForSelector('.landing-login-btn', { timeout: 20000 });

    const headerLogin = page.locator('.landing-login-btn').first();
    await expect(headerLogin).toBeVisible();
    await expect(headerLogin).toHaveClass(/btn-primary/);

    const toggle = page.locator('#landing-nav-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('body')).toHaveClass(/landing-nav-open/);
    await expect(page.locator('#landing-nav')).toBeVisible();
    await expect(page.locator('#landing-nav [data-i18n="nav.how"]')).toBeVisible();
    await expect(page.locator('#landing-nav [data-i18n="nav.features"]')).toBeVisible();

    await page.locator('#landing-nav-close').click();
    await expect(page.locator('body')).not.toHaveClass(/landing-nav-open/);
  });
});
