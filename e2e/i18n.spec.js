const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

test.describe('i18n ES/EN @smoke', () => {
  test('cambio de idioma no deja keys crudas', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await goTab(page, 'account');
    await page.evaluate(() => {
      if (window.PTI18n && window.PTI18n.setLang) window.PTI18n.setLang('en');
      else localStorage.setItem('pt_lang_v1', 'en');
    });
    const enChip = page.locator('[data-settings-lang="en"]');
    if (await enChip.isVisible().catch(() => false)) {
      await enChip.click();
    }
    /* setLang a veces requiere reload para repintar copy estática. */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppShell(page);

    await goTab(page, 'play');
    const playText = await page.locator('#tab-play.active').innerText();
    expect(playText).not.toMatch(/\bpt\.[a-z0-9_.]+/i);
    expect(playText).not.toMatch(/\bi18n\.[a-z0-9_.]+/i);

    await goTab(page, 'pricing');
    const pricing = await page.locator('#tab-pricing.active').innerText();
    expect(pricing).not.toMatch(/\bpt\.[a-z0-9_.]+/i);
  });
});
