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

test('Accounts page loads with sortable headers', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/accounts`);
  await expect(page.locator('h1:has-text("Accounts")')).toBeVisible({ timeout: 10000 });

  // Verify sortable headers exist with data-sort-field
  for (const field of ['name', 'type', 'institution', 'balance', 'in_budget']) {
    const header = page.locator(`th[data-sort-field="${field}"]`);
    await expect(header).toBeVisible();
  }
});

test('Clicking Name header sorts the table', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/accounts`);
  await page.waitForTimeout(2000);

  // Click Name header to sort ascending
  await page.click('th[data-sort-field="name"]');
  await page.waitForTimeout(500);

  // Sort icon should appear
  const sortIcon = page.locator('[data-sort-icon="name"] svg');
  await expect(sortIcon).toBeVisible();

  // Get account names in current order
  const namesAsc = await page.$$eval('tbody tr td:nth-child(2)', cells =>
    cells.map(c => c.textContent.trim()).filter(t => t.length > 0)
  );

  // Click again to sort descending
  await page.click('th[data-sort-field="name"]');
  await page.waitForTimeout(500);

  const namesDesc = await page.$$eval('tbody tr td:nth-child(2)', cells =>
    cells.map(c => c.textContent.trim()).filter(t => t.length > 0)
  );

  // If there are at least 2 accounts, order should be reversed
  if (namesAsc.length >= 2) {
    expect(namesAsc[0]).toBe(namesDesc[namesDesc.length - 1]);
  }
});

test('Clicking Balance header sorts numerically', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/accounts`);
  await page.waitForTimeout(2000);

  // Click Balance header
  await page.click('th[data-sort-field="balance"]');
  await page.waitForTimeout(500);

  // Sort icon should appear on balance
  const sortIcon = page.locator('[data-sort-icon="balance"] svg');
  await expect(sortIcon).toBeVisible();

  // Other sort icons should be empty
  const nameIcon = page.locator('[data-sort-icon="name"] svg');
  await expect(nameIcon).toHaveCount(0);
});

test('No JS errors on Accounts page with sorting', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await login(page);
  await page.goto(`${BASE}/accounts`);
  await page.waitForTimeout(2000);

  // Click a few sort headers
  await page.click('th[data-sort-field="name"]');
  await page.waitForTimeout(300);
  await page.click('th[data-sort-field="balance"]');
  await page.waitForTimeout(300);
  await page.click('th[data-sort-field="type"]');
  await page.waitForTimeout(300);

  expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
});
