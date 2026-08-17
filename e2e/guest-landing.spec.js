const { test, expect } = require('@playwright/test');
const { playActionButtons, skipActionPlaybackIfNeeded } = require('./helpers');

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

    const aiDialogs = [];
    page.on('dialog', async (dialog) => {
      aiDialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto('/');
    await page.waitForSelector('[data-landing-try]', { timeout: 20000 });
    await expect(page.locator('#landing-hero h1')).toContainText(/5 manos|aciertas/i);
    await expect(page.locator('#landing-promo-code-form')).toBeHidden();
    await expect(page.locator('#landing-how')).toBeVisible();

    await expect(page.locator('#landing-hero [data-landing-try]')).toHaveText(/^Probar ahora$/);
    await expect(page.locator('#landing-eyebrow, .landing-eyebrow')).not.toContainText(/sin tarjeta|trampa/i);
    await expect(page.locator('#landing-hero .landing-lead')).not.toContainText(/instinto recreativo/i);
    await expect(page.locator('.landing-hero-challenge')).toHaveText(/Serás capaz de jugar estas manos correctamente/i);
    await expect(page.locator('.landing-felt')).toHaveCount(0);
    await expect(page.locator('#landing-how')).toContainText(/entrenador IA 24\/7/i);
    await expect(page.locator('#landing-how')).toContainText(/Aciertas las cinco manos, del preflop al river/i);
    await expect(page.locator('#guest-gate-login')).toHaveText(/Continuar con Google/);
    await expect(page.locator('#guest-gate-modal [data-guest-landing]')).toHaveText(/Volver al inicio/);

    await page.locator('[data-landing-try]').first().click();
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
    await expect(page.locator('#auth-gate')).toHaveClass(/hidden/);
    await expect(page.locator('#guest-mode-banner')).toBeVisible();
    await expect(page.locator('#guest-mode-banner')).not.toContainText(/trampa/i);
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 25000 });
    await skipActionPlaybackIfNeeded(page);
    await expect(playActionButtons(page).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#play-active button[data-action="fold"]')).toBeVisible();
    await expect(page.locator('#play-active button[data-action="call"]')).toBeVisible();
    await expect(page.locator('#new-hand')).toBeVisible();
    await expect(page.locator('#new-hand')).toHaveText(/Siguiente mano/i);
    await expect(page.locator('#replay-hand')).toBeHidden();
    await expect(page.locator('#new-session')).toBeHidden();
    await expect(page.locator('#btn-help')).toBeHidden();

    const oauth = await page.evaluate(() => window.__ptOAuthCalls || 0);
    expect(oauth).toBe(0);
    expect(aiDialogs.filter((m) => /servicio de IA|ForgeCoach/i.test(m))).toEqual([]);
  });
});
