const { test, expect } = require('@playwright/test');
const {
  mockAuthenticatedUser,
  waitForAppShell,
  clickFirstPlayAction,
  playActionButtons,
  playSkipButton,
  skipActionPlaybackIfNeeded,
  expectAnyVisible
} = require('./helpers');

test.describe('Entrenamiento completo @smoke', () => {
  test('setup → decisión → score → histórico', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);

    await page.click('button.tab[data-tab="play"]');
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
    await page.click('#play-start');

    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
    await clickFirstPlayAction(page);

    const toast = page.locator('#verdict-toast.visible');
    const handEnd = page.locator('#modal:not(.hidden) .hand-end-popup');
    const nextSkip = playSkipButton(page);
    const nextBtn = playActionButtons(page);
    await expectAnyVisible(toast.or(handEnd).or(nextSkip).or(nextBtn), { timeout: 20000 });

    // Completar mano si sigue abierta (varias calles / playback).
    // Tras el feedback el toast se espera y luego anima la mesa: hay que
    // saltar el playback (o esperar) antes del siguiente click, si no el
    // botón se detacha / no es estable.
    for (let i = 0; i < 16; i++) {
      if (await handEnd.isVisible().catch(() => false)) break;
      const endVisible = await page.locator('#modal:not(.hidden) .hand-end-popup').isVisible().catch(() => false);
      if (endVisible) break;
      await page.locator('#verdict-toast.visible').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      await skipActionPlaybackIfNeeded(page);
      if (await handEnd.isVisible().catch(() => false)) break;
      const btns = playActionButtons(page);
      if (await btns.count() === 0) break;
      try {
        await btns.first().click({ timeout: 5000 });
      } catch (_) {
        await skipActionPlaybackIfNeeded(page);
        if (await playActionButtons(page).count()) {
          await playActionButtons(page).first().click({ force: true, timeout: 5000 }).catch(() => {});
        }
      }
    }

    const popup = page.locator('#modal:not(.hidden) .hand-end-popup');
    if (await popup.isVisible().catch(() => false)) {
      await expect(popup.locator('.hand-end-popup-stats .lbl, .hand-score-optimal').first()).toBeVisible({ timeout: 10000 });
      const close = page.locator('#modal [data-close], #modal .modal-close, #hand-end-close, #modal .btn').first();
      if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
    }

    await page.click('button.tab[data-tab="history"]');
    await page.waitForSelector('#history-list', { timeout: 15000 });
    const items = page.locator('#history-list .record-item, #history-list [data-replay-id], #history-list button, #history-list .history-card');
    // Al menos un nodo de contenido o texto de mano
    await expect(page.locator('#history-list')).not.toBeEmpty({ timeout: 15000 });
    const text = await page.locator('#history-list').innerText();
    expect(text.trim().length).toBeGreaterThan(5);
  });
});
