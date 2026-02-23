const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
}

// Tab links are inside the sticky header div, not the sidebar nav
const TAB_CONTAINER = '.sticky a[data-turbo-action="replace"]';

test.describe('Post-Deploy: Deposits Tab Navigation — CM-022226-04', () => {
  test.setTimeout(180000);

  test('Account 1 can login (djburrup)', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('Account 2 can login (elijah)', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('Deposits page has tabs (Deposits + Recurring)', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/income_entries`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Page should show "Deposits" heading
    await expect(page.locator('body')).toContainText('Deposits');

    // Tab links inside sticky header
    const tabLinks = page.locator(TAB_CONTAINER);
    const tabCount = await tabLinks.count();
    console.log('Tab links in sticky header:', tabCount);
    expect(tabCount).toBe(2);

    // First tab = Deposits (active), Second = Recurring
    const depositsTab = tabLinks.nth(0);
    const recurringTab = tabLinks.nth(1);

    await expect(depositsTab).toBeVisible();
    await expect(recurringTab).toBeVisible();
    console.log('Both tabs visible');

    // Deposits tab should be active (brand border)
    const depositsClass = await depositsTab.getAttribute('class');
    expect(depositsClass).toContain('border-brand-600');
    console.log('Deposits tab is active');

    await page.screenshot({ path: 'tests/screenshots/deposits-tab-active.png', fullPage: true });

    // Click Recurring tab
    await recurringTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should navigate to recurring deposits
    await expect(page.locator('body')).toContainText('Deposit Sources');

    // Recurring tab should now be active
    const tabLinksAfter = page.locator(TAB_CONTAINER);
    const recurringTabAfter = tabLinksAfter.nth(1);
    const recurringClass = await recurringTabAfter.getAttribute('class');
    expect(recurringClass).toContain('border-brand-600');
    console.log('Recurring tab is active after click');

    await page.screenshot({ path: 'tests/screenshots/deposits-recurring-tab-active.png', fullPage: true });

    // Click Deposits tab to go back
    const depositsTabBack = tabLinksAfter.nth(0);
    await depositsTabBack.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should be back on Deposits
    await expect(page.locator('body')).toContainText('Add Deposit');
    console.log('Navigated back to Deposits tab');
  });

  test('Recurring Deposits has sortable headers', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/income_recurrings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check sortable headers exist
    const sortHeaders = page.locator('[data-income-recurrings-target="sortHeader"]');
    const headerCount = await sortHeaders.count();
    console.log('Sortable headers:', headerCount);
    expect(headerCount).toBeGreaterThanOrEqual(6);

    // Verify tabs present on recurring page too
    const tabLinks = page.locator(TAB_CONTAINER);
    expect(await tabLinks.count()).toBe(2);

    await page.screenshot({ path: 'tests/screenshots/deposits-recurring-sortable.png', fullPage: true });
  });

  test('Regression: Dashboard loads', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('Regression: Payments loads', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Payment');
  });
});
