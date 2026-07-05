const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell } = require('./helpers');

test.describe('Auth mock', () => {
  test('muestra app tras sesión guardada', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await waitForAppShell(page);
    await expect(page.locator('#auth-gate')).toHaveClass(/hidden/);
    await expect(page.locator('#app-shell')).not.toHaveClass(/hidden/);
    await expect(page.locator('#home-page')).toBeVisible();
  });
});
