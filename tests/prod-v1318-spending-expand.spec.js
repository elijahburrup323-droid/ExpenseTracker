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

test('Dashboard loads and spending card has flip button', async ({ page }) => {
  await login(page);
  // Find the spending_overview card
  const spendingCard = page.locator('[data-card-type="spending_overview"]');
  await expect(spendingCard).toBeVisible({ timeout: 10000 });
  // Flip button should exist
  const flipBtn = spendingCard.locator('button[aria-label="View spending by category"]');
  await expect(flipBtn).toBeVisible();
});

test('Flip spending card and verify expand button on back', async ({ page }) => {
  await login(page);
  const spendingCard = page.locator('[data-card-type="spending_overview"]');
  await expect(spendingCard).toBeVisible({ timeout: 10000 });

  // Click flip
  await spendingCard.locator('button[aria-label="View spending by category"]').click({ force: true });
  await page.waitForTimeout(1000);

  // Expand button should exist on back side
  const expandBtn = spendingCard.locator('[data-role="expand-btn"]');
  await expect(expandBtn).toHaveCount(1);
});

test('No JS errors on dashboard', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await login(page);
  await page.waitForTimeout(3000);
  expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
});
