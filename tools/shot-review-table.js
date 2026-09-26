/* Captura visual de la mesa del paso a paso (revisión de mano importada).
 * Uso: node tools/shot-review-table.js [fixture]
 * Levanta http-server en :4174 por su cuenta.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const PORT = 4174;
const BASE = 'http://127.0.0.1:' + PORT;
const OUT = path.join(__dirname, '..', '.shots');
const FIXTURE = process.argv[2] || 'PokerStars-9max-sample.txt';

async function bootstrap(page) {
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    try { sessionStorage.setItem('pt_css_purge', '1'); } catch (e) { /* noop */ }
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'shot-user', email: 'shot@test.local', name: 'Shot', authProvider: 'e2e',
      loginAt: Date.now(), plan: 'pro'
    }));
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({ necessary: true, analytics: false, ts: Date.now() }));
    localStorage.setItem('pt_age_gate_v1', JSON.stringify({ users: { 'shot-user': { confirmed: true, ts: Date.now() } } }));
    localStorage.setItem('pt_ai_consent_v1', '1');
  });
}

async function openReview(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
  await page.evaluate(() => { if (window.goToTab) window.goToTab('sessions'); });
  await page.waitForSelector('#session-file', { timeout: 20000 });
  await page.setInputFiles('#session-file', path.join(__dirname, 'fixtures', FIXTURE));
  await page.click('#process-session');
  await page.waitForSelector('#session-hands .record, #hand-list .record', { timeout: 120000 });
  const ids = await page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('[data-review]'), (b) => b.getAttribute('data-review'))
  );
  let best = null;
  for (const id of ids.slice(0, 40)) {
    await page.evaluate((hid) => {
      const btn = document.querySelector('[data-review="' + hid + '"]');
      if (btn) btn.click();
    }, id);
    await page.waitForSelector('#hand-review-content .session-replay-table', { timeout: 30000 });
    const info = await page.evaluate(() => ({
      showdown: document.querySelectorAll('#hand-review-content .seat-cards.showdown').length,
      board: document.querySelectorAll('#hand-review-content .board .card').length,
      villains: document.querySelectorAll('#hand-review-content .seat.villain').length
    }));
    const score = info.showdown * 10 + info.board + info.villains;
    if (!best || score > best.score) best = { id: id, score: score, info: info };
    if (info.showdown && info.board >= 5) break;
  }
  if (best) {
    await page.evaluate((hid) => {
      const btn = document.querySelector('[data-review="' + hid + '"]');
      if (btn) btn.click();
    }, best.id);
    await page.waitForSelector('#hand-review-content .session-replay-table', { timeout: 30000 });
    console.log('  mano elegida', best.id, JSON.stringify(best.info));
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn('npx', ['http-server', '.', '-p', String(PORT), '-c-1', '--silent'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore'
  });
  await new Promise((r) => setTimeout(r, 1500));
  const browser = await chromium.launch();
  const cases = [
    { name: 'review-mobile', vp: { width: 390, height: 844 } },
    { name: 'review-desktop', vp: { width: 1280, height: 900 } }
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: c.vp, deviceScaleFactor: 2, isMobile: c.vp.width < 500, hasTouch: c.vp.width < 500 });
    const page = await ctx.newPage();
    await bootstrap(page);
    try {
      await openReview(page);
      const table = page.locator('#hand-review-content .session-replay-table').first();
      await table.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await table.screenshot({ path: path.join(OUT, c.name + '.png') });
      await page.screenshot({ path: path.join(OUT, c.name + '-full.png') });
      console.log('OK', c.name);
      const replayBtn = page.locator('#to-replay');
      if (await replayBtn.count()) {
        await replayBtn.click();
        await page.waitForSelector('#replay-actions .btn', { timeout: 20000 });
        await page.waitForTimeout(400);
        const t2 = page.locator('#hand-review-content .session-replay-table').first();
        await t2.scrollIntoViewIfNeeded();
        await t2.screenshot({ path: path.join(OUT, c.name + '-replay.png') });
        await page.screenshot({ path: path.join(OUT, c.name + '-replay-full.png') });
        console.log('OK', c.name + '-replay');
      }
    } catch (e) {
      console.error('FAIL', c.name, e.message);
      await page.screenshot({ path: path.join(OUT, c.name + '-full.png') });
    }
    await ctx.close();
  }
  await browser.close();
  server.kill();
  process.exit(0);
})();
