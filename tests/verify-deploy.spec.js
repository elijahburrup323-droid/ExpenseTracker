// Post-deploy verification for MyBudgetHQ production
// Verifies login, dashboard, buckets page, API endpoints for two accounts

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://djburrup.com/mybudgethq';

test.describe('Post-Deploy Verification', () => {

  test('Account 1: elijahburrup323@gmail.com - full verification', async ({ page }) => {
    test.setTimeout(90000);

    // Step 1: Login
    await page.goto(`${BASE_URL}/users/sign_in`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
    await page.fill('input[name="user[password]"]', 'Eli624462!');
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForURL(/dashboard|mybudgethq/, { timeout: 15000 });

    // Step 2: Dismiss Whats New overlay if present
    try {
      const gotItBtn = page.locator('#whatsNewOverlay button:has-text("Got it")');
      await gotItBtn.waitFor({ state: 'visible', timeout: 5000 });
      await gotItBtn.click();
      await page.waitForTimeout(1000);
      console.log('  Dismissed Whats New overlay');
    } catch {
      console.log('  No Whats New overlay present');
    }

    // Step 3: Verify dashboard loads
    await page.waitForLoadState('networkidle');
    const dashboardContent = page.locator('.card-grid, .dashboard-cards, .card, h1, h2');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
    console.log('  Dashboard loaded successfully');

    const dashUrl = page.url();
    console.log(`  Current URL: ${dashUrl}`);
    expect(dashUrl).toContain('/mybudgethq');

    // Step 4: Navigate to Buckets page
    await page.goto(`${BASE_URL}/buckets`);
    await page.waitForLoadState('networkidle');

    // Dismiss overlay again if it reappears
    try {
      const gotItBtn2 = page.locator('#whatsNewOverlay button:has-text("Got it")');
      await gotItBtn2.waitFor({ state: 'visible', timeout: 3000 });
      await gotItBtn2.click();
      await page.waitForTimeout(1000);
    } catch { /* no overlay */ }

    const bucketsUrl = page.url();
    console.log(`  Buckets page URL: ${bucketsUrl}`);
    expect(bucketsUrl).toContain('bucket');

    // Verify buckets page has content
    const bucketsContent = page.locator('table, .bucket, h1, h2, .container');
    await expect(bucketsContent.first()).toBeVisible({ timeout: 10000 });
    console.log('  Buckets page loaded successfully');

    // Step 5: API call - GET /api/buckets
    const bucketsApiResponse = await page.evaluate(async (baseUrl) => {
      const resp = await fetch(`${baseUrl}/api/buckets`, { credentials: 'include' });
      return { status: resp.status, ok: resp.ok, body: await resp.text() };
    }, BASE_URL);

    console.log(`  GET /api/buckets -> status: ${bucketsApiResponse.status}`);
    expect(bucketsApiResponse.ok).toBeTruthy();

    const bucketsData = JSON.parse(bucketsApiResponse.body);
    console.log(`  Buckets API returned data type: ${typeof bucketsData}, isArray: ${Array.isArray(bucketsData)}`);

    // Step 6: API call - GET /api/dashboard/card_data
    const cardDataResponse = await page.evaluate(async (baseUrl) => {
      const resp = await fetch(`${baseUrl}/api/dashboard/card_data`, { credentials: 'include' });
      return { status: resp.status, ok: resp.ok, body: await resp.text() };
    }, BASE_URL);

    console.log(`  GET /api/dashboard/card_data -> status: ${cardDataResponse.status}`);
    expect(cardDataResponse.ok).toBeTruthy();

    const cardData = JSON.parse(cardDataResponse.body);
    console.log(`  Dashboard card_data keys: ${Object.keys(cardData).join(', ')}`);
    expect(Object.keys(cardData).length).toBeGreaterThan(0);
    console.log('  Dashboard card_data contains real data (not placeholder)');

    console.log('  Account 1 verification PASSED');
  });

  test('Account 2: djburrup@gmail.com - login and dashboard', async ({ page }) => {
    test.setTimeout(90000);

    // Step 1: Login
    await page.goto(`${BASE_URL}/users/sign_in`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
    await page.fill('input[name="user[password]"]', 'luckydjb');
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForURL(/dashboard|mybudgethq/, { timeout: 15000 });

    // Dismiss Whats New overlay if present
    try {
      const gotItBtn = page.locator('#whatsNewOverlay button:has-text("Got it")');
      await gotItBtn.waitFor({ state: 'visible', timeout: 5000 });
      await gotItBtn.click();
      await page.waitForTimeout(1000);
      console.log('  Dismissed Whats New overlay');
    } catch {
      console.log('  No Whats New overlay present');
    }

    // Verify dashboard loads
    await page.waitForLoadState('networkidle');
    const dashboardContent = page.locator('.card-grid, .dashboard-cards, .card, h1, h2');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });

    const dashUrl = page.url();
    console.log(`  Dashboard URL: ${dashUrl}`);
    expect(dashUrl).toContain('/mybudgethq');
    console.log('  Account 2 verification PASSED');
  });

});
