const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

const ART = process.env.CURSOR_ARTIFACTS_DIR
  || '/opt/cursor/artifacts';

test.describe('Torneos: HUD en vivo en detalle de jugador', () => {
  test('villano y héroe muestran Jugado/Subido/Resubido/Manos', async ({ page }) => {
    fs.mkdirSync(path.join(ART, 'screenshots'), { recursive: true });
    await mockAuthenticatedUser(page, { isAdmin: true, plan: 'coach' });
    await waitForAppShell(page);
    await page.evaluate(() => {
      if (window.PTTournamentWallet && PTTournamentWallet.setBalance) {
        PTTournamentWallet.setBalance(500, { type: 'e2e_seed' });
      }
    });
    await goTab(page, 'tournaments');
    await page.waitForSelector('#tab-tournaments .trn-lobby-row', { timeout: 30000 });

    await page.click('#tab-tournaments .trn-lobby-row');
    await page.waitForSelector('[data-act="confirm-structure-prompt"]', { timeout: 10000 });
    await page.click('[data-act="confirm-structure-prompt"]');
    const assist = page.locator('[data-act="confirm-assist-prompt"]');
    if (await assist.isVisible().catch(() => false)) await assist.click();

    await page.waitForSelector('.trn-play-like .seat.villain[data-player]', { timeout: 40000 });

    /* Sembrar HUD para los villanos visibles en mesa (+ héroe). */
    const tableVillainId = await page.locator('.trn-play-like .seat.villain[data-player]').first()
      .getAttribute('data-player');
    expect(tableVillainId).toBeTruthy();

    await page.evaluate((focusId) => {
      const ui = window.PTTournamentsUI;
      const Hud = window.PTTournamentPlayerHud;
      const st = ui && ui.getState && ui.getState();
      if (!st || !Hud) throw new Error('missing state or PlayerHud');
      const seatIds = Array.prototype.map.call(
        document.querySelectorAll('.trn-play-like .seat.villain[data-player]'),
        function (el) { return el.getAttribute('data-player'); }
      ).filter(Boolean);
      if (focusId && seatIds.indexOf(focusId) < 0) seatIds.unshift(focusId);
      seatIds.forEach(function (pid, idx) {
        for (var n = 0; n < 10; n++) {
          var plays = n < (4 + (idx % 3));
          var threeBet = plays && n === 2;
          var log;
          if (threeBet) {
            log = [
              { street: 'preflop', id: 'hero', action: 'raise' },
              { street: 'preflop', id: pid, action: 'raise' },
              { street: 'preflop', id: 'hero', action: 'fold' }
            ];
          } else if (plays) {
            log = [
              { street: 'preflop', id: pid, action: 'raise' },
              { street: 'preflop', id: 'hero', action: 'fold' }
            ];
          } else {
            log = [{ street: 'preflop', id: pid, action: 'fold' }];
          }
          Hud.onHandComplete(st, {
            sb: 25, bb: 50, ante: 0,
            seats: [
              { id: pid, pos: 'CO', invested: plays || threeBet ? 150 : 0 },
              { id: 'hero', isHero: true, pos: 'BB', invested: threeBet ? 100 : 50 }
            ],
            log: log
          });
        }
      });
      for (var h = 0; h < 12; h++) {
        var heroPlay = h % 3 !== 0;
        Hud.onHandComplete(st, {
          sb: 25, bb: 50, ante: 0,
          seats: [
            { id: 'hero', isHero: true, pos: 'BTN', invested: heroPlay ? 125 : 25 },
            { id: focusId, pos: 'BB', invested: 50 }
          ],
          log: heroPlay
            ? [
              { street: 'preflop', id: 'hero', action: 'raise' },
              { street: 'preflop', id: focusId, action: 'fold' }
            ]
            : [{ street: 'preflop', id: 'hero', action: 'fold' }]
        });
      }
      if (window.PTTournamentStore && PTTournamentStore.saveActive) {
        PTTournamentStore.saveActive(st, { silent: true });
      }
      const snap = Hud.snapshot(st, focusId);
      if (!snap || !snap.hands) throw new Error('seed failed for ' + focusId);
    }, tableVillainId);

    const villain = page.locator('.trn-play-like .seat.villain[data-player="' + tableVillainId + '"]');
    await expect(villain).toBeVisible({ timeout: 15000 });
    await villain.click();

    await expect(page.locator('.trn-live-hud-strip').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.trn-live-hud-lab', { hasText: 'Jugado' }).first()).toBeVisible();
    await expect(page.locator('.trn-live-hud-lab', { hasText: 'Subido' }).first()).toBeVisible();
    await expect(page.locator('.trn-live-hud-lab', { hasText: 'Resubido' }).first()).toBeVisible();
    await expect(page.locator('.trn-live-hud-lab', { hasText: 'Manos' }).first()).toBeVisible();
    /* Manos > 0 en el strip del villano */
    const manosVal = page.locator('.trn-live-hud-manos .trn-live-hud-val').first();
    await expect(manosVal).not.toHaveText('0');

    const villPath = path.join(ART, 'screenshots', 'tournament-live-hud-villain.png');
    await page.locator('.trn-modal-player-detail').first().screenshot({ path: villPath });

    await page.locator('.trn-modal-player-detail [data-act="close-role"]').last().click({ force: true });
    await page.waitForSelector('.trn-modal-player-detail', { state: 'detached', timeout: 8000 });

    const hero = page.locator('[data-act="open-hero-detail"]').first();
    await expect(hero).toBeVisible({ timeout: 10000 });
    await hero.click({ force: true });
    await expect(page.locator('.trn-modal-player-detail .trn-live-hud-strip')).toBeVisible({
      timeout: 10000
    });
    await expect(page.locator('.trn-live-hud-lab', { hasText: 'Jugado' }).first()).toBeVisible();

    const heroPath = path.join(ART, 'screenshots', 'tournament-live-hud-hero.png');
    await page.locator('.trn-modal-player-detail').first().screenshot({ path: heroPath });

    const feltStrips = await page.locator('.trn-play-like > .trn-live-hud-strip').count();
    expect(feltStrips).toBe(0);
  });
});
