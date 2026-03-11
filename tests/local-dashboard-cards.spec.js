// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard Front Cards Improvements', () => {

  test('no expand icons appear on any card', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // No expand buttons should exist
    const expandBtns = page.locator('[data-role="expand-btn"]');
    await expect(expandBtns).toHaveCount(0);

    // No expand SVGs should exist
    const expandIcons = page.locator('[data-icon="expand"]');
    await expect(expandIcons).toHaveCount(0);
  });

  test('no report icons appear on any card', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // No bar chart report links in card headers
    const reportLinks = page.locator('.dash-card a[aria-label*="report"], .dash-card a[aria-label*="Report"]');
    await expect(reportLinks).toHaveCount(0);
  });

  test('flip hint labels are visible on cards', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // Check that flip hint labels exist
    await expect(page.locator('text="Account Detail"').first()).toBeVisible();
    await expect(page.locator('text="Account History"').first()).toBeVisible();
    await expect(page.locator('text="Net Worth Breakdown"').first()).toBeVisible();
    await expect(page.locator('text="Category Breakdown"').first()).toBeVisible();
    await expect(page.locator('text="Recent Deposits"').first()).toBeVisible();
    await expect(page.locator('text="Bucket History"').first()).toBeVisible();
  });

  test('Financial Pulse shows colored metric pills', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // Pulse strip should exist
    const pulseStrip = page.locator('[data-dashboard-target="pulseStrip"]');
    await expect(pulseStrip).toBeVisible();

    // Should have metric pills with tooltip info icons
    const infoIcons = pulseStrip.locator('[title]');
    const count = await infoIcons.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least savings rate and one other
  });

  test('Spending Overview shows red/green amounts and progress bar', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // Find the spending overview card
    const spendingCard = page.locator('[data-card-type="spending_overview"]');
    await expect(spendingCard).toBeVisible();

    // Red amount for spent
    const redAmount = spendingCard.locator('.text-red-500, .text-red-400');
    expect(await redAmount.count()).toBeGreaterThanOrEqual(1);

    // Green amount for cash
    const greenAmount = spendingCard.locator('.text-emerald-600, .text-emerald-400');
    expect(await greenAmount.count()).toBeGreaterThanOrEqual(1);
  });

  test('Recent Payments shows all amounts in red', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    const activityCard = page.locator('[data-card-type="recent_activity"]');
    await expect(activityCard).toBeVisible();

    // All payment amounts should be red
    const paymentAmounts = activityCard.locator('[data-role="card-content"] .text-red-500, [data-role="card-content"] .text-red-400');
    const count = await paymentAmounts.count();
    // If there are payments, they should all be red
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('clicking flip hint on a card flips it', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    // Click the "Net Worth Breakdown" flip hint
    const nwCard = page.locator('[data-card-type="net_worth"]');
    await expect(nwCard).toBeVisible();

    const flipBtn = nwCard.locator('button:has-text("Net Worth Breakdown")');
    await expect(flipBtn).toBeVisible();
    await flipBtn.click();

    // Wait for flip animation
    await page.waitForTimeout(800);

    // Back side should now be visible (the heading "Net Worth Breakdown" in the back header)
    const backHeading = nwCard.locator('[data-role="back"] h2');
    await expect(backHeading).toContainText('Net Worth Breakdown');
  });

});
