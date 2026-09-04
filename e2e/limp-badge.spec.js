const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

/**
 * Limpear es igualar la ciega grande, no pasar. El asiento del limper aparecía
 * como "Check" aunque tuviera 1bb delante, que es contradictorio y engaña al
 * leer el spot.
 */

function limpState(page, force) {
  return page.evaluate((f) => {
    const Engine = window.PTEngine || window.Engine || window.GTOEngine;
    const hand = Engine.newHand(f);
    const seat = hand.villain.pos;
    const act = (hand.seatActions && hand.seatActions[seat]) || hand.villainAction;
    return {
      seat,
      type: act ? act.type : null,
      amount: act ? act.amount : null,
      streetBet: hand.table ? hand.table.streetBet[seat] : null,
      invested: hand.table ? hand.table.invested[seat] : null,
      potBB: hand.potBB,
      line: (hand.actionLine || []).map((e) => `${e.pos}:${e.type}`)
    };
  }, force);
}

test('el limper queda registrado como call y no como check', async ({ page }) => {
  await mockAuthenticatedUser(page);
  await waitForAppShell(page);

  const iso = await limpState(page, { type: 'isoLimp', heroPos: 'BTN', limperPos: 'HJ', seed: 5 });
  expect(iso.seat).toBe('HJ');
  expect(iso.type).toBe('call');
  expect(iso.amount).toBe(1);
  expect(iso.streetBet).toBe(1);
  expect(iso.invested).toBe(1);
  expect(iso.potBB).toBe(2.5);
  expect(iso.line).toEqual(['HJ:call']);

  const bb = await limpState(page, { type: 'bbVsSbLimp', heroPos: 'BB', seed: 5 });
  expect(bb.seat).toBe('SB');
  expect(bb.type).toBe('call');
  expect(bb.amount).toBe(1);
  // SB completa desde media ciega: acaba con 1bb invertido, no con 1.5.
  expect(bb.invested).toBe(1);
  expect(bb.streetBet).toBe(1);
  // Solo SB y BB ponen dinero: el bote es 2bb.
  expect(bb.potBB).toBe(2);
  expect(bb.line).toEqual(['SB:call']);
});

test('en un bote limpeado ningún rival aparece como Check', async ({ page }) => {
  await mockAuthenticatedUser(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForAppShell(page);
  await page.evaluate(() => {
    if (window.goToTab) window.goToTab('play');
    else document.querySelector('button.tab[data-tab="play"]')?.click();
  });
  await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
  await openPlaySetupAdvanced(page);
  await page.click('#setup-practice-street .setup-chip[data-val="preflop"]');
  await page.click('#setup-action-mode .setup-chip[data-val="quick"]');
  await page.click('#play-start');
  await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });

  let seen = 0;
  for (let i = 0; i < 60 && seen < 3; i++) {
    await page.locator('#play-active:not(.hidden) #actions button[data-action]')
      .first().waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(120);
    const spot = await page.evaluate(() => {
      const ctx = document.querySelector('#spot-context');
      const text = (ctx && ctx.textContent) || '';
      const badges = Array.from(document.querySelectorAll('#play-active #seats .seat-act'))
        .map((el) => el.textContent.trim());
      return { text, badges };
    });
    // Solo los spots en los que ha limpeado un rival; "limpear" a secas es la
    // opción del propio héroe y ahí todavía no ha actuado nadie.
    if (/\b(UTG|LJ|MP|HJ|CO|BTN|SB|BB)\s+limpea\b/.test(spot.text)) {
      seen++;
      expect(spot.badges.filter((b) => b === 'Check')).toEqual([]);
      expect(spot.badges.some((b) => /Iguala|Call/.test(b))).toBe(true);
    }
    await page.locator('#new-hand').click();
  }
  expect(seen).toBeGreaterThan(0);
});
