const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USER = { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' };

// iPad viewport sizes
const IPAD_PORTRAIT = { width: 768, height: 1024 };
const IPAD_LANDSCAPE = { width: 1024, height: 768 };

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(2000);
}

async function checkNoHorizontalScroll(page, label) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const hasHScroll = scrollWidth > clientWidth + 5; // 5px tolerance
  console.log(`${label}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, hasHScroll=${hasHScroll}`);
  return !hasHScroll;
}

test.describe('Mobile Responsive Audit', () => {

  test('Recurring Transfers — iPad Portrait', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_PORTRAIT });
    const page = await context.newPage();
    await login(page, USER);
    await page.goto(`${BASE}/recurring_transfers`);
    await page.waitForTimeout(3000);

    // No horizontal scroll
    const noHScroll = await checkNoHorizontalScroll(page, 'RecurringTransfers-portrait');
    expect(noHScroll).toBe(true);

    // Tabs should be visible
    const tabBar = page.locator('.sticky .flex.space-x-6');
    await expect(tabBar).toBeVisible();

    // Add button should be visible and have good touch target
    const addBtn = page.locator('[data-recurring-transfers-target="addButton"]');
    await expect(addBtn).toBeVisible();
    const btnBox = await addBtn.boundingBox();
    expect(btnBox.height).toBeGreaterThanOrEqual(36); // Close to 44px target
    console.log(`RecurringTransfers-portrait: Add button height=${btnBox.height}`);

    await page.screenshot({ path: 'tests/screenshots/mobile-recurring-transfers-portrait.png', fullPage: true });

    await page.screenshot({ path: 'tests/screenshots/mobile-recurring-transfers-portrait-detail.png', fullPage: false });
    await context.close();
  });

  test('Recurring Transfers — iPad Landscape', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_LANDSCAPE });
    const page = await context.newPage();
    await login(page, USER);
    await page.goto(`${BASE}/recurring_transfers`);
    await page.waitForTimeout(3000);

    const noHScroll = await checkNoHorizontalScroll(page, 'RecurringTransfers-landscape');
    expect(noHScroll).toBe(true);

    await page.screenshot({ path: 'tests/screenshots/mobile-recurring-transfers-landscape.png', fullPage: true });
    await context.close();
  });

  test('Transfers with tabs — iPad Portrait', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_PORTRAIT });
    const page = await context.newPage();
    await login(page, USER);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForTimeout(3000);

    const noHScroll = await checkNoHorizontalScroll(page, 'Transfers-portrait');
    expect(noHScroll).toBe(true);

    // Tabs should be visible
    const tabBar = page.locator('.sticky .flex.space-x-6');
    await expect(tabBar).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/mobile-transfers-tabs-portrait.png', fullPage: true });
    await context.close();
  });

  test('Dashboard Spending Overview — iPad Portrait', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_PORTRAIT });
    const page = await context.newPage();
    await login(page, USER);
    await page.waitForTimeout(3000);

    const noHScroll = await checkNoHorizontalScroll(page, 'Dashboard-portrait');
    expect(noHScroll).toBe(true);

    // Flip spending card
    const flipBtn = page.locator('[aria-label="View spending by category"]');
    if (await flipBtn.count() > 0) {
      await flipBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'tests/screenshots/mobile-dashboard-spending-portrait.png', fullPage: false });
    await context.close();
  });

  test('Dashboard Spending Overview — iPad Landscape', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_LANDSCAPE });
    const page = await context.newPage();
    await login(page, USER);
    await page.waitForTimeout(3000);

    const noHScroll = await checkNoHorizontalScroll(page, 'Dashboard-landscape');
    expect(noHScroll).toBe(true);

    const flipBtn = page.locator('[aria-label="View spending by category"]');
    if (await flipBtn.count() > 0) {
      await flipBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'tests/screenshots/mobile-dashboard-spending-landscape.png', fullPage: false });
    await context.close();
  });

  test('Buckets — iPad Portrait', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_PORTRAIT });
    const page = await context.newPage();
    await login(page, USER);
    await page.goto(`${BASE}/buckets`);
    await page.waitForTimeout(3000);

    const noHScroll = await checkNoHorizontalScroll(page, 'Buckets-portrait');
    expect(noHScroll).toBe(true);

    await page.screenshot({ path: 'tests/screenshots/mobile-buckets-portrait.png', fullPage: true });
    await context.close();
  });

  test('Accounts — iPad Portrait', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_PORTRAIT });
    const page = await context.newPage();
    await login(page, USER);
    await page.goto(`${BASE}/accounts`);
    await page.waitForTimeout(3000);

    // Check the table wrapper has overflow-x-auto (allows internal scroll without body scroll)
    const tableWrapper = page.locator('.overflow-x-auto').first();
    const wrapperExists = await tableWrapper.count();
    console.log(`Accounts-portrait: overflow-x-auto wrapper exists: ${wrapperExists > 0}`);
    expect(wrapperExists).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/screenshots/mobile-accounts-portrait.png', fullPage: true });
    await context.close();
  });

  test('SS Benefit Planner — iPad Portrait', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: IPAD_PORTRAIT });
    const page = await context.newPage();
    await login(page, USER);
    await page.goto(`${BASE}/social_security_planner`);
    await page.waitForTimeout(3000);

    const noHScroll = await checkNoHorizontalScroll(page, 'SSBP-portrait');
    expect(noHScroll).toBe(true);

    await page.screenshot({ path: 'tests/screenshots/mobile-ssbp-portrait.png', fullPage: true });
    await context.close();
  });
});
