const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

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
    await openPlaySetupAdvanced(page);
    if (await openChip.isVisible().catch(() => false)) {
      await openChip.click();
    }

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });

    const felt = page.locator('#play-active .table-felt');
    await expect(felt).toHaveAttribute('data-format', 'spin');
    await expect(page.locator('#play-active .table-watermark-sub')).toContainText(/entrenamiento/i);
    await expect(page.locator('#table-train-chrome')).toBeVisible();
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

    await openPlaySetupAdvanced(page);
    await page.click('#setup-play-preset [data-val="mtt_low"]');
    await expect(page.locator('#setup-format-hub [data-val="mtt"]')).toHaveClass(/active/);
    await expect(page.locator('#setup-mtt-phase [data-val="mid"]')).toHaveClass(/active/);
    await expect(page.locator('#setup-open-size [data-val="2.2"]')).toHaveClass(/active/);

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await expect(page.locator('#play-active .table-felt')).toHaveAttribute('data-format', 'mtt');
    await expect(page.locator('#table-train-chrome')).toBeVisible();
    await expect(page.locator('#table-format-badge')).toContainText(/MTT/i);
    const hud = page.locator('#table-train-hud');
    // Chrome compacto: 2 chips prioritarios + enlace Info (detalle en modal)
    await expect(hud.locator('.table-train-chip')).toHaveCount(2, { timeout: 5000 });
    await expect(hud.locator('.table-train-info')).toHaveCount(1);
    await expect(hud).toContainText('25bb');
    await expect(hud).toContainText('Mid');
    await expect(hud).not.toContainText(/BI €/);
    await expect(hud).not.toContainText(/left \//);
    await hud.locator('.table-train-info').click();
    const modal = page.locator('#session-config-modal');
    await expect(modal).not.toHaveClass(/hidden/);
    await expect(modal).toContainText(/Torneos|MTT|Fase|Stack/i);
    await page.locator('#session-config-close').click();
    await expect(modal).toHaveClass(/hidden/);
  });
});
