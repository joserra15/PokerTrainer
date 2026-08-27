/* Captura b-roll / screenshots Instagram para PokerForgeAI.
 * Uso: node tools/instagram-broll.js  (requiere http-server en :4173)
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const OUT = path.join(__dirname, '..', 'marketing', 'instagram', '04-broll');

async function bootstrap(page) {
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'ig-broll', email: 'ig@test.local', name: 'IG', authProvider: 'e2e'
    }));
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
      necessary: true, analytics: false, ts: Date.now()
    }));
  });
}

async function goTab(page, tab, extra) {
  await page.evaluate(({ tab, extra }) => {
    window.dispatchEvent(new CustomEvent('pt-go-tab', { detail: Object.assign({ tab }, extra || {}) }));
  }, { tab, extra });
}

async function shot(page, name, selector) {
  const file = path.join(OUT, name + '.png');
  if (selector) {
    const loc = page.locator(selector).first();
    await loc.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    await loc.screenshot({ path: file }).catch(async () => {
      await page.screenshot({ path: file, fullPage: false });
    });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  console.log('OK', name);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } }
  });
  const page = await ctx.newPage();
  await bootstrap(page);

  try {
    // 1) Landing / guest challenge
    await page.goto(BASE + '/');
    await page.waitForTimeout(1500);
    await shot(page, '01-landing-hero', '#landing-hero');

    // Try guest / play path
    const tryBtn = page.locator('[data-landing-try]').first();
    if (await tryBtn.count()) {
      await tryBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Ensure app shell
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 }).catch(() => {});
    await goTab(page, 'play', { setup: true });
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 }).catch(() => {});
    await shot(page, '02-play-setup', '#play-setup');

    // Start hand
    const start = page.locator('#play-start');
    if (await start.count()) {
      await start.click().catch(() => {});
      await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 }).catch(() => {});
      await page.waitForSelector('#actions .btn', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, '03-table-active', '#play-active .table-wrap');
      await shot(page, '03b-table-full', '#play-active');

      // Click a safe action to maybe get feedback
      const fold = page.locator('#actions .btn').filter({ hasText: /Fold|Tirar|Check/i }).first();
      if (await fold.count()) {
        await fold.click().catch(() => {});
        await page.waitForTimeout(1200);
      }
      await shot(page, '04-gto-feedback', 'body');
    }

    // School
    await goTab(page, 'school');
    await page.waitForTimeout(1200);
    await shot(page, '05-school', '#tab-school, #school, [data-tab=\"school\"]');
    await shot(page, '05b-school-full', 'body');

    // Stats / errors
    await goTab(page, 'stats');
    await page.waitForTimeout(1000);
    await shot(page, '06-stats', 'body');

    await goTab(page, 'errors');
    await page.waitForTimeout(1000);
    await shot(page, '07-errors', 'body');

    // Legendary
    await goTab(page, 'legendary');
    await page.waitForTimeout(1200);
    await shot(page, '08-legendary', 'body');

    // Ranges
    await goTab(page, 'ranges');
    await page.waitForTimeout(1000);
    await shot(page, '09-ranges', 'body');

    // Import / sessions area if exists
    await goTab(page, 'sessions');
    await page.waitForTimeout(1000);
    await shot(page, '10-sessions', 'body');

  } catch (e) {
    console.error('FAIL', e.message);
    await page.screenshot({ path: path.join(OUT, 'error-full.png') }).catch(() => {});
  }

  await ctx.close();
  await browser.close();

  // Rename video if produced
  const vids = fs.readdirSync(OUT).filter((f) => f.endsWith('.webm'));
  if (vids.length) {
    const src = path.join(OUT, vids[0]);
    const dest = path.join(OUT, 'broll-session-mobile.webm');
    fs.renameSync(src, dest);
    console.log('VIDEO', dest);
  }
  console.log('Done. Files in', OUT);
})();
