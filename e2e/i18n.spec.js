const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

test.describe('i18n ES/EN @smoke', () => {
  test('cambio de idioma no deja keys crudas', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await goTab(page, 'account');
    const enChip = page.locator('[data-settings-lang="en"]');
    if (await enChip.isVisible().catch(() => false)) {
      await enChip.click();
    } else {
      await page.evaluate(() => {
        if (window.PTI18n && window.PTI18n.setLang) window.PTI18n.setLang('en');
        else localStorage.setItem('pt_lang_v1', 'en');
      });
      await page.reload();
      await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
    }

    await page.click('button.tab[data-tab="play"]');
    const playText = await page.locator('#tab-play, #play-setup, #app-shell').first().innerText();
    expect(playText).not.toMatch(/\bpt\.[a-z0-9_.]+/i);
    expect(playText).not.toMatch(/\bi18n\.[a-z0-9_.]+/i);

    await page.click('button.tab[data-tab="pricing"]');
    const pricing = await page.locator('#tab-pricing').innerText();
    expect(pricing).not.toMatch(/\bpt\.[a-z0-9_.]+/i);
  });
});
