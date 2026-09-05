/**
 * Helpers E2E — mock de auth, consentimiento y seeds.
 *
 * Convención anti-flaky (RG-H04):
 * - Preferir waitForSelector / expect().toBeVisible con timeout.
 * - No añadir waitForTimeout fijos salvo fallback documentado.
 * - Retries solo vía playwright.config (CI=1).
 */

const { expect } = require('@playwright/test');

async function mockAuthenticatedUser(page, opts) {
  const options = opts || {};
  const isAdmin = !!options.isAdmin;
  const plan = options.plan || 'pro';
  await page.addInitScript(({ isAdmin, plan }) => {
    window.PT_E2E_MODE = true;
    try { sessionStorage.setItem('pt_css_purge', '1'); } catch (e) { /* noop */ }
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'e2e-test-user',
      email: 'e2e@test.pokerforgeai.local',
      name: 'E2E Test',
      authProvider: 'e2e',
      loginAt: Date.now(),
      plan: plan,
      isAdmin: isAdmin
    }));
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
      necessary: true,
      analytics: false,
      ts: Date.now()
    }));
    localStorage.setItem('pt_age_gate_v1', JSON.stringify({
      users: {
        'e2e-test-user': { confirmed: true, ts: Date.now() }
      }
    }));
  }, { isAdmin, plan });
}

/** Evita bucles de recarga mientras version.js aún no fijó PT_ASSET_REV. */
function seedStableAssetRev(page) {
  return page.addInitScript(() => {
    try { sessionStorage.setItem('pt_css_purge', '1'); } catch (e) { /* noop */ }
  });
}

/** Landing estable en E2E: consentimiento, sin recarga por build-guard ni bucle CSS. */
async function bootstrapPublicLanding(page) {
  await seedStableAssetRev(page);
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
      necessary: true,
      analytics: false,
      ts: Date.now()
    }));
  });
}

async function gotoLanding(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('[data-landing-try]', { timeout: 20000 });
}

/** Perfil fresco: sin consent ni age-gate (RG-G06). */
async function mockFreshAuthenticatedUser(page) {
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'e2e-fresh-user',
      email: 'fresh@test.pokerforgeai.local',
      name: 'Fresh User',
      authProvider: 'e2e',
      loginAt: Date.now(),
      plan: 'free'
    }));
    localStorage.removeItem('pt_cookie_consent_v1');
    localStorage.removeItem('pt_age_gate_v1');
  });
}

async function seedStudyData(page) {
  await page.addInitScript(() => {
    const uid = 'e2e-test-user';
    const now = new Date().toISOString();
    localStorage.setItem('pt_history_v1_' + uid, JSON.stringify([{
      id: 'e2e-h1',
      createdAt: now,
      heroPos: 'BTN',
      heroCode: 'AKo',
      heroCards: ['As', 'Kd'],
      totalEvLoss: 0.5,
      heroNet: 1.2,
      scenario: { type: 'RFI', heroPos: 'BTN' },
      decisions: [{ street: 'preflop', class: 'optima', label: 'Raise', action: 'raise', evLoss: 0 }],
      handScore: 9
    }]));
    localStorage.setItem('pt_errors_v1_' + uid, JSON.stringify([{
      id: 'e2e-e1',
      handId: 'e2e-h1',
      createdAt: now,
      street: 'flop',
      class: 'error',
      chosen: 'Call',
      best: 'fold',
      evLoss: 1.2,
      spotKey: 'RFI|BTN|flop',
      heroCode: 'AKo',
      heroPos: 'BTN'
    }]));
    localStorage.setItem('pt_stats_v1_' + uid, JSON.stringify({
      handsPlayed: 3,
      totalEvLoss: 1.5,
      totalNet: 2.4,
      decisions: 5,
      optima: 3,
      aceptable: 1,
      imprecisa: 0,
      error: 1,
      byStreet: {
        preflop: { n: 3, good: 3 },
        flop: { n: 1, good: 0 },
        turn: { n: 1, good: 1 },
        river: { n: 0, good: 0 }
      },
      updatedAt: Date.now()
    }));
  });
}

async function waitForAppShell(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
}

