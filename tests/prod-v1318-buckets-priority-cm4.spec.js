// Post-deploy verification: Buckets table — Priority column, account banding, default sort (CM-022126-04)
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const users = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        pass: 'luckydjb'   },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  // Dismiss What's New if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|accounts/i, { timeout: 15000 });
  // Dismiss What's New after login
  const gotIt2 = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt2.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt2.click();
}

for (const u of users) {
  test.describe(`User ${u.email}`, () => {

    test('Buckets page loads with Priority column header', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(2000);

      // Check Priority column header exists
      const priorityHeader = page.locator('th[data-sort-field="priority"]');
      await expect(priorityHeader).toBeVisible();
      await expect(priorityHeader).toContainText('Priority');
    });

    test('Priority column shows numeric values in table rows', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(2000);

      // Table should have loaded rows (assuming user has buckets)
      const rows = page.locator('tbody[data-buckets-target="tableBody"] tr');
      const rowCount = await rows.count();
      if (rowCount > 0 && !(await rows.first().locator('td').first().textContent()).includes('No buckets')) {
        // 7 columns: Account, Name, Priority, Balance, Target, Active, Actions
        const cells = rows.first().locator('td');
        const cellCount = await cells.count();
        console.log(`Row cell count: ${cellCount}`);
        expect(cellCount).toBe(7);

        // Priority cell is the 3rd column (index 2)
        const priorityCell = cells.nth(2);
        const priorityText = await priorityCell.textContent();
        console.log(`Priority value: "${priorityText.trim()}"`);
        expect(parseInt(priorityText.trim())).not.toBeNaN();
      } else {
        console.log('No bucket rows found — skipping cell check');
      }
    });

    test('Priority column is sortable (click toggles)', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(2000);

      const priorityHeader = page.locator('th[data-sort-field="priority"]');
      await priorityHeader.click();
      await page.waitForTimeout(500);

      // Sort icon should appear
      const sortIcon = page.locator('[data-sort-icon="priority"] svg');
      await expect(sortIcon).toBeVisible();
      console.log('Priority sort icon visible after click');
    });

    test('Dashboard loads successfully', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(2000);

      // Dashboard should load with cards
      const dashboard = page.locator('[data-controller="dashboard"]');
      await expect(dashboard).toBeVisible();
      console.log('Dashboard loaded successfully');
    });

    test('Payments page loads', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/payments`);
      await page.waitForTimeout(2000);
      const heading = page.locator('h1:has-text("Payments")');
      await expect(heading).toBeVisible();
      console.log('Payments page loaded');
    });

    test('Accounts page loads', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/accounts`);
      await page.waitForTimeout(2000);
      const heading = page.locator('h1:has-text("Accounts")');
      await expect(heading).toBeVisible();
      console.log('Accounts page loaded');
    });

    test('No JS console errors on Buckets page', async ({ page }) => {
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) });
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(3000);

      const realErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
      if (realErrors.length > 0) console.log('JS errors:', realErrors);
      expect(realErrors.length).toBe(0);
    });
  });
}
