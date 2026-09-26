const path = require('path');
const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

/**
 * Mesa del paso a paso (revisión de una mano importada). Es la vista donde se
 * leen las cartas del rival y el board, así que aquí se fija lo que costó
 * conseguir: mesa casi a pantalla en móvil, cartas grandes y canal central
 * libre (los asientos van en columnas laterales, no sobre las comunitarias).
 */

/** Abre el paso a paso de la primera mano con cartas de rival descubiertas. */
async function openStepByStep(page) {
  await goTab(page, 'sessions');
  await page.waitForSelector('#session-file', { timeout: 15000 });
  await page.setInputFiles('#session-file', path.join(__dirname, '..', 'tools', 'fixtures', 'Winamax-sample.txt'));
  await page.click('#process-session');
  await page.waitForSelector('#session-hands .record, #hand-list .record', { timeout: 120000 });
  const ids = await page.evaluate(() => Array.prototype.map.call(
    document.querySelectorAll('[data-review]'), (b) => b.getAttribute('data-review')
  ));
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids.slice(0, 25)) {
    await page.evaluate((hid) => {
      const btn = document.querySelector('[data-review="' + hid + '"]');
      if (btn) btn.click();
    }, id);
    await page.waitForSelector('#hand-review-content .session-replay-table', { timeout: 30000 });
    const ready = await page.evaluate(() =>
      document.querySelectorAll('#hand-review-content .seat-cards.showdown .card').length >= 2
      && document.querySelectorAll('#hand-review-content .board .card').length >= 3);
    if (ready) return true;
  }
  return false;
}

function measure(page) {
  return page.evaluate(() => {
    const felt = document.querySelector('#hand-review-content .table-felt');
    const fr = felt.getBoundingClientRect();
    const rects = (sel) => Array.from(document.querySelectorAll('#hand-review-content ' + sel))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 1 && r.height > 1);
    const overlap = (a, b) => {
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return w > 0 && h > 0 ? Math.round(w * h) : 0;
    };
    const seats = rects('.seat:not(.hero)');
    const center = rects('.board .card').concat(rects('.pot'));
    let worstOverlap = 0;
    seats.forEach((s) => center.forEach((c) => { worstOverlap = Math.max(worstOverlap, overlap(s, c)); }));
    const outside = seats.filter((s) => s.left < fr.left - 2 || s.right > fr.right + 2).length;
    const cardW = (sel) => {
      const rs = rects(sel);
      return rs.length ? Math.min.apply(null, rs.map((r) => r.width)) : 0;
    };
    return {
      vh: window.innerHeight,
      feltH: fr.height,
      feltW: fr.width,
      worstOverlap: worstOverlap,
      seatsOutsideFelt: outside,
      villainCardW: cardW('.seat-cards.showdown .card'),
      boardCardW: cardW('.board .card')
    };
  });
}

test.describe('Mesa del paso a paso', () => {
  test('móvil: mesa casi a pantalla, cartas legibles y centro libre', async ({ page }) => {
    test.setTimeout(180000);
    await mockAuthenticatedUser(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForAppShell(page);
    expect(await openStepByStep(page)).toBe(true);

    const m = await measure(page);
    expect(m.feltH).toBeGreaterThan(m.vh * 0.6);
    expect(m.villainCardW).toBeGreaterThanOrEqual(30);
    expect(m.boardCardW).toBeGreaterThanOrEqual(34);
    expect(m.worstOverlap).toBeLessThan(120);
    expect(m.seatsOutsideFelt).toBe(0);
  });

  test('escritorio: mesa alta y asientos fuera del canal central', async ({ page }) => {
    test.setTimeout(180000);
    await mockAuthenticatedUser(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await waitForAppShell(page);
    expect(await openStepByStep(page)).toBe(true);

    const m = await measure(page);
    expect(m.feltH).toBeGreaterThan(480);
    expect(m.villainCardW).toBeGreaterThanOrEqual(34);
    expect(m.worstOverlap).toBeLessThan(120);
    expect(m.seatsOutsideFelt).toBe(0);
  });
});
