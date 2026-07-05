/**
 * Helpers E2E — mock de auth y consentimiento de cookies.
 */
async function mockAuthenticatedUser(page) {
  await page.addInitScript(() => {
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_auth_v1', JSON.stringify({
      sub: 'e2e-test-user',
      email: 'e2e@test.pokertrainer.local',
      name: 'E2E Test',
      authProvider: 'e2e'
    }));
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
      necessary: true,
      analytics: false,
      ts: Date.now()
    }));
  });
}

async function waitForAppShell(page) {
  await page.goto('/');
  await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 30000 });
}

module.exports = { mockAuthenticatedUser, waitForAppShell };
