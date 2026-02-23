// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USER1_EMAIL = 'elijahburrup323@gmail.com';
const USER1_PASS = 'Eli624462!';
const USER2_EMAIL = 'djburrup@gmail.com';
const USER2_PASS = 'luckydjb';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay if present
  const gotItBtn = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotItBtn.click();
  }
}

test.describe('Account 1 - Category Auto-Tags', () => {
  test('Dashboard loads, spending categories page loads with tags UI', async ({ page }) => {
    await login(page, USER1_EMAIL, USER1_PASS);
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to Spending Categories
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Spending Categories")')).toBeVisible({ timeout: 10000 });

    // Table should load with categories
    await page.waitForTimeout(2000);
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    // Click Edit on first category to verify tags UI in modal
    const editBtn = page.locator('button[title="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Modal should appear with "Default Tags" label
    await expect(page.locator('text=Default Tags')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Tags auto-applied to new payments')).toBeVisible();

    // Tags search input should be present
    const tagsInput = page.locator('input[placeholder="Search or create tags..."]').first();
    await expect(tagsInput).toBeVisible();

    // Close modal via Escape key (more reliable than clicking Cancel with multiple modals)
    await page.keyboard.press('Escape');
  });

  test('Spending categories API returns default_tag_ids', async ({ page }) => {
    await login(page, USER1_EMAIL, USER1_PASS);

    // Fetch categories via API and check for default_tag_ids field
    const response = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/spending_categories`, {
        headers: { 'Accept': 'application/json' }
      });
      return res.json();
    }, BASE);

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBeGreaterThan(0);

    // Every category should have default_tag_ids field
    for (const cat of response) {
      expect(cat).toHaveProperty('default_tag_ids');
      expect(Array.isArray(cat.default_tag_ids)).toBe(true);
    }
  });

  test('Payment modal has category tag prompt element', async ({ page }) => {
    await login(page, USER1_EMAIL, USER1_PASS);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');

    // Click Add Payment to open modal
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    // The category tag prompt should exist (hidden by default)
    const prompt = page.locator('[data-payments-target="categoryTagPrompt"]');
    await expect(prompt).toBeHidden();

    // Tags input should be present
    await expect(page.locator('[data-payments-target="modalTagsInput"]')).toBeVisible();
  });

  test('Regression: other pages still work', async ({ page }) => {
    await login(page, USER1_EMAIL, USER1_PASS);

    // Payments page
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Payments', { timeout: 10000 });

    // Accounts page
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Accounts', { timeout: 10000 });

    // Dashboard
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    const profileBtn = page.locator('[data-controller="dropdown"]').first();
    await expect(profileBtn).toBeVisible({ timeout: 5000 });
  });

  test('No JS console errors on spending categories page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await login(page, USER1_EMAIL, USER1_PASS);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('DevTools') && !e.includes('net::ERR')
    );
    expect(criticalErrors).toEqual([]);
  });
});

test.describe('Account 2 - Category Auto-Tags', () => {
  test('Login and verify spending categories page', async ({ page }) => {
    await login(page, USER2_EMAIL, USER2_PASS);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Spending Categories")')).toBeVisible({ timeout: 10000 });

    // Verify table loads
    await page.waitForTimeout(2000);
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });
});
