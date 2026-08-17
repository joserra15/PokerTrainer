const { test, expect } = require('@playwright/test');

function patchAuthClient(page) {
  return page.addInitScript(() => {
    window.__ptOAuthCalls = 0;
    window.__ptAuthRpc = [];
    window.PT_E2E_MODE = true;
    localStorage.setItem('pt_cookie_consent_v1', JSON.stringify({
      necessary: true, analytics: false, ts: Date.now()
    }));

    function patchClient(client) {
      if (!client || client.__ptEntrarPatched) return client;
      client.__ptEntrarPatched = true;
      if (client.rpc) {
        var origRpc = client.rpc.bind(client);
        client.rpc = function (name) {
          window.__ptAuthRpc.push(String(name || ''));
          return origRpc.apply(client, arguments);
        };
      }
      if (client.auth) {
        client.auth.signInWithOAuth = async function () {
          window.__ptOAuthCalls += 1;
          return { data: { url: null, provider: 'google' }, error: null };
        };
      }
      return client;
    }

    var _supabase;
    Object.defineProperty(window, 'supabase', {
      configurable: true,
      enumerable: true,
      get: function () { return _supabase; },
      set: function (v) {
        _supabase = v;
        if (v && typeof v.createClient === 'function' && !v.__ptEntrarCreatePatched) {
          v.__ptEntrarCreatePatched = true;
          var orig = v.createClient.bind(v);
          v.createClient = function () {
            return patchClient(orig.apply(v, arguments));
          };
        }
      }
    });
  });
}

test.describe('Botones Entrar no rompen PKCE @smoke', () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false });

  test('header Entrar abre panel y no hace rpc Auth del embudo', async ({ page }) => {
    await patchAuthClient(page);
    await page.goto('/');
    await page.waitForSelector('.landing-login-btn[data-landing-login]', { timeout: 20000 });

    const header = page.locator('.landing-login-btn[data-landing-login]');
    await expect(header).toBeVisible();
    await expect(header).toHaveText(/Entrar/i);
    await header.click();
    await expect(page.locator('#landing-login')).not.toHaveClass(/hidden/);
    await expect(page.locator('#landing-login #auth-mobile-login')).toBeVisible();

    const rpcAfterEntrar = await page.evaluate(() => window.__ptAuthRpc.slice());
    expect(rpcAfterEntrar.filter((n) => n === 'pt_guest_funnel_ingest')).toEqual([]);

    await page.locator('#auth-mobile-login').click();
    await expect
      .poll(async () => page.evaluate(() => window.__ptOAuthCalls), { timeout: 5000 })
      .toBeGreaterThan(0);

    const rpcAfterOAuth = await page.evaluate(() => window.__ptAuthRpc.slice());
    expect(rpcAfterOAuth.filter((n) => n === 'pt_guest_funnel_ingest')).toEqual([]);
    const err = (await page.locator('#auth-error').textContent()) || '';
    expect(err.trim()).toBe('');
  });
});

test.describe('Botón Entrar del menú móvil @mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nav Entrar abre el mismo panel sin rpc Auth del embudo', async ({ page }) => {
    await patchAuthClient(page);
    await page.goto('/');
    await page.waitForSelector('#landing-nav-toggle', { timeout: 20000 });
    await page.locator('#landing-nav-toggle').click();
    await expect(page.locator('body')).toHaveClass(/landing-nav-open/);

    const navLogin = page.locator('#landing-nav [data-landing-login]');
    await expect(navLogin).toBeVisible();
    await expect(navLogin).toHaveText(/Entrar/i);
    await navLogin.click();
    await expect(page.locator('#landing-login')).not.toHaveClass(/hidden/);
    await expect(page.locator('#landing-login #auth-mobile-login')).toBeVisible();

    const rpc = await page.evaluate(() => window.__ptAuthRpc.slice());
    expect(rpc.filter((n) => n === 'pt_guest_funnel_ingest')).toEqual([]);
  });
});
