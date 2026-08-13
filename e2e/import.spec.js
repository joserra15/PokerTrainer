const path = require('path');
const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

const FIXTURES = [
  { name: 'Winamax', file: 'Winamax-sample.txt' },
  { name: 'PokerStars ES', file: 'Poker56.txt' },
  { name: 'PokerStars EN', file: 'PokerEN-sample.txt' },
  { name: 'GGPoker', file: 'GGPoker-sample.txt' },
  { name: 'CoinPoker', file: 'CoinPoker-sample.txt' }
];

test.describe('Import multi-sala @smoke', () => {
  for (const fx of FIXTURES) {
    test('procesa ' + fx.name, async ({ page }) => {
      test.setTimeout(180000);
      await mockAuthenticatedUser(page);
      await waitForAppShell(page);

      await page.click('button.tab[data-tab="sessions"]');
      await page.waitForSelector('#session-file', { timeout: 10000 });

      const fixture = path.join(__dirname, '..', 'tools', 'fixtures', fx.file);
      await page.setInputFiles('#session-file', fixture);
      await expect(page.locator('#process-session')).toBeEnabled();
      await page.click('#process-session');

      await expect(page.locator('#import-status')).toContainText(/procesad|analizad|manos|sesión|session/i, {
        timeout: 120000
      });

      // Alguna mano listada / UI de sesión
      const body = await page.locator('#tab-sessions, #sessions-list, #session-detail, .session-card, .session-hands').first().innerText().catch(() => '');
      const status = await page.locator('#import-status').innerText();
      expect((status + ' ' + body).length).toBeGreaterThan(10);
    });
  }
});
