const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

/**
 * La mesa de Torneos debe recorrer la acción como el entrenador: tras el reparto
 * no hay ninguna acción visible y cada jugador aparece de uno en uno hasta el
 * héroe. Si el revelado se rompe, todas las acciones salen juntas en el primer
 * repintado y `counts` deja de empezar en 0 / crecer de una en una.
 */
test.describe('Torneos: revelado de la acción @smoke', () => {
  test('la acción se ve jugador a jugador hasta el héroe', async ({ page }) => {
    await mockAuthenticatedUser(page, { isAdmin: true, plan: 'coach' });
    await waitForAppShell(page);
    /* Partida en 0 Koins: seed para poder pagar buy-in del lobby. */
    await page.evaluate(() => {
      if (window.PTTournamentWallet && PTTournamentWallet.setBalance) {
        PTTournamentWallet.setBalance(200, { type: 'e2e_seed' });
      }
    });
    await goTab(page, 'tournaments');
    await page.waitForSelector('#tab-tournaments .trn-lobby-row', { timeout: 30000 });

    await page.evaluate(() => {
      window.__trn = { counts: [], acting: 0, revealPaints: 0 };
      const host = document.querySelector('#tab-tournaments');
      const obs = new MutationObserver(() => {
        const badges = document.querySelectorAll('.trn-play-like .seat-act').length;
        const c = window.__trn.counts;
        if (!c.length || c[c.length - 1] !== badges) c.push(badges);
        if (document.querySelector('.trn-play-like .seat.acting')) window.__trn.acting += 1;
        if (document.querySelector('[data-act="skip-anim"]') && !document.querySelector('[data-hero-act]')) {
          window.__trn.revealPaints += 1;
        }
      });
      obs.observe(host, { childList: true, subtree: true });
    });

    await page.click('#tab-tournaments .trn-lobby-row');

    // Mientras se revela hay botón Saltar y todavía no hay turno de héroe.
    await page.waitForSelector('[data-act="skip-anim"]', { timeout: 20000 });

    // El revelado acaba en el turno del héroe (o cerrando la mano).
    await page.waitForSelector('[data-hero-act], .trn-hand-end-modal, [data-act="next-hand"]', {
      timeout: 40000
    });
    await expect(page.locator('[data-act="skip-anim"]')).toHaveCount(0);

    const seen = await page.evaluate(() => window.__trn);

    expect(seen.revealPaints).toBeGreaterThan(0);
    expect(seen.counts.length).toBeGreaterThan(0);
    expect(seen.counts[0]).toBe(0);
    for (let i = 1; i < seen.counts.length; i++) {
      expect(seen.counts[i], 'acciones reveladas de una en una: ' + seen.counts.join(',')).toBe(
        seen.counts[i - 1] + 1
      );
    }
    if (seen.counts.length > 1) {
      expect(seen.acting, 'asiento resaltado al actuar').toBeGreaterThan(0);
    }
  });
});
