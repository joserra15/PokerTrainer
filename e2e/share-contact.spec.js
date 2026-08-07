const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Share page y contacto @smoke', () => {
  test('share.html carga CTA / unavailable', async ({ page }) => {
    await page.goto('/share.html');
    await expect(page.locator('#share-enter')).toBeAttached({ timeout: 15000 });
    await expect(page.locator('#share-unavailable')).toBeVisible({ timeout: 15000 });
    const title = await page.title();
    expect(title).toMatch(/PokerForgeAI|compartida|share/i);
  });

  test('contacto tab y modal pendiente en DOM', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await page.click('button.tab[data-tab="contact"]');
    await page.waitForSelector('#tab-contact', { timeout: 15000 });
    await expect(page.locator('#contact-pending-modal')).toBeAttached();
    await expect(page.locator('#contact-pending-body')).toBeAttached();
  });
});
