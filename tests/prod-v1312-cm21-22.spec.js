// Post-deploy verification for v1.3.12 — CM-21 (User Menu), CM-22 (Reports Menu)
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        pass: 'luckydjb'   },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try {
    await gotIt.waitFor({ state: 'visible', timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch (e) { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Version check — v1.3.12', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const footer = page.locator('p:has-text("v1.3.12")');
      await expect(footer).toBeVisible({ timeout: 10000 });
    });

    test('CM-21: User dropdown does NOT show Soft Close items', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      // Open the user dropdown — target sidebar-specific one (inside <aside>)
      const userBtn = page.locator('aside button[data-action="click->dropdown#toggle"]');
      await userBtn.click();
      await page.waitForTimeout(500);

      // Settings should be visible (proves dropdown is open)
      const settings = page.locator('aside [data-dropdown-target="menu"] >> text=Settings');
      await expect(settings).toBeVisible({ timeout: 5000 });

      // Soft Close items should NOT be present
      const softClose = page.locator('aside [data-dropdown-target="menu"] >> text=Soft Close');
      await expect(softClose).not.toBeVisible();
      const openSoftClose = page.locator('aside [data-dropdown-target="menu"] >> text=Open Soft Close');
      await expect(openSoftClose).not.toBeVisible();
    });

    test('CM-21: Soft Close still accessible from sidebar Monthly group', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      // Look for Soft Close Month in sidebar nav
      const softCloseLink = page.locator('nav a:has-text("Soft Close Month")');
      await expect(softCloseLink).toBeVisible({ timeout: 10000 });
    });

    test('CM-22: Sidebar has Monthly > Reports link', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      // Reports link should be in sidebar
      const reportsLink = page.locator('nav a:has-text("Reports")');
      await expect(reportsLink).toBeVisible({ timeout: 10000 });
    });

    test('CM-22: Reports page loads with 9 cards', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      // Page title
      const title = page.locator('h2:has-text("Reports")');
      await expect(title).toBeVisible({ timeout: 10000 });

      // 9 report cards
      const cards = page.locator('[data-reports-target="cardWrapper"]');
      await expect(cards).toHaveCount(9, { timeout: 10000 });
    });

    test('CM-22: Report cards have category badges', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      // Check specific categories exist
      const cashFlow = page.locator('[data-reports-target="cardWrapper"] >> text=Cash Flow');
      await expect(cashFlow.first()).toBeVisible({ timeout: 10000 });

      const spending = page.locator('[data-reports-target="cardWrapper"] >> text=Spending');
      expect(await spending.count()).toBeGreaterThanOrEqual(2);  // Two spending reports
    });

    test('CM-22: Report cards have drag handles', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      const handles = page.locator('.drag-handle');
      await expect(handles).toHaveCount(9, { timeout: 10000 });
    });

    test('CM-22: Month display shows on Reports page', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      // Should show month label (e.g., "February 2026")
      const monthLabel = page.locator('text=2026');
      await expect(monthLabel.first()).toBeVisible({ timeout: 10000 });
    });

    test('No JS errors on Reports page', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports`);
      await page.waitForTimeout(3000);
      expect(errors).toEqual([]);
    });

  });
}
