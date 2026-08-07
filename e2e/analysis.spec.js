const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Análisis manual → entrenador', () => {
  test('mano guardada se puede jugar en entrenador', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    const seeded = await page.evaluate(() => {
      if (!window.Store || !window.Store.saveAnalysisHand) {
        return { ok: false, error: 'Store.saveAnalysisHand missing' };
      }
      const hand = {
        id: 'e2e-ha-1',
        source: 'manual',
        createdAt: new Date().toISOString(),
        heroPos: 'CO',
        heroCode: 'AKo',
        heroCards: ['As', 'Kd'],
        boardAll: ['Ah', '7c', '2d'],
        accuracy: 100,
        handScore: 9,
        villains: [{ pos: 'BB', cards: ['Qs', 'Qd'] }],
        decisions: [{ street: 'preflop', action: 'raise', class: 'optima', label: 'Raise' }],
        format: '6max',
        bbEuro: 0.05,
        effStack: 100
      };
      try {
        window.Store.saveAnalysisHand(hand);
      } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
      }
      const list = window.Store.getAnalysisHands ? window.Store.getAnalysisHands() : [];
      return { ok: true, n: list.length };
    });
    expect(seeded.ok, seeded.error || 'seed failed').toBeTruthy();

    await page.click('button.tab[data-tab="analysis"]');
    await page.waitForSelector('#analysis-content', { timeout: 15000 });
    await page.evaluate(() => {
      if (window.PTHandAnalysis && window.PTHandAnalysis.render) {
        window.PTHandAnalysis.render(document.getElementById('analysis-content'));
      }
    });

    await expect(page.locator('#analysis-content')).toContainText(/AKo|CO|Análisis/i, { timeout: 15000 });

    const playBtn = page.locator('[data-ha-play]').first();
    if (await playBtn.isVisible().catch(() => false)) {
      await playBtn.click();
      const go = page.locator('[data-ha-play-go]').first();
      await expect(go).toBeVisible({ timeout: 10000 });
      await go.click();
    } else {
      const played = await page.evaluate(() => {
        const hand = (window.Store.getAnalysisHands && window.Store.getAnalysisHands() || [])
          .find((h) => h.id === 'e2e-ha-1');
        if (!hand || !window.PTHandAnalysis || !window.PTHandAnalysis.toTrainerConfig) {
          return { ok: false, error: 'no hand or toTrainerConfig' };
        }
        const cfg = window.PTHandAnalysis.toTrainerConfig(hand, 'pro', 'emerald');
        if (window.playAnalysisHand) {
          window.playAnalysisHand(cfg.force, cfg.playConfig);
          return { ok: true };
        }
        return { ok: false, error: 'playAnalysisHand missing' };
      });
      expect(played.ok, played.error || 'play failed').toBeTruthy();
    }

    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 30000 });
    await page.waitForSelector('#actions .btn', { timeout: 60000 });
    await expect(page.locator('#play-active')).toBeVisible();
    await expect(page.locator('#actions .btn').first()).toBeVisible();
  });
});
