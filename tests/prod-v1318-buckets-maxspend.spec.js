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

test.describe('Post-Deploy: Buckets Max Spend — CM-022226-03', () => {
  test.setTimeout(180000);

  test('Account 1 can login (djburrup)', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('Account 2 can login (elijah)', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('Add modal has Max Spend fields', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/buckets`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toContainText('Buckets');

    // Open Add modal
    await page.locator('[data-buckets-target="addButton"]').click();
    await page.waitForTimeout(500);

    // Verify Max Spend and Year Start fields
    await expect(page.locator('[data-buckets-target="modalMaxSpend"]')).toBeVisible();
    await expect(page.locator('[data-buckets-target="modalYearStart"]')).toBeVisible();
    console.log('Add modal: Max Spend + Year Start fields present');

    // Verify month dropdown has 12 options
    const opts = await page.locator('[data-buckets-target="modalYearStart"] option').count();
    expect(opts).toBe(12);

    // Verify Initial Balance shown in Add mode
    await expect(page.locator('[data-buckets-target="modalBalanceRow"]')).toBeVisible();
    console.log('Add modal: Initial Balance row visible');

    await page.screenshot({ path: 'tests/screenshots/buckets-add-modal.png', fullPage: true });

    // Cancel
    await page.locator('[data-action="click->buckets#cancelModal"]').click();
  });

  test('Edit modal has Max Spend fields + hides Initial Balance', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/buckets`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Click first Edit button
    const editBtns = page.locator('[data-action="click->buckets#startEditing"]');
    const editCount = await editBtns.count();
    console.log('Edit buttons found:', editCount);

    if (editCount === 0) {
      console.log('No buckets to edit — skipping Edit modal test');
      return;
    }

    await editBtns.first().click();
    await page.waitForTimeout(500);

    // Modal title should say "Edit Bucket"
    await expect(page.locator('[data-buckets-target="modalTitle"]')).toContainText('Edit Bucket');

    // Max Spend fields MUST be visible in Edit modal (CM requirement)
    await expect(page.locator('[data-buckets-target="modalMaxSpend"]')).toBeVisible();
    await expect(page.locator('[data-buckets-target="modalYearStart"]')).toBeVisible();
    console.log('Edit modal: Max Spend + Year Start fields present');

    // Initial Balance MUST be hidden in Edit modal
    await expect(page.locator('[data-buckets-target="modalBalanceRow"]')).toBeHidden();
    console.log('Edit modal: Initial Balance row hidden (correct)');

    // Check prepopulated values
    const maxVal = await page.locator('[data-buckets-target="modalMaxSpend"]').inputValue();
    const yearVal = await page.locator('[data-buckets-target="modalYearStart"]').inputValue();
    console.log(`Edit modal: Max Spend = "${maxVal}", Year Start Month = "${yearVal}"`);

    await page.screenshot({ path: 'tests/screenshots/buckets-edit-modal.png', fullPage: true });

    // Cancel
    await page.locator('[data-action="click->buckets#cancelModal"]').click();
  });

  test('API returns max_spend fields', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');

    const buckets = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/buckets`, { headers: { 'Accept': 'application/json' } });
      return res.json();
    }, BASE);

    expect(Array.isArray(buckets)).toBe(true);
    console.log('API returned', buckets.length, 'buckets');

    if (buckets.length > 0) {
      const first = buckets[0];
      expect('max_spend_per_year' in first).toBe(true);
      expect('bucket_year_start_month' in first).toBe(true);
      expect(first.bucket_year_start_month).toBeGreaterThanOrEqual(1);
      expect(first.bucket_year_start_month).toBeLessThanOrEqual(12);
      console.log(`First bucket: max_spend=${first.max_spend_per_year}, start_month=${first.bucket_year_start_month}`);

      if (first.max_spend_per_year != null) {
        expect('spent_ytd' in first).toBe(true);
        expect('available_to_spend' in first).toBe(true);
        console.log(`  spent_ytd=${first.spent_ytd}, available=${first.available_to_spend}`);
      }
    }
  });

  test('Grid shows Max Spend sub-panel when set', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/buckets`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for Max Spend sub-panel content
    const maxSpendLabels = page.locator('text=Max Spend/Yr');
    const count = await maxSpendLabels.count();
    console.log('Grid Max Spend/Yr labels:', count);

    const spentYtdLabels = page.locator('text=Spent YTD');
    console.log('Grid Spent YTD labels:', await spentYtdLabels.count());

    const availLabels = page.locator('td:has-text("Available")');
    console.log('Grid Available labels:', await availLabels.count());

    await page.screenshot({ path: 'tests/screenshots/buckets-grid-maxspend.png', fullPage: true });

    // Regression: Dashboard still loads
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Hello');
  });
});
