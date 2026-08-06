/**
 * Comprueba HUD de sesión encima de la mesa y que acciones queden
 * en el borde inferior del viewport (iPhone SE) sin que la sesión tapón.
 */
const { chromium } = require('@playwright/test');
const { mockAuthenticatedUser } = require('../e2e/helpers');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await mockAuthenticatedUser(page);
  await page.goto('http://127.0.0.1:4173/?v=' + Date.now());
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
  await page.evaluate(() => { if (window.goToTab) window.goToTab('play'); });
  await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
  await page.click('#play-start');
  await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
  await page.waitForSelector('#actions .btn', { timeout: 60000 });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const vh = window.innerHeight;
    const hud = document.querySelector('#play-hud');
    const felt = document.querySelector('#play-active .table-felt');
    const actions = document.querySelector('#play-active .actions');
    const sidebar = document.querySelector('#play-active .sidebar');
    const hr = hud.getBoundingClientRect();
    const fr = felt.getBoundingClientRect();
    const ar = actions.getBoundingClientRect();
    const sbr = sidebar.getBoundingClientRect();
    return {
      vh,
      hud: {
        top: hr.top,
        bottom: hr.bottom,
        height: hr.height,
        hands: document.querySelector('#hud-hands').textContent,
        net: document.querySelector('#hud-net').textContent,
        ev: document.querySelector('#hud-ev-lost').textContent
      },
      felt: { top: fr.top, bottom: fr.bottom, height: fr.height, width: fr.width },
      actions: { top: ar.top, bottom: ar.bottom, height: ar.height },
      sidebarTop: sbr.top,
      gapActionsToViewportBottom: vh - ar.bottom,
      hudAboveFelt: hr.bottom <= fr.top + 2,
      sidebarBelowFold: sbr.top >= vh - 8,
      vars: {
        stage: getComputedStyle(document.documentElement).getPropertyValue('--play-stage-h').trim(),
        hud: getComputedStyle(document.documentElement).getPropertyValue('--play-hud-h').trim(),
        actions: getComputedStyle(document.documentElement).getPropertyValue('--play-actions-h').trim()
      }
    };
  });

  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/play-hud-se.png', fullPage: false });
  console.log(JSON.stringify(metrics, null, 2));

  const fails = [];
  if (!metrics.hudAboveFelt) fails.push('HUD should sit above the table');
  if (!(metrics.gapActionsToViewportBottom >= 0 && metrics.gapActionsToViewportBottom <= 24)) {
    fails.push('actions should sit near viewport bottom (gap ' + metrics.gapActionsToViewportBottom + ')');
  }
  if (!metrics.sidebarBelowFold) fails.push('sidebar should stay below the fold');
  if (!(metrics.felt.height >= 200 && metrics.felt.height <= 500)) {
    fails.push('felt height out of expected mobile range (h=' + metrics.felt.height + ')');
  }
  if (!(metrics.felt.top - metrics.hud.bottom < 24)) {
    fails.push('felt should sit close under the HUD');
  }
  if (metrics.hud.hands == null) fails.push('missing hud hands');

  if (fails.length) {
    console.error('FAIL:\n - ' + fails.join('\n - '));
    process.exitCode = 1;
  } else {
    console.log('OK: play HUD layout checks passed');
  }
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
