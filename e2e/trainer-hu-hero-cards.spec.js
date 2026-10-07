const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { goTab, mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

const ART = path.join('/opt/cursor/artifacts');

test.describe('Entrenador HU: héroe BTN no tapa cartas @mobile', () => {
  test('héroe BTN: asiento SB lleva .hero y no tapa #hero-cards', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await goTab(page, 'play');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    // Chip BTN residual (cash) + fase HU: el héroe sigue etiquetado BTN y el
    // anillo es SB/BB — el pod SB debe ocultarse como .hero, no tapar cartas.
    await page.click('#setup-format-hub [data-val="cash"]');
    await openPlaySetupAdvanced(page);
    await page.locator('#setup-hero-pos [data-val="BTN"]').scrollIntoViewIfNeeded();
    await page.click('#setup-hero-pos [data-val="BTN"]');

    await page.click('#setup-format-hub [data-val="mtt"]');
    await page.waitForSelector('#setup-mtt-phase [data-val="hu"]', { timeout: 10000 });
    await page.click('#setup-mtt-phase [data-val="hu"]');
    await openPlaySetupAdvanced(page);
    const rfi = page.locator('#setup-scenario [data-val="rfi"]');
    if (await rfi.count() && await rfi.isVisible()) await rfi.click();

    // Forzar chip BTN activo tras HU (simula residual): el anillo sigue SB/BB.
    await page.evaluate(() => {
      const box = document.getElementById('setup-hero-pos');
      if (!box) return;
      box.querySelectorAll('.setup-chip').forEach((c) => c.classList.remove('active'));
      let btn = box.querySelector('[data-val="BTN"]');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'setup-chip';
        btn.setAttribute('data-val', 'BTN');
        btn.textContent = 'BTN';
        box.appendChild(btn);
      }
      btn.classList.add('active');
    });

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await page.waitForSelector('#hero-cards .card, #hero-cards [class*="card"]', { timeout: 15000 });

    const heroLabel = (await page.locator('#hero-pos').innerText()).trim();
    expect(heroLabel).toBe('BTN');

    const heroCards = page.locator('#hero-cards');
    await expect(heroCards).toBeVisible();
    const box = await heroCards.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(40);
    expect(box.height).toBeGreaterThan(40);

    // Ningún pod inferior visible (sin .hero) con dorsos encima del héroe.
    const bottomSeats = page.locator('#seats .seat.seat-bottom');
    const bottomCount = await bottomSeats.count();
    for (let i = 0; i < bottomCount; i++) {
      const seat = bottomSeats.nth(i);
      const cls = (await seat.getAttribute('class')) || '';
      if (/\bhero\b/.test(cls)) continue;
      const visible = await seat.isVisible();
      if (!visible) continue;
      const backs = seat.locator('.card-back, .seat-cards .card-back');
      expect(await backs.count(), 'SB visible no debe mostrar dorsos sobre el héroe').toBe(0);
    }

    // Si el anillo tiene SB, debe estar marcado .hero cuando el label es BTN.
    if (heroLabel === 'BTN') {
      const sb = page.locator('#seats .seat', { has: page.locator('.seat-pos', { hasText: /^SB$/ }) });
      if (await sb.count()) {
        await expect(sb.first()).toHaveClass(/hero/);
      }
    }

    fs.mkdirSync(path.join(ART, 'screenshots'), { recursive: true });
    const shot = path.join(ART, 'screenshots', 'trainer-hu-btn-hero-cards-visible.png');
    await page.locator('#play-active .table-felt, #play-active').first().screenshot({ path: shot });
  });
});
