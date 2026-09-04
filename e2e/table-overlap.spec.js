const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, openPlaySetupAdvanced } = require('./helpers');

/**
 * La mesa coloca fichas, burbujas de acción, bote y board en muy poco espacio.
 * Cada vez que se ha tocado alguno de esos tamaños ha aparecido un solape que
 * tapaba justo lo que hay que leer, así que aquí se comprueba a varios anchos.
 */

/** Reparto reproducible: si no, el test tapa o destapa solapes según la suerte. */
async function seedRandom(page, seed) {
  await page.addInitScript((s0) => {
    let s = s0;
    Math.random = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

async function settle(page) {
  await page.locator('#play-active:not(.hidden) #actions button[data-action]')
    .first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(350);
}

async function startSession(page, players) {
  await page.evaluate(() => {
    if (window.goToTab) window.goToTab('play');
    else document.querySelector('button.tab[data-tab="play"]')?.click();
  });
  await page.waitForSelector('#play-setup:not(.hidden)', { timeout: 15000 });
  await openPlaySetupAdvanced(page);
  const seats = page.locator(`#setup-players .setup-chip[data-val="${players}"]`);
  if (await seats.count()) await seats.first().click();
  await page.click('#setup-practice-street .setup-chip[data-val="preflop"]');
  await page.click('#setup-action-mode .setup-chip[data-val="quick"]');
  await page.click('#play-start');
  await page.waitForSelector('#play-active:not(.hidden)', { timeout: 20000 });
  await settle(page);
}

function inspectTable(page) {
  return page.evaluate(() => {
    const overlap = (a, b) => {
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return w > 0 && h > 0 ? Math.round(w * h) : 0;
    };
    const feltEl = document.querySelector('#play-active .table-felt');
    if (!feltEl) return ['sin mesa'];
    const felt = feltEl.getBoundingClientRect();
    // Solo cuenta lo que el jugador puede ver sobre el felt. Durante un
    // repaint/scroll puntual los pods pueden medir fuera de pantalla y
    // "solaparse" sin tapar nada legible.
    const onFelt = (r) => {
      const top = Math.max(felt.top, 0);
      const bottom = Math.min(felt.bottom, window.innerHeight);
      const left = Math.max(felt.left, 0);
      const right = Math.min(felt.right, window.innerWidth);
      if (bottom - top < 2 || right - left < 2) return false;
      return r.bottom > top + 1 && r.top < bottom - 1
        && r.right > left + 1 && r.left < right - 1;
    };
    const grab = (sel, label) => Array.from(document.querySelectorAll('#play-active ' + sel))
      .map((el) => ({ el, label, r: el.getBoundingClientRect() }))
      .filter((o) => o.r.width > 1 && o.r.height > 1 && onFelt(o.r));

    const items = [
      ...grab('#seats .seat-bet', 'fichas'),
      ...grab('#seats .seat-act', 'accion'),
      ...grab('#seats .seat-main', 'pod'),
      ...grab('.pot', 'bote'),
      ...grab('#board .card', 'board'),
    ];
    const problems = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.label === 'board' && b.label === 'board') continue;
        // Un roce de unos pocos px no llega a ocultar nada legible.
        const ov = overlap(a.r, b.r);
        if (ov > 120) problems.push(`${a.label} tapa ${b.label} (${ov}px2)`);
      }
    }

    // Nada que el jugador deba leer puede quedar fuera de la mesa.
    grab('#seats .seat-bet', 'fichas').concat(grab('#seats .seat-act', 'accion')).forEach((o) => {
      if (o.r.right > felt.right + 1 || o.r.left < felt.left - 1) {
        problems.push(`${o.label} se sale de la mesa`);
      }
      if (o.r.right > window.innerWidth || o.r.left < 0) {
        problems.push(`${o.label} se sale de la pantalla`);
      }
    });
    return problems;
  });
}

const VIEWPORTS = [
  { name: 'movil', width: 390, height: 844 },
  { name: 'movil estrecho', width: 360, height: 740 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'escritorio', width: 1280, height: 900 },
];

for (const vp of VIEWPORTS) {
  test(`mesa sin solapes en ${vp.name}`, async ({ page }) => {
    await seedRandom(page, 0x9e3779b9 + vp.width);
    await mockAuthenticatedUser(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await waitForAppShell(page);
    await startSession(page, 6);

    const problems = [];
    for (let i = 0; i < 12; i++) {
      if (i > 0) {
        await page.locator('#new-hand').click();
        await settle(page);
      }
      problems.push(...(await inspectTable(page)));
      // Avanzar la mano saca más fichas y burbujas a la vez.
      const btn = page.locator('#actions button[data-action="call"], #actions button[data-action="check"]').first();
      if (await btn.count()) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(450);
        problems.push(...(await inspectTable(page)));
      }
    }
    expect([...new Set(problems)]).toEqual([]);
  });
}
