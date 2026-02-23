// Post-deploy: CM-022126-05 (AcctTypeMasters delete), CM-022126-06 (Transfers bucket badge), CM-022126-08 (SSBP PIA label + age format)
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const users = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        pass: 'luckydjb'   },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|accounts/i, { timeout: 15000 });
  const gotIt2 = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt2.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt2.click();
}

for (const u of users) {
  test.describe(`User ${u.email}`, () => {

    test('Dashboard loads', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-controller="dashboard"]')).toBeVisible();
      console.log('Dashboard OK');
    });

    test('Transfers page loads', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/transfers`);
      await page.waitForTimeout(2000);
      // Transfers uses data-controller="transfer-masters"
      await expect(page.locator('[data-controller="transfer-masters"]')).toBeVisible();
      console.log('Transfers page OK');
    });

    test('SSBP page loads with updated PIA label', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/social_security_planner`);
      await page.waitForTimeout(2000);
      await expect(page.locator('h1:has-text("Social Security Benefit Planner")')).toBeVisible();

      // Check updated PIA label (first one = You card)
      const piaLabel = page.locator('label:has-text("Benefit at Full Retirement Age")').first();
      await expect(piaLabel).toBeVisible();
      console.log('PIA label updated: Benefit at Full Retirement Age');
    });

    test('SSBP claim age rows in single-row grid format', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/social_security_planner`);
      await page.waitForTimeout(2000);

      // Check for Years/Months column headers
      const yearsHeader = page.locator('[data-ss-planner-target="yourClaimAgeList"] span:has-text("Years")');
      await expect(yearsHeader).toBeVisible();
      const monthsHeader = page.locator('[data-ss-planner-target="yourClaimAgeList"] span:has-text("Months")');
      await expect(monthsHeader).toBeVisible();
      console.log('Claim age grid headers visible');

      // Each row should have years and months selects on same line (grid layout)
      const gridRows = page.locator('[data-ss-planner-target="yourClaimAgeList"] .grid');
      const count = await gridRows.count();
      console.log(`Grid rows: ${count} (header + age rows)`);
      expect(count).toBeGreaterThanOrEqual(3); // header + 2 default ages
    });

    test('Payments page loads', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/payments`);
      await page.waitForTimeout(2000);
      await expect(page.locator('h1:has-text("Payments")')).toBeVisible();
      console.log('Payments OK');
    });

    test('Accounts page loads', async ({ page }) => {
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/accounts`);
      await page.waitForTimeout(2000);
      await expect(page.locator('h1:has-text("Accounts")')).toBeVisible();
      console.log('Accounts OK');
    });

    test('No JS errors on SSBP', async ({ page }) => {
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) });
      await login(page, u.email, u.pass);
      await page.goto(`${BASE}/social_security_planner`);
      await page.waitForTimeout(3000);
      const real = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
      if (real.length > 0) console.log('JS errors:', real);
      expect(real.length).toBe(0);
    });
  });
}
