// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Tag Enhancements CM-2 — ${user.email}`, () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', user.email);
      await page.fill('input[name="user[password]"]', user.password);
      await Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }
    });

    // --- Spending by Tag Report ---

    test('Spending by Tag report page loads with options modal', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      const modal = page.locator('[data-spending-by-tag-target="optionsModal"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h3')).toHaveText('Spending by Tag');
    });

    test('Spending by Tag options modal has Regular and Comparison types', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      await expect(page.locator('[data-spending-by-tag-target="typeRegular"]')).toBeVisible();
      await expect(page.locator('[data-spending-by-tag-target="typeComparison"]')).toBeVisible();
    });

    test('Run Report shows report content', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(2000);
      const content = page.locator('[data-spending-by-tag-target="reportContent"]').first();
      await expect(content).toBeVisible();
      await expect(page.locator('h1:has-text("Spending by Tag")')).toBeVisible();
    });

    test('Regular report shows tag table with data', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(2000);
      const tbody = page.locator('[data-spending-by-tag-target="summaryBody"]');
      // Should have at least one row (either tagged data or "No tagged spending")
      const rows = await tbody.locator('tr').count();
      expect(rows).toBeGreaterThanOrEqual(1);
    });

    test('Spending by Tag API endpoint responds', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/reports/spending_by_tag`, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        return {
          status: res.status,
          ok: res.ok,
          hasKeys: 'tags' in data && 'total_spent' in data && 'month_label' in data
        };
      }, BASE);
      expect(response.ok).toBe(true);
      expect(response.hasKeys).toBe(true);
    });

    test('Comparison mode shows comparison options', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      await page.locator('[data-spending-by-tag-target="typeComparison"]').click();
      const opts = page.locator('[data-spending-by-tag-target="comparisonOptions"]');
      await expect(opts).toBeVisible();
      await expect(page.locator('[data-spending-by-tag-target="comparePrev"]')).toBeVisible();
      await expect(page.locator('[data-spending-by-tag-target="includeYtd"]')).toBeVisible();
    });

    test('Back to Reports link works', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_tag`);
      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(1000);
      await page.click('a:has-text("Back to Reports")');
      await expect(page.locator('h1:has-text("Reports")')).toBeVisible();
    });

    test('Spending by Tag report route is accessible', async ({ page }) => {
      const response = await page.goto(`${BASE}/reports/spending_by_tag`);
      expect(response.status()).toBe(200);
      await expect(page.locator('[data-spending-by-tag-target="optionsModal"] h3')).toHaveText('Spending by Tag');
    });

    // --- Dashboard Tag Filter ---

    test('Dashboard has tag filter button', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      const btn = page.locator('[data-dashboard-target="tagFilterBtn"]');
      await expect(btn).toBeVisible();
      await expect(btn).toContainText('Filter by Tag');
    });

    test('Tag filter dropdown opens on click', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(1000);
      const btn = page.locator('[data-dashboard-target="tagFilterBtn"]');
      await btn.click();
      const dropdown = page.locator('[data-dashboard-target="tagFilterDropdown"]');
      await expect(dropdown).toBeVisible();
    });

    test('Tag filter dropdown has Clear button', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(1000);
      await page.locator('[data-dashboard-target="tagFilterBtn"]').click();
      const dropdown = page.locator('[data-dashboard-target="tagFilterDropdown"]');
      await expect(dropdown.locator('button:has-text("Clear")')).toBeVisible();
    });

    test('Tag checkboxes load in dropdown', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(2000);
      await page.locator('[data-dashboard-target="tagFilterBtn"]').click();
      const list = page.locator('[data-dashboard-target="tagCheckboxList"]');
      // Should have checkboxes (at least one tag) or "No tags yet"
      const checkboxes = await list.locator('input[type="checkbox"]').count();
      const noTags = await list.locator('text=No tags yet').count();
      expect(checkboxes + noTags).toBeGreaterThan(0);
    });

    // --- Release Notes ---

    test('Release notes mention CM-2 tag enhancements', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Spending by Tag');
      await expect(page.locator('body')).toContainText('Tag filter dropdown');
    });
  });
}
