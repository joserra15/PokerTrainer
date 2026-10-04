const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');
const path = require('path');
const fs = require('fs');

const ART = '/opt/cursor/artifacts/screenshots';

test.describe('Torneos: estructura y velocidad de mesa', () => {
  test.beforeAll(() => {
    fs.mkdirSync(ART, { recursive: true });
  });

  test('lobby estructura + info velocidad + settings default', async ({ page }) => {
    await mockAuthenticatedUser(page, { isAdmin: true, plan: 'coach' });
    await waitForAppShell(page);
    await page.evaluate(() => {
      if (window.PTTournamentWallet && PTTournamentWallet.setBalance) {
        PTTournamentWallet.setBalance(500, { type: 'e2e_seed' });
      }
      if (window.PTTournamentTableSpeed && PTTournamentTableSpeed.save) {
        PTTournamentTableSpeed.save('fast');
      }
    });

    await goTab(page, 'tournaments');
    await page.waitForSelector('#tab-tournaments .trn-lobby-structure', { timeout: 30000 });
    await expect(page.locator('[data-lobby-structure="hyper"]')).toBeVisible();
    await expect(page.locator('[data-lobby-structure="turbo"]')).toBeVisible();
    await expect(page.locator('[data-lobby-structure="normal"]')).toBeVisible();

    await expect(page.locator('[data-lobby-structure="normal"]')).toHaveClass(/is-on/);
    await page.screenshot({
      path: path.join(ART, 'e2e-lobby-structure.png'),
      fullPage: false
    });

    await page.click('#tab-tournaments .trn-lobby-row[data-preset="spinEasy"], #tab-tournaments .trn-lobby-row');
    /* Pregunta de estructura antes de empezar. */
    await page.waitForSelector('[data-act="confirm-structure-prompt"]', { timeout: 10000 });
    await expect(page.locator('[data-act="structure-prompt-pick"][data-structure="normal"]')).toHaveClass(/is-selected/);
    await page.click('[data-act="confirm-structure-prompt"]');
    /* spinEasy puede pedir assist o ir directo; cerrar prompts si aparecen. */
    const assistConfirm = page.locator('[data-act="confirm-assist-prompt"]');
    if (await assistConfirm.isVisible().catch(() => false)) {
      await assistConfirm.click();
    }
    await page.waitForSelector('#tab-tournaments [data-act="info"], #tab-tournaments .trn-play-like', {
      timeout: 40000
    });
    const skip = page.locator('[data-act="skip-anim"]');
    if (await skip.count()) {
      await skip.click().catch(() => {});
    }
    await page.click('#tab-tournaments [data-act="info"]');
    await page.waitForSelector('.trn-info-modal', { timeout: 10000 });
    await expect(page.locator('.trn-info-modal')).toContainText(/Estructura/i);
    await expect(page.locator('.trn-info-modal')).toContainText(/Normal|Turbo|Hyper/i);
    await expect(page.locator('[data-act="info-table-speed"][data-speed="veryFast"]')).toBeVisible();
    await expect(page.locator('[data-act="info-table-speed"][data-speed="fast"]')).toBeVisible();
    await expect(page.locator('[data-act="info-table-speed"][data-speed="normal"]')).toBeVisible();
    /* Preferencia guardada = fast al crear. */
    await expect(page.locator('[data-act="info-table-speed"][data-speed="fast"]')).toHaveClass(/is-selected/);
    await page.click('[data-act="info-table-speed"][data-speed="normal"]');
    await expect(page.locator('[data-act="info-table-speed"][data-speed="normal"]')).toHaveClass(/is-selected/);
    await page.locator('.trn-table-speed-info').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ART, 'e2e-tournament-info-speed.png'),
      fullPage: false
    });

    await page.locator('.trn-info-modal button.btn-primary[data-act="close-info"]').click();
    await expect(page.locator('.trn-modal-backdrop')).toHaveCount(0, { timeout: 5000 });

    /* Salir del torneo y abrir Configuración con render local (sin RPC). */
    await page.click('#tab-tournaments [data-act="hub"]');
    const exitSave = page.locator('[data-act="exit-save"]');
    if (await exitSave.isVisible().catch(() => false)) await exitSave.click();
    await page.waitForSelector('#tab-tournaments .trn-lobby, #tab-tournaments .trn-hub', {
      timeout: 15000
    });

    await page.evaluate(() => {
      window.PTTournamentTableSpeed.save('normal');
      /* Forzar render sin cliente Supabase (E2E no tiene sesión real). */
      if (window.PTSupabase) {
        window.PTSupabase.getClient = function () { return null; };
      }
    });
    await goTab(page, 'account');
    await page.waitForSelector('#settings-table-speed', { timeout: 20000 });
    await expect(page.locator('#settings-table-speed')).toBeVisible();
    await expect(page.locator('#settings-table-speed .setup-chip[data-val="normal"]')).toHaveClass(/active/);
    await page.locator('#settings-table-speed .setup-chip[data-val="veryFast"]').click();
    expect(await page.evaluate(() => window.PTTournamentTableSpeed.load())).toBe('veryFast');
    await page.locator('#settings-table-speed').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ART, 'e2e-settings-table-speed.png'),
      fullPage: false
    });
  });
});
