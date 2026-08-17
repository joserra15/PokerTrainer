const { test, expect } = require('@playwright/test');

/**
 * Regresión login desktop/portátil @smoke:
 * - Continuar con Google enlazado aunque getSession cuelgue
 * - Entrar (nav) dispara el mismo flujo OAuth
 */
test.describe('Login landing desktop @smoke', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    hasTouch: false
  });

  test('Continuar y Entrar disparan OAuth con getSession colgado', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ptOAuthCalls = 0;

      function patchAuth(client) {
        if (!client || !client.auth || client.__ptLoginPatched) return client;
        client.__ptLoginPatched = true;
        client.auth.getSession = function () {
          return new Promise(function () { /* hang: bug original en portátil */ });
        };
        client.auth.signInWithOAuth = async function () {
          window.__ptOAuthCalls += 1;
          return { data: { url: null, provider: 'google' }, error: null };
        };
        return client;
      }

      // Interceptar el SDK antes de que auth-bootstrap llame getSession.
      var _supabase;
      Object.defineProperty(window, 'supabase', {
        configurable: true,
        enumerable: true,
        get: function () { return _supabase; },
        set: function (v) {
          _supabase = v;
          if (v && typeof v.createClient === 'function' && !v.__ptCreatePatched) {
            v.__ptCreatePatched = true;
            var orig = v.createClient.bind(v);
            v.createClient = function () {
              return patchAuth(orig.apply(v, arguments));
            };
          }
        }
      });
    });

    await page.goto('/');
    await page.waitForSelector('.landing-login-btn', { timeout: 15000 });
    await page.locator('.landing-login-btn').click();
    await page.waitForSelector('#landing-login:not(.hidden) #auth-mobile-login', { timeout: 15000 });
    await expect(page.locator('#auth-mobile-login')).toBeVisible();
    await expect(page.locator('#google-signin-btn')).toBeHidden();

    // Debe responder enseguida aunque getSession siga colgado (timeout boot = 8s).
    await page.locator('#auth-mobile-login').click();
    await expect
      .poll(async () => page.evaluate(() => window.__ptOAuthCalls), { timeout: 5000 })
      .toBeGreaterThan(0);

    const afterContinuar = await page.evaluate(() => window.__ptOAuthCalls);

    await page.locator('#auth-mobile-login').click();
    await expect
      .poll(async () => page.evaluate(() => window.__ptOAuthCalls), { timeout: 5000 })
      .toBeGreaterThan(afterContinuar);

    const err = (await page.locator('#auth-error').textContent()) || '';
    expect(err.trim()).toBe('');
  });
});
