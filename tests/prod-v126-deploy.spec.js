// Production verification for v1.2.6 deployment
const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq-o8hn.onrender.com/mybudgethq';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState('networkidle');
  // Dismiss What's New overlay if present
  const overlay = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overlay.click();
    await page.waitForTimeout(500);
  }
  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill('djburrup@gmail.com');
  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill('luckydjb');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(5000);
  // Dismiss What's New overlay if present after login
  const overlay2 = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await overlay2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await overlay2.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Production v1.2.6 — djburrup account', () => {
  test('Version is 1.2.6', async ({ page }) => {
    await login(page);
    const body = await page.textContent('body');
    expect(body).toContain('1.2.6');
  });

  test('Dashboard loads all 6 cards', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page.locator('h2:has-text("Spending Overview")')).toBeVisible();
    await expect(page.locator('h2:has-text("Accounts")').first()).toBeVisible();
    await expect(page.locator('h2:has-text("Net Worth")')).toBeVisible();
    await expect(page.locator('h2:has-text("Income & Spending")')).toBeVisible();
    await expect(page.locator('h2:has-text("Recent Activity")')).toBeVisible();
    await expect(page.locator('h2:has-text("Buckets")')).toBeVisible();
  });

  test('Dashboard API returns accounts_overview and net_worth_overview', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    const response = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/dashboard/card_data`, {
        headers: { 'Accept': 'application/json' }
      });
      return res.json();
    }, BASE);

    expect(response).toHaveProperty('accounts_overview');
    expect(response).toHaveProperty('net_worth_overview');
    expect(response.accounts_overview).toHaveProperty('accounts');
    expect(response.accounts_overview).toHaveProperty('total');
    expect(response.net_worth_overview).toHaveProperty('value');
    expect(typeof response.income_spending.beginning_balance).toBe('number');
  });

  test('Dashboard month navigation updates Card 2', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const card2Front = page.locator('[data-dashboard-target="card2FrontContent"]');
    await expect(card2Front).toBeVisible();

    // Click prev month
    await page.locator('[data-action="click->dashboard#prevMonth"]').first().click();
    await page.waitForTimeout(3000);

    // Card 2 should still have Accounts heading and Total
    const html = await card2Front.innerHTML();
    expect(html).toContain('Accounts');
    expect(html).toContain('Total:');
  });

  test('Payments page loads with current month date filter', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const startDate = page.locator('[data-payments-target="filterStartDate"]');
    const endDate = page.locator('[data-payments-target="filterEndDate"]');
    await expect(startDate).toBeVisible();
    await expect(endDate).toBeVisible();

    // Start date should be first of current month
    const startVal = await startDate.inputValue();
    expect(startVal).toMatch(/^\d{4}-\d{2}-01$/);

    // End date should be today
    const endVal = await endDate.inputValue();
    const today = new Date().toISOString().split('T')[0];
    expect(endVal).toBe(today);
  });

  test('Upload button visible for non-admin user on Payments page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Upload button should now be visible for all users (not just admin)
    const uploadBtn = page.locator('button:has-text("Upload")');
    await expect(uploadBtn).toBeVisible();

    // Generate Data button should NOT be visible for non-admin
    const generateBtn = page.locator('button:has-text("Generate Data")');
    await expect(generateBtn).not.toBeVisible();
  });

  test('DBU Schema Inspector shows Schema: public', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Switch to Schema Inspector
    await page.locator('[data-dbu-target="tabSchema"]').click();
    await page.waitForTimeout(3000);

    // Schema meta should show "Schema: public"
    const schemaMeta = page.locator('[data-dbu-target="schemaMeta"]');
    await expect(schemaMeta).toContainText('Schema:');
    await expect(schemaMeta).toContainText('public');
  });
});
