// Post-deploy verification for v1.3.11 — CM-16, CM-20, Quotes CM-2, Dashboard CM-3
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

    test('Version check — v1.3.11', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const footer = page.locator('p:has-text("v1.3.11")');
      await expect(footer).toBeVisible({ timeout: 10000 });
    });

    test('CM-16: Acct Type Masters has slider toggle (admin only)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_type_masters`);
      await page.waitForLoadState('networkidle');

      // Check page loaded — should have table body target
      const tableBody = page.locator('[data-account-type-masters-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 10000 });

      // Check for slider toggle (role=switch) instead of badge buttons
      const toggles = page.locator('button[role="switch"]');
      const count = await toggles.count();
      expect(count).toBeGreaterThan(0);

      // First toggle should have aria-checked attribute
      const first = toggles.first();
      const ariaChecked = await first.getAttribute('aria-checked');
      expect(['true', 'false']).toContain(ariaChecked);
    });

    test('CM-20: Acct Type Masters shows Description column', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_type_masters`);
      await page.waitForLoadState('networkidle');

      // Description header should exist
      const descHeader = page.locator('th:has-text("Description")');
      await expect(descHeader).toBeVisible({ timeout: 10000 });

      // Key header should NOT exist
      const keyHeader = page.locator('th:has-text("Key")');
      await expect(keyHeader).not.toBeVisible();
    });

    test('Quotes CM-2: Sortable column headers exist', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/quotes`);
      await page.waitForLoadState('networkidle');

      // Table body should be visible
      const tableBody = page.locator('[data-quotes-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 10000 });

      // Sort icon targets should exist for all three columns
      const sortIcons = page.locator('[data-quotes-target="sortIcon"]');
      const count = await sortIcons.count();
      expect(count).toBe(3);

      // Headers should be clickable (have data-action)
      const quoteHeader = page.locator('th[data-sort-key="quote_text"]');
      await expect(quoteHeader).toBeVisible();
      const authorHeader = page.locator('th[data-sort-key="quote_author"]');
      await expect(authorHeader).toBeVisible();
      const activeHeader = page.locator('th[data-sort-key="is_active"]');
      await expect(activeHeader).toBeVisible();
    });

    test('Quotes CM-2: Default sort is Active desc with arrow icon', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/quotes`);
      await page.waitForLoadState('networkidle');

      // Wait for data to load
      const tableBody = page.locator('[data-quotes-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Active column should have a sort arrow (SVG inside the sort icon span)
      const activeSortIcon = page.locator('[data-quotes-target="sortIcon"][data-sort-key="is_active"] svg');
      await expect(activeSortIcon).toBeVisible({ timeout: 5000 });

      // Other columns should not have sort arrows
      const quoteSortIcon = page.locator('[data-quotes-target="sortIcon"][data-sort-key="quote_text"] svg');
      await expect(quoteSortIcon).not.toBeVisible();
    });

    test('Quotes CM-2: Click Quote header to sort by quote text', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/quotes`);
      await page.waitForLoadState('networkidle');

      const tableBody = page.locator('[data-quotes-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Click Quote header
      await page.locator('th[data-sort-key="quote_text"]').click();
      await page.waitForTimeout(500);

      // Quote column should now have sort arrow
      const quoteSortIcon = page.locator('[data-quotes-target="sortIcon"][data-sort-key="quote_text"] svg');
      await expect(quoteSortIcon).toBeVisible({ timeout: 5000 });

      // Active column should no longer have sort arrow
      const activeSortIcon = page.locator('[data-quotes-target="sortIcon"][data-sort-key="is_active"] svg');
      await expect(activeSortIcon).not.toBeVisible();
    });

    test('Dashboard CM-3: Dashboard cards grid renders', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      // Already on dashboard after login

      // Cards grid should be present with slot wrappers
      const grid = page.locator('[data-dashboard-target="cardsGrid"]');
      await expect(grid).toBeVisible({ timeout: 10000 });

      // Slot wrappers should exist (drag-and-drop targets)
      const slots = page.locator('[data-dashboard-target="slotWrapper"]');
      const count = await slots.count();
      expect(count).toBeGreaterThan(0);
    });

    test('No JS errors on dashboard', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });

  });
}
