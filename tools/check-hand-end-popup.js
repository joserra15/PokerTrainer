/**
 * Comprueba que al terminar una mano del entrenador aparece el pop-up
 * con resultado, matchup y botones Ver detalles / Siguiente / Repetir / Nueva sesión.
 */
const { chromium } = require('@playwright/test');
const { mockAuthenticatedUser } = require('../e2e/helpers');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await mockAuthenticatedUser(page);
  await page.goto('http://127.0.0.1:4173/?v=' + Date.now());
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });

  await page.evaluate(() => { if (window.goToTab) window.goToTab('play'); });
  await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
  await page.click('#play-start');
  await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
  await page.waitForSelector('#actions .btn', { timeout: 60000 });

  // Jugar hasta completar la mano (máx. 12 decisiones)
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => {
      const modal = document.querySelector('#modal');
      return !!(modal && !modal.classList.contains('hidden') && document.querySelector('.hand-end-popup'));
    });
    if (done) break;
    const btn = page.locator('#actions .btn').first();
    if (!(await btn.count())) break;
    await btn.click();
    await page.waitForTimeout(350);
  }

  await page.waitForSelector('#modal:not(.hidden) .hand-end-popup', { timeout: 15000 });
  const info = await page.evaluate(() => {
    const popup = document.querySelector('.hand-end-popup');
    const title = popup.querySelector('.hand-end-popup-head h3');
    const ids = ['hand-end-details', 'hand-end-next', 'hand-end-replay', 'hand-end-new-session'];
    const buttons = ids.map((id) => {
      const el = document.getElementById(id);
      return el ? { id, text: el.textContent.trim() } : null;
    });
    const stats = [...popup.querySelectorAll('.hand-end-popup-stats .lbl')].map((el) => el.textContent.trim());
    const hasVillain = !!popup.querySelector('.hand-end-seat:nth-child(3) .hand-end-cards');
    const hasHero = !!popup.querySelector('.hand-end-seat:nth-child(1) .hand-end-cards .card, .hand-end-seat:nth-child(1) .muted-text');
    const optimalBanner = popup.querySelector('.hand-score-optimal');
    return {
      title: title ? title.textContent.trim() : '',
      headClass: popup.querySelector('.hand-end-popup-head').className,
      buttons,
      stats,
      hasVillain,
      hasHero,
      hasOptimalBanner: !!(optimalBanner && /decisiones han sido óptimas/i.test(optimalBanner.textContent || '')),
      feedbackVisible: !document.querySelector('#feedback').classList.contains('hidden')
    };
  });

  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/hand-end-popup.png', fullPage: false });

  // Ver detalles cierra el popup y deja el feedback
  await page.click('#hand-end-details');
  await page.waitForFunction(() => document.querySelector('#modal').classList.contains('hidden'));
  const afterDetails = await page.evaluate(() => ({
    modalHidden: document.querySelector('#modal').classList.contains('hidden'),
    feedbackVisible: !document.querySelector('#feedback').classList.contains('hidden'),
    hasCoach: !!document.querySelector('#ai-report-trainer')
  }));

  console.log(JSON.stringify({ info, afterDetails }, null, 2));

  const fails = [];
  if (!/ganas|pierdes|empate|terminada/i.test(info.title)) fails.push('missing win/lose title: ' + info.title);
  if (!info.buttons.every(Boolean)) fails.push('missing action buttons');
  if (!info.stats.some((s) => /resultado real/i.test(s))) fails.push('missing real result');
  if (!info.stats.some((s) => /EV perdido/i.test(s))) fails.push('missing EV lost');
  if (!info.stats.some((s) => /Puntuaci[oó]n de la mano/i.test(s))) fails.push('missing hand score');
  if (!info.hasOptimalBanner) fails.push('missing optimal/non-optimal banner');
  if (!info.hasHero || !info.hasVillain) fails.push('missing hero/villain cards block');
  if (!afterDetails.modalHidden) fails.push('modal should close on Ver detalles');
  if (!afterDetails.feedbackVisible) fails.push('feedback should remain visible after Ver detalles');

  if (fails.length) {
    console.error('FAIL:\n - ' + fails.join('\n - '));
    process.exitCode = 1;
  } else {
    console.log('OK: hand-end popup checks passed');
  }
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
