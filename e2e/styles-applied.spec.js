const { test, expect } = require('@playwright/test');

/**
 * Regresión de la landing "en crudo": tras un deploy, el service worker podía
 * entregar css/styles.css como respuesta vacía o 404 y la página se renderizaba
 * con los estilos por defecto del navegador (serif, enlaces azules, drawer
 * abierto) sin forma de recuperarse salvo borrando datos del navegador.
 */

/** ¿La hoja llegó a aplicarse de verdad (no solo a cargarse)? */
function sheetApplied(page, name) {
  return page.evaluate((needle) => {
    const list = Array.from(document.styleSheets);
    const sheet = list.find((s) => s.href && s.href.indexOf(needle) >= 0);
    if (!sheet) return { found: false, rules: 0 };
    let rules = 0;
    try { rules = sheet.cssRules ? sheet.cssRules.length : 0; } catch (e) { rules = -1; }
    return { found: true, rules: rules };
  }, name);
}

test.describe('Estilos de la landing @smoke', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('el CSS se aplica y va versionado con la huella de assets', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-landing-try]', { timeout: 20000 });

    const main = await sheetApplied(page, 'css/styles.css');
    expect(main.found).toBe(true);
    expect(main.rules).toBeGreaterThan(0);

    // Si una vigilada no tuviera reglas, el watchdog reintentaría en bucle.
    const legendary = await sheetApplied(page, 'css/legendary.css');
    expect(legendary.found).toBe(true);
    expect(legendary.rules).toBeGreaterThan(0);
    expect(await page.getAttribute('#pt-css-legendary', 'href')).not.toContain('ptsw=bypass');

    // Sin CSS el body queda con el fondo blanco del navegador y fuente serif.
    const body = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return { font: cs.fontFamily, bg: cs.backgroundColor, image: cs.backgroundImage };
    });
    expect(body.font).toContain('Segoe UI');
    expect(body.image).toContain('gradient');

    // El token de ?v= es la huella de contenido, no la versión escrita a mano.
    const href = await page.getAttribute('#pt-css', 'href');
    const rev = await page.evaluate(() => window.PT_REV());
    expect(href).toContain('?v=' + encodeURIComponent(rev));
    expect(rev).toMatch(/^\d+\.\d+\.\d+-[0-9a-f]{10}$/);
  });

  test('si la hoja no carga, la página se recupera sola', async ({ page }) => {
    let attempts = 0;
    // Primer intento roto (lo que hacía el SW durante un deploy); el resto pasa.
    await page.route('**/css/styles.css*', async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 503, contentType: 'text/css', body: '' });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page.waitForSelector('[data-landing-try]', { timeout: 20000 });

    await expect.poll(async () => (await sheetApplied(page, 'css/styles.css')).rules, {
      timeout: 20000
    }).toBeGreaterThan(0);

    expect(attempts).toBeGreaterThan(1);
    // El reintento tiene que esquivar al service worker, no volver a su caché.
    expect(await page.getAttribute('#pt-css', 'href')).toContain('ptsw=bypass');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage))
      .toContain('gradient');
  });
});
