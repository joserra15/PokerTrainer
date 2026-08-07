/**
 * Helpers E2E — mock de auth, consentimiento y seeds.
 *
 * Convención anti-flaky (RG-H04):
 * - Preferir waitForSelector / expect().toBeVisible con timeout.
 * - No añadir waitForTimeout fijos salvo fallback documentado.
 * - Retries solo vía playwright.config (CI=1).
 */

async function mockAuthenticatedUser(page, opts) {
  const options = opts || {};
  const isAdmin = !!options.isAdmin;
  const plan = options.plan || 'pro';
  await page.addInitScript(({ isAdmin, plan }) => {
    window.PT_E2E_MODE = true;
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
  await page.goto('/');
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
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

module.exports = {
  mockAuthenticatedUser,
  mockFreshAuthenticatedUser,
  seedStudyData,
  waitForAppShell,
  goTab
};
