const { test, expect } = require('@playwright/test');
const { mockAuthenticatedUser, waitForAppShell, goTab } = require('./helpers');

test.describe('Escuela gestión de banca M0b @smoke', () => {
  test('CB/SB/TB registrados, hub M0b y calculadora', async ({ page }) => {
    await mockAuthenticatedUser(page, { plan: 'pro', isAdmin: true });
    await page.addInitScript(() => {
      const uid = 'e2e-test-user';
      const school = { xp: 500, lessons: {}, version: 5, updatedAt: Date.now() };
      ['C-00', 'C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06', 'F-01'].forEach(function (id) {
        school.lessons[id] = {
          passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true, perfect: true
        };
      });
      localStorage.setItem('pt_stats_v1_' + uid, JSON.stringify({ school: school, handsPlayed: 0 }));
      localStorage.setItem('pt_school_progress_v1_' + uid, JSON.stringify(school));
      localStorage.setItem('pt_school_backup_v1_' + uid, JSON.stringify(school));
    });
    await waitForAppShell(page);
    await goTab(page, 'school');
    await page.waitForSelector('#school-content .school-page', { timeout: 20000 });

    const data = await page.evaluate(() => {
      const D = window.PTSchoolData;
      if (!D) return null;
      const ids = ['CB-01', 'CB-02', 'CB-03', 'SB-01', 'SB-02', 'SB-03', 'TB-01', 'TB-02', 'TB-03'];
      return {
        lessons: ids.map(function (id) {
          const L = D.getLesson(id);
          return L ? { id: id, module: L.module, spots: (L.spots || []).length, tool: !!L.openBankrollTool } : { id: id, missing: true };
        }),
        mods: D.modulesInRoute('cash'),
        tool: !!(window.PTSchoolBankrollTool && window.PTSchoolBankrollTool.compute),
        bi: window.PTSchoolBankrollTool ? window.PTSchoolBankrollTool.compute(800, 10, 'cash').buyIns : null
      };
    });

    expect(data).toBeTruthy();
    expect(data.tool).toBeTruthy();
    expect(data.bi).toBe(80);
    expect(data.mods.indexOf('M0b')).toBe(data.mods.indexOf('M0') + 1);
    data.lessons.forEach(function (L) {
      expect(L.missing, L.id).toBeFalsy();
      expect(L.module).toBe('M0b');
      expect(L.spots).toBeGreaterThanOrEqual(10);
      expect(L.tool).toBeTruthy();
    });

    await expect(page.locator('#school-content')).toContainText(/Gestión de banca/i, { timeout: 15000 });

    await page.evaluate(() => {
      if (window.PTSchool && window.PTSchool.openLesson) window.PTSchool.openLesson('CB-01');
    });
    await page.waitForSelector('#school-open-bankroll', { timeout: 15000 });
    await page.click('#school-open-bankroll');
    await expect(page.locator('#school-bankroll-modal')).not.toHaveClass(/hidden/);
    await page.fill('#school-br-bankroll', '800');
    await page.fill('#school-br-buyin', '10');
    await page.selectOption('#school-br-format', 'cash');
    await page.click('#school-bankroll-form button[type="submit"]');
    await expect(page.locator('#school-bankroll-result')).toContainText(/80/);
  });
});
