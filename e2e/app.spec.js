const path = require('path');
const { test, expect } = require('@playwright/test');
const {
  mockAuthenticatedUser,
  waitForAppShell,
  clickFirstPlayAction,
  playActionButtons,
  playSkipButton,
  expectAnyVisible
} = require('./helpers');

test.describe('Modo Jugar', () => {
  test('juega al menos una decisión preflop', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await page.click('#play-start');

    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await page.waitForSelector('#play-table-loading.hidden, #play-table-loading:not(.hidden)', { timeout: 5000 }).catch(() => {});
    await clickFirstPlayAction(page);

    // Si la acción cierra la mano (p. ej. fold), el pop-up de fin de mano
    // oculta el toast a propósito. En modo completo también puede seguir
    // el playback (Saltar) o la siguiente decisión.
    const toast = page.locator('#verdict-toast.visible');
    const handEnd = page.locator('#modal:not(.hidden) .hand-end-popup');
    const nextSkip = playSkipButton(page);
    const nextBtn = playActionButtons(page);
    await expectAnyVisible(toast.or(handEnd).or(nextSkip).or(nextBtn), { timeout: 15000 });

    if (await handEnd.isVisible()) {
      await expect(handEnd.locator('.hand-end-popup-stats .lbl', { hasText: /Puntuaci[oó]n de la mano/i })).toBeVisible();
      await expect(handEnd.locator('.hand-score-optimal')).toBeVisible();
    }
  });
});

test.describe('Importar sesión', () => {
  test('procesa fixture Winamax', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="sessions"]');
    await page.waitForSelector('#session-file', { timeout: 10000 });

    const fixture = path.join(__dirname, '..', 'tools', 'fixtures', 'Winamax-sample.txt');
    await page.setInputFiles('#session-file', fixture);
    await expect(page.locator('#process-session')).toBeEnabled();
    await page.click('#process-session');

    await expect(page.locator('#import-status')).toContainText(/procesad|analizad|manos/i, { timeout: 120000 });
  });
});
