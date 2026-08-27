/* Re-captura clips 03-06 con selectores correctos. */
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

async function openApp(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 25000 });
  await page.waitForTimeout(800);
}

async function clickTab(page, tab) {
  // Unhide if needed
  await page.evaluate((t) => {
    const btn = document.querySelector('.tab[data-tab="' + t + '"]');
    if (btn) btn.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('pt-go-tab', { detail: { tab: t } }));
  }, tab);
  await page.waitForTimeout(1200);
  await page.locator('#tab-' + tab).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
}

async function withClip(browser, name, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } }
  });
  const page = await ctx.newPage();
  await bootstrap(page);
  try {
    await fn(page);
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
    console.log('SHOT', name);
  } catch (e) {
    console.error('FAIL', name, e.message);
    await page.screenshot({ path: path.join(OUT, name + '-error.png') }).catch(() => {});
  }
  await ctx.close();
  const vids = fs.readdirSync(OUT)
    .filter((f) => f.endsWith('.webm') && !f.startsWith('clip-') && f !== 'broll-session-mobile.webm')
    .map((f) => ({ f, m: fs.statSync(path.join(OUT, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (vids.length) {
    const dest = path.join(OUT, 'clip-' + name + '.webm');
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(path.join(OUT, vids[0].f), dest);
    console.log('VID', dest);
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  await withClip(browser, '03-import-sesion', async (page) => {
    await openApp(page);
    await clickTab(page, 'sessions');
    await page.locator('#sessions-home').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#session-file').scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(2000);
    // Highlight import box
    await page.evaluate(() => {
      const box = document.querySelector('.import-box');
      if (box) box.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(1500);
  });

  await withClip(browser, '04-forgecoach', async (page) => {
    await openApp(page);
    await clickTab(page, 'play');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('pt-go-tab', { detail: { tab: 'play', setup: true } }));
    });
    await page.waitForTimeout(600);
    await page.click('#play-start').catch(() => {});
    await page.waitForSelector('#actions .btn', { timeout: 60000 });
    await page.locator('#actions .btn').filter({ hasText: /Fold|Tirar/i }).first().click().catch(async () => {
      await page.locator('#actions .btn').first().click();
    });
    await page.waitForTimeout(1500);
    // Open details to reveal ForgeCoach
    const details = page.locator('button', { hasText: /Ver detalles|detalles/i }).first();
    if (await details.count()) await details.click();
    await page.waitForTimeout(1500);
    const coach = page.locator('#ai-report-trainer, [id*="ai-report"], textarea, input[placeholder*="Forge"], input[placeholder*="pregunta"]').first();
    if (await coach.count()) {
      await coach.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(2000);
    } else {
      // Fallback: home hero mentioning ForgeCoach
      await clickTab(page, 'home');
      await page.waitForTimeout(2000);
    }
  });

  await withClip(browser, '05-escuela', async (page) => {
    await openApp(page);
    await clickTab(page, 'school');
    await page.locator('#school-content').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2500);
  });

  await withClip(browser, '06-legendarias', async (page) => {
    await openApp(page);
    await page.evaluate(() => {
      const btn = document.querySelector('.tab[data-tab="legendary"]');
      if (btn) btn.classList.remove('hidden');
    });
    await clickTab(page, 'legendary');
    await page.locator('#tab-legendary').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    // Try start first legendary hand
    const start = page.locator('#legendary-content button, #tab-legendary button').first();
    if (await start.count()) {
      await start.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
  });

  // Extra: ranges + errors clean shots
  await withClip(browser, '07-rangos', async (page) => {
    await openApp(page);
    await clickTab(page, 'ranges');
    await page.waitForTimeout(2500);
  });

  await withClip(browser, '08-errores', async (page) => {
    await openApp(page);
    await clickTab(page, 'errors');
    await page.waitForTimeout(2000);
  });

  await browser.close();
  console.log('Done');
})();
