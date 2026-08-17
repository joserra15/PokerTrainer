const { test, expect } = require('@playwright/test');
const { clickFirstPlayAction, playActionButtons, playSkipButton } = require('./helpers');

test.describe('Landing guest L0–L2 @smoke', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Probar ahora abre la mesa sin OAuth', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ptOAuthCalls = 0;
      window.PT_E2E_MODE = true;
      localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
        necessary: true, analytics: false, ts: Date.now()
      }));
    });

    await page.goto('/');
    await page.waitForSelector('[data-landing-try]', { timeout: 20000 });
    await expect(page.locator('#landing-hero h1')).toContainText(/5 manos|aciertas/i);
    await expect(page.locator('#landing-promo-code-form')).toBeHidden();
    await expect(page.locator('#landing-how')).toBeVisible();

    await page.locator('[data-landing-try]').first().click();
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
    await expect(page.locator('#auth-gate')).toHaveClass(/hidden/);
    await expect(page.locator('#guest-mode-banner')).toBeVisible();
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 25000 });
    await expect(playActionButtons(page).or(playSkipButton(page))).toBeVisible({ timeout: 20000 });

    const oauth = await page.evaluate(() => window.__ptOAuthCalls || 0);
    expect(oauth).toBe(0);
  });
});
