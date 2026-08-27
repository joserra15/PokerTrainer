/* 6 clips cortos de b-roll Instagram (Playwright recordVideo por clip).
 * Uso: node tools/instagram-broll-clips.js  (http-server :4173)
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

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.modal, .popup, [role="dialog"], .hand-end, .overlay')
      .forEach((el) => { el.classList.add('hidden'); el.style.display = 'none'; });
    const closeBtns = document.querySelectorAll('[data-close], .modal-close, .btn-close');
    closeBtns.forEach((b) => { try { b.click(); } catch (e) {} });
  }).catch(() => {});
  // Prefer clicking "Nueva sesión" / close if visible
  const nueva = page.locator('button', { hasText: /Nueva sesión|Cerrar|Close/i }).first();
  if (await nueva.count()) await nueva.click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function goTab(page, tab, extra) {
  await page.evaluate(({ tab, extra }) => {
    window.dispatchEvent(new CustomEvent('pt-go-tab', {
      detail: Object.assign({ tab }, extra || {})
    }));
  }, { tab, extra });
  await page.waitForTimeout(900);
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
  // Rename newest webm to clip name
  const vids = fs.readdirSync(OUT)
    .filter((f) => f.endsWith('.webm') && !f.startsWith('clip-') && f !== 'broll-session-mobile.webm')
    .map((f) => ({ f, m: fs.statSync(path.join(OUT, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (vids.length) {
    const dest = path.join(OUT, 'clip-' + name + '.webm');
    fs.renameSync(path.join(OUT, vids[0].f), dest);
    console.log('VID', dest);
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // 1) Reto 5 manos / landing → mesa
  await withClip(browser, '01-reto-5manos', async (page) => {
    await page.goto(BASE + '/');
    await page.waitForTimeout(1200);
    const tryBtn = page.locator('[data-landing-try]').first();
    if (await tryBtn.count()) await tryBtn.click().catch(() => {});
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 }).catch(() => {});
    await goTab(page, 'play', { setup: true });
    await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 }).catch(() => {});
    await page.click('#play-start').catch(() => {});
    await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#actions .btn', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
  });

  // 2) Popup GTO feedback
  await withClip(browser, '02-gto-popup', async (page) => {
    await page.goto(BASE + '/');
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 });
    await goTab(page, 'play', { setup: true });
    await page.click('#play-start').catch(() => {});
    await page.waitForSelector('#actions .btn', { timeout: 60000 });
    await page.waitForTimeout(600);
    const fold = page.locator('#actions .btn').filter({ hasText: /Fold|Tirar/i }).first();
    if (await fold.count()) await fold.click();
    else await page.locator('#actions .btn').first().click();
    await page.waitForTimeout(3500);
  });

  // 3) Import / sessions
  await withClip(browser, '03-import-sesion', async (page) => {
    await page.goto(BASE + '/');
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 });
    await dismissOverlays(page);
    await goTab(page, 'sessions');
    await page.waitForTimeout(2000);
    // try import tab aliases
    await goTab(page, 'import');
    await page.waitForTimeout(1500);
  });

  // 4) ForgeCoach / AI if present
  await withClip(browser, '04-forgecoach', async (page) => {
    await page.goto(BASE + '/');
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 });
    await dismissOverlays(page);
    // Open coach via common selectors
    const coachBtn = page.locator('button, a, [role="button"]').filter({
      hasText: /ForgeCoach|Coach|IA|Ask|Pregunt/i
    }).first();
    if (await coachBtn.count()) {
      await coachBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
    } else {
      await goTab(page, 'stats');
      await page.waitForTimeout(1500);
    }
  });

  // 5) Escuela
  await withClip(browser, '05-escuela', async (page) => {
    await page.goto(BASE + '/');
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 });
    await dismissOverlays(page);
    await goTab(page, 'school');
    await page.waitForTimeout(2500);
    // click first lesson if visible
    const lesson = page.locator('[data-lesson], .school-lesson, .lesson-card, button').filter({
      hasText: /Lección|Open|RFI|Empezar|Continuar/i
    }).first();
    if (await lesson.count()) await lesson.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(2000);
  });

  // 6) Manos legendarias
  await withClip(browser, '06-legendarias', async (page) => {
    await page.goto(BASE + '/');
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 20000 });
    await dismissOverlays(page);
    await goTab(page, 'legendary');
    await page.waitForTimeout(2500);
    const play = page.locator('button').filter({ hasText: /Jugar|Play|Empezar|Ver/i }).first();
    if (await play.count()) await play.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(2500);
  });

  await browser.close();
  console.log('Done clips in', OUT);
})();
