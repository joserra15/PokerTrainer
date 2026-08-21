const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

/**
 * Regresión visual/UX del RoadMap entrenador pro:
 * watermark, badge de formato, HUD de fase, presets y sizing.
 */
test.describe('Entrenador pro chrome @smoke', () => {
  test('watermark y HUD de fase en Spins', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    await page.click('#setup-format-hub [data-val="spin"]');
    await expect(page.locator('#setup-group-phase')).toBeVisible();
    await expect(page.locator('#setup-mtt-phase [data-val="auto"]')).toContainText(/Auto/);

    const openChip = page.locator('#setup-open-size [data-val="2.2"]');
    if (await openChip.isVisible().catch(() => false)) {
      await openChip.click();
    }

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });

    const felt = page.locator('#play-active .table-felt');
    await expect(felt).toHaveAttribute('data-format', 'spin');
    await expect(page.locator('#play-active .table-watermark-sub')).toContainText(/entrenamiento/i);
    await expect(page.locator('#table-format-badge')).toContainText(/SPIN/i);

    const hud = page.locator('#table-train-hud');
    await expect(hud).toBeVisible();
    const hudText = await hud.innerText();
    expect(hudText.length).toBeGreaterThan(0);
    expect(/bb|ICM|Early|Mid|Short|Push|Burbuja|Open|Payout/i.test(hudText)).toBeTruthy();
  });

  test('preset Reg MTT low aplica hub y sizing', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    await page.click('#setup-play-preset [data-val="mtt_low"]');
    await expect(page.locator('#setup-format-hub [data-val="mtt"]')).toHaveClass(/active/);
    await expect(page.locator('#setup-mtt-phase [data-val="mid"]')).toHaveClass(/active/);
    await expect(page.locator('#setup-open-size [data-val="2.2"]')).toHaveClass(/active/);

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await expect(page.locator('#play-active .table-felt')).toHaveAttribute('data-format', 'mtt');
    await expect(page.locator('#table-format-badge')).toContainText(/MTT/i);
    const hud = page.locator('#table-train-hud');
    await expect(hud.locator('.table-train-chip')).toHaveCount(4, { timeout: 5000 });
    await expect(hud).toContainText('25bb');
    await expect(hud).toContainText('Mid');
    await expect(hud).toContainText(/Open 2\.2/);
  });
});
