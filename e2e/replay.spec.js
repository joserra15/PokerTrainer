const path = require('path');
const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Replay sesión importada', () => {
  test('Volver a jugar desde mano importada', async ({ page }) => {
    test.setTimeout(180000);
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="sessions"]');
    await page.waitForSelector('#session-file', { timeout: 10000 });
    const fixture = path.join(__dirname, '..', 'tools', 'fixtures', 'Winamax-sample.txt');
    await page.setInputFiles('#session-file', fixture);
    await page.click('#process-session');
    await expect(page.locator('#import-status')).toContainText(/procesad|analizad|manos/i, { timeout: 120000 });

    const replayBtn = page.locator('[data-replay], button:has-text("Volver a jugar")').first();
    await expect(replayBtn).toBeVisible({ timeout: 30000 });
    await replayBtn.click();

    // Replay interactivo vive en #replay-actions (pestaña Sesiones), no en #play-active
    await page.waitForSelector('#replay-actions .btn, #hand-review-content .actions .btn', { timeout: 30000 });
    const action = page.locator('#replay-actions .btn, #hand-review-content .actions .btn').first();
    await expect(action).toBeVisible();
    await action.click();

    await expect(page.locator('#replay-feedback .feedback').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#replay-feedback')).toContainText(/Óptima|Aceptable|Imprecisa|Error|decisión/i);
  });
});

