const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Presets de entrenador @smoke', () => {
  test('guardar preset muestra chip, status y valida nombre vacío', async ({ page }) => {
    const logs = [];
    page.on('pageerror', (e) => logs.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') logs.push(msg.text());
    });
    // Si alguien reintroduce prompt, fallar en vez de colgar el test en móvil.
    page.on('dialog', async (dialog) => {
      logs.push('unexpected-dialog:' + dialog.type());
      await dialog.dismiss();
    });

    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await page.waitForSelector('#setup-preset-save', { timeout: 10000 });

    await expect(page.locator('#setup-user-presets .ranges-fav-empty')).toBeVisible({ timeout: 5000 });

    await page.click('#setup-preset-save');
    await expect(page.locator('.setup-preset-status[data-kind="error"]')).toContainText(/nombre/i);
    await expect(page.locator('#setup-preset-name')).toBeFocused();
    await expect(page.locator('#setup-preset-name')).toHaveClass(/is-invalid/);

    await page.fill('#setup-preset-name', 'Mi Spin');
    await page.click('#setup-preset-save');

    await expect(page.locator('#setup-user-presets [data-user-preset]')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('#setup-user-presets [data-user-preset]')).toHaveText('Mi Spin');
    await expect(page.locator('#setup-preset-name')).toHaveValue('');
    await expect(page.locator('.setup-preset-status[data-kind="ok"]')).toContainText(/guardado/i);

    const stored = await page.evaluate(() => {
      const uid = 'e2e-test-user';
      const raw = localStorage.getItem('pt_playPresets_v1_' + uid);
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored).toBeTruthy();
    expect(stored.length).toBe(1);
    expect(stored[0].name).toBe('Mi Spin');

    const bad = logs.filter((l) => l.startsWith('unexpected-dialog:prompt') || l.includes('pageerror'));
    expect(bad, 'sin prompt ni pageerror: ' + bad.join(' | ')).toEqual([]);
  });
});
