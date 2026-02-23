// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USER1_EMAIL = 'elijahburrup323@gmail.com';
const USER1_PASS = 'Eli624462!';
const USER2_EMAIL = 'djburrup@gmail.com';
const USER2_PASS = 'luckydjb';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay if present
  const gotItBtn = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotItBtn.click();
  }
}

test.describe('Account 1 verification', () => {
  test('Login, dashboard, reports, recurring obligations full flow', async ({ page }) => {
    // Login
    await login(page, USER1_EMAIL, USER1_PASS);
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard has content
    await expect(page.locator('body')).not.toBeEmpty();
    const profileBtn = page.locator('[data-controller="dropdown"]').first();
    await expect(profileBtn).toBeVisible({ timeout: 5000 });

    // Navigate to Reports
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Recurring Obligations', { timeout: 10000 });

    // Click the Recurring Obligations report card link
    const reportLink = page.locator('a[href*="recurring_obligations"]').first();
    await expect(reportLink).toBeVisible({ timeout: 5000 });
    await reportLink.click();
    await page.waitForLoadState('networkidle');

    // Options modal should appear
    const modal = page.locator('[data-recurring-obligations-target="optionsModal"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Include Inactive Obligations')).toBeVisible();

    // Run the report
    await page.click('button:has-text("Run Report")');
    await page.waitForTimeout(3000);

    // Content should render
    await expect(page.locator('h1:has-text("Recurring Obligations")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-recurring-obligations-target="statCount"]')).toBeVisible();
    await expect(page.locator('[data-recurring-obligations-target="statAmount"]')).toBeVisible();

    // Print and Change Options buttons
    await expect(page.locator('button:has-text("Print")')).toBeVisible();
    await expect(page.locator('button:has-text("Change Options")')).toBeVisible();

    // Change Options re-opens modal
    await page.click('button:has-text("Change Options")');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Regression: check other pages
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Payments', { timeout: 10000 });

    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Accounts', { timeout: 10000 });
  });

  test('Verify no JS console errors on report page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await login(page, USER1_EMAIL, USER1_PASS);
    await page.goto(`${BASE}/reports/recurring_obligations`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Run Report")');
    await page.waitForTimeout(3000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('DevTools') && !e.includes('net::ERR')
    );
    expect(criticalErrors).toEqual([]);
  });
});

test.describe('Account 2 verification', () => {
  test('Login and run Recurring Obligations report', async ({ page }) => {
    await login(page, USER2_EMAIL, USER2_PASS);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${BASE}/reports/recurring_obligations`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Recurring Obligations').first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Run Report")');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1:has-text("Recurring Obligations")')).toBeVisible({ timeout: 5000 });
  });
});