/** Modo completo: #actions .btn puede ser «Saltar» la animación, no una decisión. */
function playActionButtons(page) {
  return page.locator('#play-active:not(.hidden) #actions button[data-action]');
}

function playSkipButton(page) {
  return page.locator('#play-active:not(.hidden) .action-play-skip');
}

/**
 * Espera a que cualquiera de varios locators sea visible.
 * Playwright exige un único match en toBeVisible(); .or() sin .first()
 * falla en strict mode cuando toast + botones (o varios botones) coinciden.
 */
async function expectAnyVisible(locator, opts) {
  await expect(locator.first()).toBeVisible(opts || {});
}

async function skipActionPlaybackIfNeeded(page) {
  const skip = playSkipButton(page);
  const actionBtn = playActionButtons(page);
  await skip.or(actionBtn).first().waitFor({ state: 'visible', timeout: 20000 });
  // La línea de acción se re-renderiza en móvil; force + reintentos si el nodo se detach.
  for (let i = 0; i < 8; i++) {
    if (await actionBtn.count()) return;
    if (!(await skip.isVisible().catch(() => false))) break;
    try {
      await skip.click({ force: true, timeout: 2500 });
    } catch (_) {
      /* detached / not stable — reintento */
    }
    const ready = await actionBtn.first()
      .waitFor({ state: 'visible', timeout: 500 })
      .then(() => true)
      .catch(() => false);
    if (ready) return;
  }
  await actionBtn.first().waitFor({ state: 'visible', timeout: 20000 });
}

async function clickFirstPlayAction(page) {
  await skipActionPlaybackIfNeeded(page);
  const actionBtn = playActionButtons(page);
  await actionBtn.first().waitFor({ state: 'visible', timeout: 20000 });
  // Re-renders post-acción (toast / multiway) detachán el nodo; force evita 90s de retry.
  await actionBtn.first().click({ force: true, timeout: 5000 });
}

/** Avanza la mano: espera toast, salta playback o fuerza la 1ª decisión. */
async function advancePlayHand(page) {
  const handEnd = page.locator('#modal:not(.hidden) .hand-end-popup');
  if (await handEnd.isVisible().catch(() => false)) return 'hand-end';
  // El toast visible anima la mesa y desestabiliza #actions.
  await page.locator('#verdict-toast.visible').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  if (await handEnd.isVisible().catch(() => false)) return 'hand-end';
  await skipActionPlaybackIfNeeded(page);
  if (await handEnd.isVisible().catch(() => false)) return 'hand-end';
  const btns = playActionButtons(page);
  if ((await btns.count()) === 0) return 'idle';
  try {
    await btns.first().click({ timeout: 5000 });
  } catch (_) {
    await skipActionPlaybackIfNeeded(page);
    if (await playActionButtons(page).count()) {
      await playActionButtons(page).first().click({ force: true, timeout: 5000 }).catch(() => {});
    }
  }
  return 'action';
}

async function goTab(page, tab) {
  if (tab === 'account') {
    const settings = page.locator('#account-settings');
    if (await settings.isVisible().catch(() => false)) {
      await settings.click();
    } else {
      await page.evaluate(() => {
        if (window.goToTab) window.goToTab('account');
      });
    }
  } else {
    await page.click('button.tab[data-tab="' + tab + '"]');
  }
  await page.waitForSelector('#tab-' + tab + ':not(.hidden), #tab-' + tab + '.active, #tab-' + tab, {
    timeout: 15000
  });
}

async function openPlaySetupAdvanced(page) {
  const details = page.locator('#setup-advanced');
  if ((await details.count()) === 0) return;
  const isOpen = await details.evaluate((el) => el.open);
  if (!isOpen) {
    await details.locator('summary').click();
    await page.waitForFunction(() => {
      const el = document.getElementById('setup-advanced');
      return el && el.open;
    }, { timeout: 5000 });
  }
}

module.exports = {
  mockAuthenticatedUser,
  mockFreshAuthenticatedUser,
  seedStudyData,
  seedStableAssetRev,
  bootstrapPublicLanding,
  gotoLanding,
  waitForAppShell,
  expectAnyVisible,
  goTab,
  openPlaySetupAdvanced,
  playActionButtons,
  playSkipButton,
  skipActionPlaybackIfNeeded,
  clickFirstPlayAction
};
