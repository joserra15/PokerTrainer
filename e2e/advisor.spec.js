const { test, expect } = require('@playwright/test');
const {
  mockAuthenticatedUser,
  waitForAppShell,
  clickFirstPlayAction,
  playActionButtons,
  playSkipButton
} = require('./helpers');

test.describe('Live Advisor @smoke', () => {
  test('advisor ON no rompe acciones', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    await page.evaluate(() => {
      const el = document.getElementById('setup-live-advisor');
      if (el) {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      localStorage.setItem('pt_live_advisor_v1', '1');
    });

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await clickFirstPlayAction(page);

    const handEnd = page.locator('#modal:not(.hidden) .hand-end-popup');
    const toast = page.locator('#verdict-toast.visible');
    const nextSkip = playSkipButton(page);
    const nextBtn = playActionButtons(page);
    await expect(handEnd.or(toast).or(nextSkip).or(nextBtn)).toBeVisible({ timeout: 20000 });
  });
});
