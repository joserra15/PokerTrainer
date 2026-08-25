const { test, expect } = require('@playwright/test');
const {
  mockAuthenticatedUser,
  waitForAppShell
} = require('./helpers');

test.describe('Ocultar línea de acción previa @smoke', () => {
  test('opción disponible en cualquier calle y formato; × oculta en mesa', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    const wrap = page.locator('#setup-hide-action-line-wrap');
    const checkbox = page.locator('#setup-hide-action-line');

    // Con «Todas las calles» la línea sale igual al llegar al flop, así que la
    // opción tiene que estar disponible desde el principio.
    await expect(wrap).not.toHaveClass(/is-disabled/);
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).not.toBeChecked();

    // Spins y torneos se entrenan desde preflop: misma opción disponible.
    await page.click('#setup-format-hub [data-val="spin"]');
    await page.click('#setup-practice-street .setup-chip[data-val="preflop"]');
    await expect(checkbox).toBeEnabled();
    await page.click('#setup-format-hub [data-val="mtt"]');
    await expect(checkbox).toBeEnabled();

    // El × de la mesa se comprueba en un spot que ya arranca con línea previa.
    await page.click('#setup-format-hub [data-val="cash"]');
    await page.click('#setup-practice-street .setup-chip[data-val="river"]');
    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });

    const actionLine = page.locator('#action-line');
    await expect(actionLine).toBeVisible({ timeout: 20000 });
    await expect(actionLine.locator('.action-line-title')).toBeVisible();
    await expect(actionLine.locator('[data-disable-action-line]')).toBeVisible();

    await actionLine.locator('[data-disable-action-line]').click();
    await expect(actionLine).toBeHidden();

    // La preferencia se conserva aunque la siguiente sesión sea de preflop.
    await page.click('#new-session');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await expect(checkbox).toBeChecked();
    await page.click('#setup-practice-street .setup-chip[data-val="preflop"]');
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).toBeChecked();
  });
});
