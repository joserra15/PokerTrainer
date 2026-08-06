/**
 * Verifica layout móvil del entrenador (iPhone SE):
 * - botones de acción cerca del borde inferior del viewport
 * - mesa más ancha que alta (óvalo)
 * - sidebar (sesión / consultas) bajo el fold
 */
const { chromium, devices } = require('@playwright/test');
const { mockAuthenticatedUser } = require('../e2e/helpers');

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone SE'];
  const context = await browser.newContext({
    ...iPhone,
    // Playwright device may not force portrait; ensure it.
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await mockAuthenticatedUser(page);
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });

  // En móvil las pestañas viven en el drawer; ir por API o abriendo el menú.
  await page.evaluate(() => {
    if (typeof window.goToTab === 'function') window.goToTab('play');
  });
  const setupVisible = await page.locator('#play-setup:not(.hidden)').isVisible().catch(() => false);
  if (!setupVisible) {
    await page.click('#nav-toggle');
    await page.click('button.tab[data-tab="play"]');
  }
  await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
  await page.click('#play-start');
  await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
  await page.waitForSelector('#actions .btn', { timeout: 60000 });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const vh = window.innerHeight;
    const stage = document.querySelector('#play-active .play-stage');
    const felt = document.querySelector('#play-active .table-felt');
    const actions = document.querySelector('#play-active .actions');
    const sidebar = document.querySelector('#play-active .sidebar');
    const usage = document.querySelector('#play-usage');
    const sessionCard = document.querySelector('#play-active .sidebar .card-box');
    const stageH = getComputedStyle(document.documentElement).getPropertyValue('--play-stage-h').trim();
    const actionsH = getComputedStyle(document.documentElement).getPropertyValue('--play-actions-h').trim();
    const sr = stage.getBoundingClientRect();
    const fr = felt.getBoundingClientRect();
    const ar = actions.getBoundingClientRect();
    const sbr = sidebar.getBoundingClientRect();
    const ur = usage ? usage.getBoundingClientRect() : null;
    const scr = sessionCard ? sessionCard.getBoundingClientRect() : null;
    return {
      vh,
      stageHVar: stageH,
      actionsHVar: actionsH,
      stage: { top: sr.top, bottom: sr.bottom, height: sr.height },
      felt: { width: fr.width, height: fr.height, ratio: fr.width / fr.height, borderRadius: getComputedStyle(felt).borderRadius },
      actions: { top: ar.top, bottom: ar.bottom, height: ar.height },
      sidebarTop: sbr.top,
      usageTop: ur ? ur.top : null,
      sessionTop: scr ? scr.top : null,
      gapActionsToViewportBottom: vh - ar.bottom,
      sidebarBelowFold: sbr.top >= vh - 8
    };
  });

  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/mobile-play-se-above-fold.png', fullPage: false });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/mobile-play-se-scrolled.png', fullPage: false });

  console.log(JSON.stringify(metrics, null, 2));

  const fails = [];
  if (!(metrics.felt.ratio > 1.15)) fails.push('felt should be a clear horizontal oval (ratio ' + metrics.felt.ratio + ')');
  if (!(metrics.gapActionsToViewportBottom >= 0 && metrics.gapActionsToViewportBottom <= 24)) {
    fails.push('actions should sit near viewport bottom (gap ' + metrics.gapActionsToViewportBottom + ')');
  }
  if (!metrics.sidebarBelowFold) fails.push('sidebar should be below the fold (top=' + metrics.sidebarTop + ', vh=' + metrics.vh + ')');
  if (!(metrics.stage.height + 1 >= metrics.vh * 0.8)) fails.push('play-stage should fill most of the viewport');

  if (fails.length) {
    console.error('FAIL:\n - ' + fails.join('\n - '));
    process.exitCode = 1;
  } else {
    console.log('OK: mobile play layout checks passed');
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
