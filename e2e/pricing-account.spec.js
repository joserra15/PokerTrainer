const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

test.describe('Planes y Cuenta @smoke', () => {
  test('Planes muestra límites sin keys crudas', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await goTab(page, 'pricing');
    await expect(page.locator('#tab-pricing')).toBeVisible({ timeout: 15000 });
    const text = await page.locator('#tab-pricing').innerText();
    expect(text.length).toBeGreaterThan(30);
    expect(text).not.toMatch(/\bpt\.[a-z0-9_.]+/i);
    expect(text).not.toMatch(/\bi18n\.[a-z0-9_.]+/i);
    await expect(page.locator('#tab-pricing')).toContainText(/Study|Coach|Gratis|plan|€|EUR|IA|mano/i);
  });

  test('Cuenta muestra estado', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await goTab(page, 'account');
    await page.waitForSelector('#tab-account', { timeout: 15000 });
    const text = await page.locator('#tab-account').innerText();
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toMatch(/\bpt\.[a-z0-9_.]+/i);
  });
});
