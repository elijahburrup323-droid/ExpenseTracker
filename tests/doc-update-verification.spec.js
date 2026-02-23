// Verify documentation pages render correctly after updates
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

test.describe('Documentation Update Verification', () => {
  test('database schema page renders income_recurrings with timestamps', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/database-schema`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1.text-2xl')).toHaveText('Database Schema');

    // Find income_recurrings table and verify it has created_at/updated_at
    const recurringsCard = page.locator('.mb-6:has(h2:has-text("income_recurrings"))');
    await expect(recurringsCard.locator('td.font-mono:has-text("created_at")')).toBeVisible();
    await expect(recurringsCard.locator('td.font-mono:has-text("updated_at")')).toBeVisible();
  });

  test('database schema page renders income_entries with timestamps', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/database-schema`);
    await page.waitForLoadState('networkidle');

    const entriesCard = page.locator('.mb-6:has(h2:has-text("income_entries"))');
    await expect(entriesCard.locator('td.font-mono:has-text("created_at")')).toBeVisible();
    await expect(entriesCard.locator('td.font-mono:has-text("updated_at")')).toBeVisible();
  });

  test('deployment runbook shows ~2 minutes deploy time', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/deployment-runbook`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1.text-2xl')).toHaveText('Deployment Runbook');
    await expect(page.locator('strong:has-text("~2 minutes")')).toBeVisible();
  });

  test('database visualization legend shows Accounts', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/database-visualization`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1.text-2xl')).toHaveText('Database Visualization');
    // Verify the Accounts legend entry is visible and has no orange dot
    const accountsLegend = page.locator('div.flex.items-center:has-text("Accounts")').first();
    await expect(accountsLegend).toBeVisible();
    // Ensure no orange-500 dot exists (was changed to green-600)
    await expect(accountsLegend.locator('span.bg-orange-500')).not.toBeVisible();
  });

  test('test coverage page renders expanded screen coverage matrix', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/test-coverage`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1.text-2xl')).toHaveText('Test Coverage Report');

    // Verify new screens appear in the matrix
    const matrix = page.locator('table');
    await expect(matrix.locator('td:has-text("DBU")')).toBeVisible();
    await expect(matrix.locator('td:has-text("Transfers")')).toBeVisible();
    await expect(matrix.locator('td:has-text("Quotes")')).toBeVisible();
    await expect(matrix.locator('td:has-text("Open Month")')).toBeVisible();
    await expect(matrix.locator('td:has-text("Frequencies")')).toBeVisible();
    await expect(matrix.locator('td:has-text("Account Types")')).toBeVisible();
  });
});
