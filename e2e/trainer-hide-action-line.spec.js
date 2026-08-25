const { test, expect } = require('@playwright/test');
const {
  mockAuthenticatedUser,
  waitForAppShell
} = require('./helpers');

test.describe('Ocultar línea de acción previa @smoke', () => {
  test('opción desactivada por defecto; se activa en flop/turn/river; × oculta en mesa', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    const wrap = page.locator('#setup-hide-action-line-wrap');
    const checkbox = page.locator('#setup-hide-action-line');

    await expect(wrap).toHaveClass(/is-disabled/);
    await expect(checkbox).toBeDisabled();
    await expect(checkbox).not.toBeChecked();

    await page.click('#setup-practice-street .setup-chip[data-val="flop"]');
    await expect(wrap).not.toHaveClass(/is-disabled/);
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).not.toBeChecked();

    await page.click('#setup-practice-street .setup-chip[data-val="preflop"]');
    await expect(wrap).toHaveClass(/is-disabled/);
    await expect(checkbox).toBeDisabled();

    await page.click('#setup-practice-street .setup-chip[data-val="turn"]');
    await expect(checkbox).toBeEnabled();

    await page.click('#setup-practice-street .setup-chip[data-val="river"]');
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).not.toBeChecked();

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });

    const actionLine = page.locator('#action-line');
    await expect(actionLine).toBeVisible({ timeout: 20000 });
    await expect(actionLine.locator('.action-line-title')).toBeVisible();
    await expect(actionLine.locator('[data-disable-action-line]')).toBeVisible();

    await actionLine.locator('[data-disable-action-line]').click();
    await expect(actionLine).toBeHidden();

    // Preferencia persistida y checkbox marcado al volver al setup.
    await page.click('#new-session');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await page.click('#setup-practice-street .setup-chip[data-val="flop"]');
    await expect(page.locator('#setup-hide-action-line')).toBeChecked();
  });
});
