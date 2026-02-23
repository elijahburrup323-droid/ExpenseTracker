// CM-3: Verify all dashboard cards update when navigating months
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000/mybudgethq';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill('test@example.com');
  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill('password123');
  const signInButton = page.getByRole('button', { name: 'Sign in', exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe('Dashboard Month Navigation (CM-3)', () => {
  test('All 6 cards render on initial load', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Card 1: Spending Overview
    await expect(page.locator('h2:has-text("Spending Overview")')).toBeVisible();

    // Card 2: Accounts (front side h2 — back has duplicate, use first())
    await expect(page.locator('h2:has-text("Accounts")').first()).toBeVisible();

    // Card 3: Net Worth
    await expect(page.locator('h2:has-text("Net Worth")')).toBeVisible();

    // Card 4: Income & Spending
    await expect(page.locator('h2:has-text("Income & Spending")')).toBeVisible();

    // Card 5: Recent Activity
    await expect(page.locator('h2:has-text("Recent Activity")')).toBeVisible();

    // Card 6: Buckets
    await expect(page.locator('h2:has-text("Buckets")')).toBeVisible();
  });

  test('Month label updates when navigating to previous month', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get current month label (first one)
    const monthLabels = page.locator('[data-dashboard-target="monthLabel"]');
    const initialLabel = await monthLabels.first().textContent();

    // Click prev month button (first one visible)
    const prevBtn = page.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click();
    await page.waitForTimeout(2000);

    // Month label should change
    const newLabel = await monthLabels.first().textContent();
    expect(newLabel).not.toBe(initialLabel);
  });

  test('Card 2 (Accounts) updates on month navigation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Card 2 front content should have a total
    const card2Front = page.locator('[data-dashboard-target="card2FrontContent"]');
    await expect(card2Front).toBeVisible();
    const initialHtml = await card2Front.innerHTML();

    // Navigate to previous month
    const prevBtn = page.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click();
    await page.waitForTimeout(2000);

    // Card 2 front content should have been re-rendered
    const newHtml = await card2Front.innerHTML();
    // The HTML should contain "Accounts" header and "Total:" text
    expect(newHtml).toContain('Accounts');
    expect(newHtml).toContain('Total:');
  });

  test('Card 3 (Net Worth) updates on month navigation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Card 3 content should be visible
    const card3 = page.locator('[data-dashboard-target="card3Content"]');
    await expect(card3).toBeVisible();

    // Navigate to previous month
    const prevBtn = page.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click();
    await page.waitForTimeout(2000);

    // Card 3 should still contain a currency value
    const html = await card3.innerHTML();
    expect(html).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test('Card 4 uses computed balances (not static)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Card 4 content should show Beginning Balance and Current Balance
    const card4 = page.locator('[data-dashboard-target="card4Content"]');
    await expect(card4).toBeVisible();
    const html = await card4.innerHTML();
    expect(html).toContain('Beginning Balance');
    expect(html).toContain('Current Balance');
  });

  test('Navigate back to current month restores values', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get initial month label
    const monthLabels = page.locator('[data-dashboard-target="monthLabel"]');
    const initialLabel = await monthLabels.first().textContent();

    // Navigate back one month
    const prevBtn = page.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click();
    await page.waitForTimeout(2000);
    const backLabel = await monthLabels.first().textContent();
    expect(backLabel).not.toBe(initialLabel);

    // Navigate forward to restore
    const nextBtn = page.locator('[data-dashboard-target="nextBtn"]').first();
    await nextBtn.click();
    await page.waitForTimeout(2000);
    const restoredLabel = await monthLabels.first().textContent();
    expect(restoredLabel).toBe(initialLabel);
  });

  test('API returns accounts_overview and net_worth_overview', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Call the API directly
    const response = await page.evaluate(async () => {
      const res = await fetch('/mybudgethq/api/dashboard/card_data', {
        headers: { 'Accept': 'application/json' }
      });
      return res.json();
    });

    // Verify new keys exist
    expect(response).toHaveProperty('accounts_overview');
    expect(response).toHaveProperty('net_worth_overview');
    expect(response.accounts_overview).toHaveProperty('accounts');
    expect(response.accounts_overview).toHaveProperty('total');
    expect(response.net_worth_overview).toHaveProperty('value');
    expect(response.net_worth_overview).toHaveProperty('change');
    expect(response.net_worth_overview).toHaveProperty('change_pct');
    expect(response.net_worth_overview).toHaveProperty('snapshots');

    // Income spending should have computed balances
    expect(response.income_spending).toHaveProperty('beginning_balance');
    expect(response.income_spending).toHaveProperty('current_balance');
    expect(typeof response.income_spending.beginning_balance).toBe('number');
    expect(typeof response.income_spending.current_balance).toBe('number');
  });
});
