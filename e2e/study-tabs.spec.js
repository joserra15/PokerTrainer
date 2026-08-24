const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, seedStudyData, waitForAppShell, goTab } = require('./helpers');

test.describe('Pestañas de estudio @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await seedStudyData(page);
    await waitForAppShell(page);
  });

  test('Histórico muestra mano sembrada', async ({ page }) => {
    await goTab(page, 'history');
    await expect(page.locator('#history-list')).toContainText(/AKo|BTN|e2e/i, { timeout: 15000 });
  });

  test('Errores muestra spot sembrado', async ({ page }) => {
    await goTab(page, 'errors');
    await expect(page.locator('#errors-list')).toContainText(/Call|fold|AKo|flop|error/i, { timeout: 15000 });
  });

  test('Estadísticas renderizan contenido', async ({ page }) => {
    await goTab(page, 'stats');
    await expect(page.locator('#tab-stats')).toContainText(/Acierto por calle|Entrenador|Sesiones/i, { timeout: 15000 });
    await expect(page.locator('#tab-stats [data-stats-tab="trainer"]')).toBeVisible();
    await expect(page.locator('#tab-stats [data-stats-panel="trainer"]')).toBeVisible();
    await expect(page.locator('#home-gamification')).toBeHidden();
    await expect(page.locator('#stats-gamification')).toBeHidden();
  });


  test('Rangos muestra matriz', async ({ page }) => {
    await goTab(page, 'ranges');
    await page.waitForSelector('#ranges-matrix-host, .range-matrix, #tab-ranges', { timeout: 20000 });
    const text = await page.locator('#tab-ranges').innerText();
    expect(text.length).toBeGreaterThan(20);
    await expect(page.locator('#tab-ranges')).not.toContainText(/pt\.|i18n\./);
  });

  test('Escuela Laboratorio Rangos muestra R-01', async ({ page }) => {
    await goTab(page, 'school');
    await page.waitForSelector('#school-content .school-page', { timeout: 20000 });
    await expect(page.locator('#school-content')).toContainText(/ES|español/i);
    const rangesTab = page.locator('[data-school-route="ranges"]');
    await expect(rangesTab).toBeVisible({ timeout: 15000 });
    await rangesTab.click();
    await expect(page.locator('#school-content')).toContainText(/R-01|Leer un range chart|matriz/i, { timeout: 15000 });
    const lessonBtn = page.locator('[data-school-lesson="R-01"]');
    await expect(lessonBtn).toBeVisible({ timeout: 10000 });
    await lessonBtn.click();
    await expect(page.locator('#school-content')).toContainText(/Abrir chart|Vista previa|matriz/i, { timeout: 15000 });
  });
});
