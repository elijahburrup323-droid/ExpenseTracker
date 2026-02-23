const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const acct of ACCOUNTS) {
  test.describe(`Soft Close CM2 — ${acct.email}`, () => {

    test('Soft Close page loads successfully', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/soft_close`);
      await expect(page.locator('h1:has-text("Soft Close Month")')).toBeVisible({ timeout: 10000 });
      // Checklist should load (not stay at "Loading checklist...")
      await page.waitForTimeout(3000);
      const checklistText = await page.locator('[data-soft-close-target="checklistBody"]').textContent();
      expect(checklistText).not.toContain('Loading checklist...');
    });

    test('Soft Close API returns valid status', async ({ page }) => {
      await login(page, acct.email, acct.password);
      const res = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/soft_close/status`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: r.status, data: await r.json() };
      }, BASE);

      expect(res.status).toBe(200);
      expect(res.data.month_label).toBeTruthy();
      expect(res.data.year).toBeGreaterThan(2000);
      expect(res.data.month).toBeGreaterThanOrEqual(1);
      expect(res.data.month).toBeLessThanOrEqual(12);
      expect(res.data.items).toHaveLength(8);
      expect(res.data.summary).toBeTruthy();
    });

    test('Open month master API returns valid data', async ({ page }) => {
      await login(page, acct.email, acct.password);
      const res = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/open_month_master`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: r.status, data: await r.json() };
      }, BASE);

      expect(res.status).toBe(200);
      expect(res.data.current_year).toBeGreaterThan(2000);
      expect(res.data.current_month).toBeGreaterThanOrEqual(1);
      expect(res.data.current_month).toBeLessThanOrEqual(12);
    });

    test('close_month_masters table exists in schema', async ({ page }) => {
      await login(page, acct.email, acct.password);
      // Use DBU tables API to verify the table exists
      const res = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/dbu/tables`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: r.status, data: await r.json() };
      }, BASE);

      expect(res.status).toBe(200);
      const tables = Array.isArray(res.data) ? res.data : (res.data.tables || []);
      const tableNames = tables.map(t => t.table_name || t.name || t);
      expect(tableNames).toContain('close_month_masters');
    });

    test('No JavaScript errors on soft close page', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/soft_close`);
      await page.waitForTimeout(3000);

      const critical = errors.filter(e => !e.includes('ResizeObserver'));
      expect(critical).toHaveLength(0);
    });

    test('Dashboard still works (regression)', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await expect(page.locator('text=Hello')).toBeVisible({ timeout: 10000 });
    });
  });
}
