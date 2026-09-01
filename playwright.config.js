// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/** Smoke = @smoke en título; full = todo. CI PR usa SMOKE=1. */
const smokeOnly = !!process.env.SMOKE;

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 90000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Convención anti-flaky (RG-H04): retries solo en CI; evitar waitForTimeout nuevos.
  use: {
    baseURL: 'http://127.0.0.1:4173',
    navigationTimeout: 45000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npx http-server . -p 4173 -c-1 --silent',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      grep: smokeOnly ? /@smoke/ : undefined
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        ...devices['iPhone SE']
      },
      grep: /@mobile/
    }
  ]
});
