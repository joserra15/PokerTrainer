/**
 * Helpers E2E — mock de auth y consentimiento de cookies.
 */
async function mockAuthenticatedUser(page) {
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'e2e-test-user',
      email: 'e2e@test.pokerforgeai.local',
      name: 'E2E Test',
      authProvider: 'e2e',
      loginAt: Date.now(),
      plan: 'pro'
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
  });
}

async function waitForAppShell(page) {
  await page.goto('/');
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
}

async function goTab(page, tab) {
  await page.click('button.tab[data-tab="' + tab + '"]');
  await page.waitForSelector('#tab-' + tab + ':not(.hidden), #tab-' + tab + '.tab-panel:not(.hidden), section#tab-' + tab + ':not(.hidden)', {
    timeout: 15000
  }).catch(async () => {
    // Algunos paneles usan clase active en vez de hidden
    await page.waitForTimeout(300);
  });
}

module.exports = { mockAuthenticatedUser, waitForAppShell, goTab };
