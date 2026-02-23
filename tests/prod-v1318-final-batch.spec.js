const { test, expect } = require('@playwright/test');
const BASE = 'https://djburrup.com/mybudgethq';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
  await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
  await page.fill('input[name="user[password]"]', 'luckydjb');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/i, { timeout: 15000 });
}

// CM-10: "In Spending Overview" rename
test('Accounts header reads "In Spending Overview"', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/accounts`);
  await page.waitForTimeout(2000);
  const header = page.locator('th:has-text("In Spending Overview")');
  await expect(header).toBeVisible({ timeout: 10000 });
});

// CM-12: Transfers sortable headers
test('Transfers page has sortable Date header', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/transfer_masters`);
  await page.waitForTimeout(2000);
  const header = page.locator('th[data-sort-field="date"]');
  await expect(header).toBeVisible({ timeout: 10000 });
  await header.click();
  await page.waitForTimeout(500);
  const icon = page.locator('[data-sort-icon="date"] svg');
  await expect(icon).toBeVisible();
});

// CM-14: Reconciliation page loads
test('Reconciliation page loads without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await login(page);
  await page.goto(`${BASE}/account_reconciliation`);
  await page.waitForTimeout(3000);
  expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
});

// CM-SS1: Social Security Planner accessible
test('SS Benefit Planner page loads', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`);
  await page.waitForTimeout(2000);
  const h1 = page.locator('h1:has-text("Social Security Benefit Planner")');
  await expect(h1).toBeVisible({ timeout: 10000 });
});

// CM-SS1: SS Planner has expected sections
test('SS Planner has Assumptions, You, Strategy Summary sections', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`);
  await page.waitForTimeout(2000);
  await expect(page.locator('h2:has-text("Assumptions")')).toBeVisible();
  await expect(page.locator('h2:has-text("You")')).toBeVisible();
  await expect(page.locator('h2:has-text("Strategy Summary")')).toBeVisible();
});

// CM-SS1: SS Planner menu item exists in sidebar
test('SS Benefit Planner in user menu', async ({ page }) => {
  await login(page);
  const menuItem = page.locator('a:has-text("SS Benefit Planner")');
  await expect(menuItem.first()).toBeVisible({ timeout: 10000 });
});

// No JS errors on SS Planner
test('No JS errors on SS Planner page', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await login(page);
  await page.goto(`${BASE}/social_security_planner`);
  await page.waitForTimeout(3000);
  expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
});

// No JS errors on dashboard
test('No JS errors on dashboard after all changes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await login(page);
  await page.waitForTimeout(3000);
  expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
});
