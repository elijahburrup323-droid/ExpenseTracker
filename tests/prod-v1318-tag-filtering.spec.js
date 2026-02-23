// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle' });
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const account of ACCOUNTS) {
  test.describe(`Tag Filtering Reports — ${account.email}`, () => {
    test.beforeEach(async ({ page }) => {
      await login(page, account.email, account.password);
    });

    // ----- Spending by Category -----
    test('Spending by Category — tag filter visible in modal', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_category`, { waitUntil: 'networkidle' });
      const modal = page.locator('[data-spending-by-category-target="optionsModal"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      const tagContainer = page.locator('[data-spending-by-category-target="tagFilterContainer"]');
      await expect(tagContainer).toBeVisible();
      await page.waitForTimeout(2000);
      const containerText = await tagContainer.textContent();
      expect(containerText).not.toContain('Loading tags...');
    });

    test('Spending by Category — Run Report without tags works', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_category`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-spending-by-category-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.click('button:has-text("Run Report")');
      await expect(page.locator('[data-spending-by-category-target="summaryBody"]')).toBeVisible({ timeout: 10000 });
      const banner = page.locator('[data-spending-by-category-target="appliedTagsBanner"]');
      const bannerHtml = await banner.innerHTML();
      expect(bannerHtml.trim()).toBe('');
    });

    test('Spending by Category — tag filter with selection shows banner', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_category`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-spending-by-category-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      const checkboxes = page.locator('[data-spending-by-category-target="tagFilterContainer"] input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 0) {
        await checkboxes.first().check();
        await page.click('button:has-text("Run Report")');
        const banner = page.locator('[data-spending-by-category-target="appliedTagsBanner"]');
        await expect(banner).toBeVisible({ timeout: 10000 });
        expect(await banner.innerHTML()).toContain('Tags:');
      } else {
        await page.click('button:has-text("Run Report")');
        await expect(page.locator('[data-spending-by-category-target="summaryBody"]')).toBeVisible({ timeout: 10000 });
      }
    });

    // ----- Spending by Type -----
    test('Spending by Type — tag filter visible and Run Report works', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_type`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-spending-by-type-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      const tagContainer = page.locator('[data-spending-by-type-target="tagFilterContainer"]');
      await expect(tagContainer).toBeVisible();
      await page.waitForTimeout(2000);
      expect(await tagContainer.textContent()).not.toContain('Loading tags...');
      await page.click('button:has-text("Run Report")');
      await expect(page.locator('[data-spending-by-type-target="summaryBody"]')).toBeVisible({ timeout: 10000 });
    });

    test('Spending by Type — tag filter with selection shows banner', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_type`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-spending-by-type-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      const checkboxes = page.locator('[data-spending-by-type-target="tagFilterContainer"] input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 0) {
        await checkboxes.first().check();
        await page.click('button:has-text("Run Report")');
        const banner = page.locator('[data-spending-by-type-target="appliedTagsBanner"]');
        await expect(banner).toBeVisible({ timeout: 10000 });
        expect(await banner.innerHTML()).toContain('Tags:');
      } else {
        await page.click('button:has-text("Run Report")');
        await expect(page.locator('[data-spending-by-type-target="summaryBody"]')).toBeVisible({ timeout: 10000 });
      }
    });

    // ----- Monthly Cash Flow -----
    test('Monthly Cash Flow — tag filter visible and Run Report works', async ({ page }) => {
      await page.goto(`${BASE}/reports/monthly_cash_flow`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-monthly-cash-flow-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      const tagContainer = page.locator('[data-monthly-cash-flow-target="tagFilterContainer"]');
      await expect(tagContainer).toBeVisible();
      await page.waitForTimeout(2000);
      expect(await tagContainer.textContent()).not.toContain('Loading tags...');
      await page.click('button:has-text("Run Report")');
      await expect(page.locator('[data-monthly-cash-flow-target="summaryBody"]')).toBeVisible({ timeout: 10000 });
    });

    test('Monthly Cash Flow — tag filter with selection shows banner', async ({ page }) => {
      await page.goto(`${BASE}/reports/monthly_cash_flow`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-monthly-cash-flow-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      const checkboxes = page.locator('[data-monthly-cash-flow-target="tagFilterContainer"] input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 0) {
        await checkboxes.first().check();
        await page.click('button:has-text("Run Report")');
        const banner = page.locator('[data-monthly-cash-flow-target="appliedTagsBanner"]');
        await expect(banner).toBeVisible({ timeout: 10000 });
        expect(await banner.innerHTML()).toContain('Tags:');
      } else {
        await page.click('button:has-text("Run Report")');
        await expect(page.locator('[data-monthly-cash-flow-target="summaryBody"]')).toBeVisible({ timeout: 10000 });
      }
    });

    // ----- Income by Source -----
    test('Income by Source — tag filter visible and Run Report works', async ({ page }) => {
      await page.goto(`${BASE}/reports/income_by_source`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-income-by-source-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      const tagContainer = page.locator('[data-income-by-source-target="tagFilterContainer"]');
      await expect(tagContainer).toBeVisible();
      await page.waitForTimeout(2000);
      expect(await tagContainer.textContent()).not.toContain('Loading tags...');
      await page.click('button:has-text("Run Report")');
      await expect(page.locator('[data-income-by-source-target="tableBody"]')).toBeVisible({ timeout: 10000 });
    });

    test('Income by Source — tag filter with selection shows banner', async ({ page }) => {
      await page.goto(`${BASE}/reports/income_by_source`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-income-by-source-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      const checkboxes = page.locator('[data-income-by-source-target="tagFilterContainer"] input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 0) {
        await checkboxes.first().check();
        await page.click('button:has-text("Run Report")');
        const banner = page.locator('[data-income-by-source-target="appliedTagsBanner"]');
        await expect(banner).toBeVisible({ timeout: 10000 });
        expect(await banner.innerHTML()).toContain('Tags:');
      } else {
        await page.click('button:has-text("Run Report")');
        await expect(page.locator('[data-income-by-source-target="tableBody"]')).toBeVisible({ timeout: 10000 });
      }
    });

    // ----- Structural reports should NOT have tag filter -----
    test('Net Worth report does NOT have tag filter', async ({ page }) => {
      await page.goto(`${BASE}/reports/net_worth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      expect(await page.locator('text=Filter by Tags').count()).toBe(0);
    });

    // ----- Change Options re-renders with selections preserved -----
    test('Spending by Category — Change Options preserves tag selections', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_category`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-spending-by-category-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      const checkboxes = page.locator('[data-spending-by-category-target="tagFilterContainer"] input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 0) {
        await checkboxes.first().check();
        await page.click('button:has-text("Run Report")');
        await page.waitForTimeout(2000);
        await page.click('button:has-text("Change Options")');
        await expect(page.locator('[data-spending-by-category-target="optionsModal"]')).toBeVisible({ timeout: 5000 });
        const refreshed = page.locator('[data-spending-by-category-target="tagFilterContainer"] input[type="checkbox"]').first();
        expect(await refreshed.isChecked()).toBe(true);
      }
    });

    // ----- Comparison mode works -----
    test('Spending by Category — Comparison mode with tags works', async ({ page }) => {
      await page.goto(`${BASE}/reports/spending_by_category`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-spending-by-category-target="optionsModal"]')).toBeVisible({ timeout: 10000 });
      await page.click('input[value="comparison"]');
      // Wait for comparison options to appear
      await expect(page.locator('[data-spending-by-category-target="comparisonOptions"]')).toBeVisible({ timeout: 3000 });
      await page.click('button:has-text("Run Report")');
      // Wait for the comparison header to render with Var columns (API response needed)
      const summaryHead = page.locator('[data-spending-by-category-target="summaryHead"]');
      await expect(summaryHead).toContainText('Var', { timeout: 15000 });
    });
  });
}
