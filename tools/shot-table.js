/* Captura visual de la mesa de juego en varias resoluciones y temas.
 * Uso: node tools/shot-table.js  (requiere http-server en :4173)
 */
const path = require('path');
const { chromium } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const OUT = path.join(__dirname, '..', '.shots');

async function bootstrap(page) {
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'shot-user', email: 'shot@test.local', name: 'Shot', authProvider: 'e2e'
    }));
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({ necessary: true, analytics: false, ts: Date.now() }));
  });
}

async function openTable(page, theme) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pt-go-tab', { detail: { tab: 'play', setup: true } })));
  await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
  if (theme) {
    await page.click(`#setup-table-theme .setup-chip[data-val="${theme}"]`);
  }
  await page.click('#play-start');
  await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
  await page.waitForSelector('#actions .btn', { timeout: 60000 });
  await page.evaluate(() => { const el = document.querySelector('#play-active'); if (el) el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(600);
}

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const cases = [
    { name: 'desktop-emerald', vp: { width: 1280, height: 720 }, theme: 'emerald' },
    { name: 'desktop-midnight', vp: { width: 1280, height: 720 }, theme: 'midnight' },
    { name: 'desktop-crimson', vp: { width: 1280, height: 720 }, theme: 'crimson' },
    { name: 'mobile-portrait', vp: { width: 390, height: 844 }, theme: 'emerald' },
    { name: 'mobile-landscape', vp: { width: 844, height: 390 }, theme: 'midnight' }
  ];

  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: c.vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await bootstrap(page);
    try {
      await openTable(page, c.theme);
      const felt = page.locator('#play-active .table-wrap').first();
      await felt.screenshot({ path: path.join(OUT, c.name + '.png') });
      console.log('OK', c.name);
    } catch (e) {
      console.error('FAIL', c.name, e.message);
      await page.screenshot({ path: path.join(OUT, c.name + '-full.png') });
    }
    await ctx.close();
  }
  await browser.close();
})();
