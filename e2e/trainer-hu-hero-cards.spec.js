const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { goTab, mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

const ART = path.join('/opt/cursor/artifacts');

test.describe('Entrenador HU: cartas héroe visibles @mobile', () => {
  test('BTN residual + fase HU no tapa #hero-cards con pod SB', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await goTab(page, 'play');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });

    // Empezar en cash con BTN activo (chip residual que provocaba el bug).
    await page.click('#setup-format-hub [data-val="cash"]');
    await openPlaySetupAdvanced(page);
    await page.locator('#setup-hero-pos [data-val="BTN"]').scrollIntoViewIfNeeded();
    await page.click('#setup-hero-pos [data-val="BTN"]');

    // Pasar a MTT Heads Up: el chip BTN no debe dejar hero fuera del anillo SB/BB.
    await page.click('#setup-format-hub [data-val="mtt"]');
    await page.waitForSelector('#setup-mtt-phase [data-val="hu"]', { timeout: 10000 });
    await page.click('#setup-mtt-phase [data-val="hu"]');
    await openPlaySetupAdvanced(page);
    const rfi = page.locator('#setup-scenario [data-val="rfi"]');
    if (await rfi.count() && await rfi.isVisible()) await rfi.click();

    await page.click('#play-start');
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await page.waitForSelector('#hero-cards .card, #hero-cards [class*="card"]', { timeout: 15000 });

    const heroCards = page.locator('#hero-cards');
    await expect(heroCards).toBeVisible();

    // El asiento SB no debe renderizarse como villano encima del héroe.
    const seats = page.locator('#seats .seat');
    const seatCount = await seats.count();
    expect(seatCount).toBeLessThanOrEqual(2);

    const bottomSeats = page.locator('#seats .seat.seat-bottom');
    const bottomCount = await bottomSeats.count();
    for (let i = 0; i < bottomCount; i++) {
      const seat = bottomSeats.nth(i);
      const cls = await seat.getAttribute('class');
      // Si hay pod abajo, debe estar marcado .hero (display:none en CSS) o no tener backs.
      if (cls && !/\bhero\b/.test(cls)) {
        const backs = seat.locator('.card-back, .seat-cards .card-back');
        const backCount = await backs.count();
        expect(backCount, 'pod inferior no-hero no debe mostrar dorso encima del héroe').toBe(0);
      }
    }

    // Cartas face-up del héroe deben tener tamaño real (no cubiertas a 0).
    const box = await heroCards.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(40);
    expect(box.height).toBeGreaterThan(40);

    const heroPos = (await page.locator('#hero-pos').innerText()).trim();
    expect(['SB', 'BB']).toContain(heroPos);

    fs.mkdirSync(path.join(ART, 'screenshots'), { recursive: true });
    const shot = path.join(ART, 'screenshots', 'trainer-hu-hero-cards-visible.png');
    await page.locator('#play-active .table-felt, #play-active').first().screenshot({ path: shot });
  });
});
