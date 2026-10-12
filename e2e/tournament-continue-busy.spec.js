const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');
const path = require('path');
const fs = require('fs');

/**
 * Continuar en el resumen de mano debe mostrar redecilla (busy) mientras procesa.
 */
test.describe('Torneos: Continuar busy spinner @smoke', () => {
  test('Continuar muestra trn-think-clock y aria-busy', async ({ page }) => {
    await mockAuthenticatedUser(page, { isAdmin: true, plan: 'coach' });
    await waitForAppShell(page);
    await page.evaluate(() => {
      if (window.PTTournamentWallet && PTTournamentWallet.setBalance) {
        PTTournamentWallet.setBalance(200, { type: 'e2e_seed' });
      }
    });
    await goTab(page, 'tournaments');
    await page.waitForSelector('#tab-tournaments .trn-lobby-row', { timeout: 30000 });
    await page.click('#tab-tournaments .trn-lobby-row');
    await page.waitForSelector('[data-act="confirm-structure-prompt"]', { timeout: 10000 });
    await page.click('[data-act="confirm-structure-prompt"]');
    const assist = page.locator('[data-act="confirm-assist-prompt"]');
    if (await assist.isVisible().catch(() => false)) await assist.click();

    /* Acelerar animaciones para llegar al fin de mano. */
    for (let i = 0; i < 40; i++) {
      const skip = page.locator('[data-act="skip-anim"]');
      if (await skip.isVisible().catch(() => false)) {
        await skip.click().catch(() => {});
      }
      const handEnd = page.locator('.trn-hand-end-modal [data-act="continue-hand"]');
      if (await handEnd.isVisible().catch(() => false)) break;
      const heroFold = page.locator('[data-hero-act="fold"]');
      if (await heroFold.isVisible().catch(() => false)) {
        await heroFold.click();
        continue;
      }
      const heroAny = page.locator('[data-hero-act]').first();
      if (await heroAny.isVisible().catch(() => false)) {
        await heroAny.click();
        continue;
      }
      await page.waitForTimeout(200);
    }

    const continueBtn = page.locator('.trn-hand-end-modal [data-act="continue-hand"]');
    await expect(continueBtn).toBeVisible({ timeout: 45000 });

    /* Retrasar el motor para poder observar el busy state. */
    await page.evaluate(() => {
      const R = window.PTTournamentRunner;
      if (!R || !R.continueAfterHand) return;
      const orig = R.continueAfterHand.bind(R);
      R.continueAfterHand = function (state) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(orig(state));
          }, 1200);
        });
      };
    });

    const outDir = '/opt/cursor/artifacts/screenshots';
    fs.mkdirSync(outDir, { recursive: true });

    await continueBtn.click();
    await expect(continueBtn).toHaveClass(/is-busy/, { timeout: 3000 });
    await expect(continueBtn.locator('.trn-think-clock')).toBeVisible();
    await expect(continueBtn).toHaveAttribute('aria-busy', 'true');

    await page.screenshot({
      path: path.join(outDir, 'trn-continuar-busy-spinner.png'),
      fullPage: false
    });

    await expect(continueBtn).toBeHidden({ timeout: 20000 });
  });
});
