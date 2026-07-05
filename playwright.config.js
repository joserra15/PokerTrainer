// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 90000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npx http-server . -p 4173 -c-1 --silent',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
