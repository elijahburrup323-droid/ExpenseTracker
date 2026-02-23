const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle' });
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay
  try {
    const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
    await gotIt.click({ timeout: 3000 });
  } catch (e) { /* no overlay */ }
}

async function logout(page) {
  // Click profile dropdown then sign out
  try {
    await page.locator('[data-action*="dropdown"]').first().click({ timeout: 3000 });
    await page.locator('a:has-text("Sign Out"), a[href*="sign_out"]').first().click({ timeout: 3000 });
    await page.waitForURL(/sign_in/, { timeout: 10000 });
  } catch (e) {
    await page.goto(`${BASE}/users/sign_out`, { waitUntil: 'networkidle' });
  }
}

test.describe('v1.3.13 CM-23 Post-Deploy Verification', () => {

  test('Account 1 (Elijah) - Dashboard, Reports, Reports Maintenance', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');

    // Dashboard loads
    await expect(page.locator('h2, h1').filter({ hasText: /Dashboard|Hello/ }).first()).toBeVisible({ timeout: 10000 });

    // Navigate to Reports
    await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2:has-text("Reports")')).toBeVisible({ timeout: 10000 });
    // Verify report cards are present
    const cards = page.locator('[data-report-key]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const cardCount = await cards.count();
    console.log(`Report cards visible: ${cardCount}`);
    expect(cardCount).toBeGreaterThanOrEqual(9);

    // Navigate to Reports Maintenance (admin)
    await page.goto(`${BASE}/reports_masters`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Reports Maintenance")')).toBeVisible({ timeout: 10000 });

    // Wait for table to load (async JS fetch)
    await page.waitForTimeout(2000);
    const rows = page.locator('[data-reports-masters-target="tableBody"] tr');
    const rowCount = await rows.count();
    console.log(`Reports Maintenance table rows: ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(9);

    // Verify API returns data
    const apiData = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/reports_masters`, { headers: { Accept: 'application/json' } });
      return res.json();
    }, BASE);
    console.log(`API reports_masters count: ${apiData.length}`);
    expect(apiData.length).toBeGreaterThanOrEqual(9);

    // Verify slot count badge
    const slotBadge = page.locator('[data-reports-masters-target="slotCount"]');
    await expect(slotBadge).toHaveText('9', { timeout: 5000 });

    // Regression: Payments page
    await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Payments"), h2:has-text("Payments")').first()).toBeVisible({ timeout: 10000 });

    // Regression: Accounts page
    await page.goto(`${BASE}/accounts`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Accounts"), h2:has-text("Accounts")').first()).toBeVisible({ timeout: 10000 });

    await logout(page);
  });

  test('Account 2 (DJ) - Dashboard, Reports with icons, Reports Maintenance', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');

    // Dashboard loads
    await expect(page.locator('h2, h1').filter({ hasText: /Dashboard|Hello/ }).first()).toBeVisible({ timeout: 10000 });

    // Navigate to Reports
    await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2:has-text("Reports")')).toBeVisible({ timeout: 10000 });

    // Verify cards have icons rendered (data-icon-key elements should have SVG children)
    await page.waitForTimeout(1500);
    const iconContainers = page.locator('[data-icon-key]');
    const iconCount = await iconContainers.count();
    console.log(`Icon containers: ${iconCount}`);
    expect(iconCount).toBeGreaterThanOrEqual(9);

    // Check first icon has SVG content
    const firstIcon = iconContainers.first();
    const svgContent = await firstIcon.locator('svg').count();
    console.log(`First icon has SVG: ${svgContent > 0}`);
    expect(svgContent).toBeGreaterThan(0);

    // Navigate to Reports Maintenance
    await page.goto(`${BASE}/reports_masters`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Reports Maintenance")')).toBeVisible({ timeout: 10000 });

    // Regression: Payments
    await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Payments"), h2:has-text("Payments")').first()).toBeVisible({ timeout: 10000 });

    await logout(page);
  });
});
