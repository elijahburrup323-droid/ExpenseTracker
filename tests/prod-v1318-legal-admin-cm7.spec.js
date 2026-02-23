// Post-deploy verification for CM-022126-07: Admin Legal Page Maintenance
// Tests: admin nav links, legal admin screens, public section rendering, API CRUD
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const CREDS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, cred) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', cred.email);
  await page.fill('input[name="user[password]"]', cred.password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const cred of CREDS) {
  test.describe(`Account: ${cred.email}`, () => {

    test('Dashboard loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await expect(page.locator('[data-controller="dashboard"]')).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
    });

    test('Admin nav has Terms Maint. and Privacy Maint. links', async ({ page }) => {
      await login(page, cred);
      // The links exist in the DOM even if the Admin group is collapsed
      const termsMaint = page.locator('a[href*="/admin/legal/terms"]');
      const privacyMaint = page.locator('a[href*="/admin/legal/privacy"]');
      await expect(termsMaint).toHaveCount(1, { timeout: 5000 });
      await expect(privacyMaint).toHaveCount(1, { timeout: 5000 });
      // Verify correct href
      expect(await termsMaint.getAttribute('href')).toContain('/admin/legal/terms');
      expect(await privacyMaint.getAttribute('href')).toContain('/admin/legal/privacy');
    });

    test('Terms Maint. admin page loads with table', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/admin/legal/terms`);
      await expect(page.locator('[data-controller="legal-page-admin"]')).toBeVisible({ timeout: 10000 });
      // Should show table with sections
      await expect(page.locator('th:has-text("Section Title")')).toBeVisible();
      await expect(page.locator('h1:has-text("Maintenance")')).toBeVisible();
      // Wait for sections to load from API
      await page.waitForTimeout(2000);
      // Check table has rows (sections were seeded)
      const rows = page.locator('[data-legal-page-admin-target="tableBody"] tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });

    test('Privacy Maint. admin page loads with table', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/admin/legal/privacy`);
      await expect(page.locator('[data-controller="legal-page-admin"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('th:has-text("Section Title")')).toBeVisible();
      // Wait for sections to load
      await page.waitForTimeout(2000);
      const rows = page.locator('[data-legal-page-admin-target="tableBody"] tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });

    test('Add Section modal opens and closes', async ({ page }) => {
      await login(page, cred);
      await page.goto(`${BASE}/admin/legal/terms`);
      await page.waitForTimeout(2000);
      // Click Add Section button
      await page.click('button:has-text("Add Section")');
      // Modal should be visible
      const modal = page.locator('[data-legal-page-admin-target="modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(page.locator('h3:has-text("Add Section")')).toBeVisible();
      // Click Cancel
      await page.click('[data-legal-page-admin-target="modal"] button:has-text("Cancel")');
      await expect(modal).toBeHidden();
    });

    test('Active toggle switches exist on section rows', async ({ page }) => {
      await login(page, cred);
      await page.goto(`${BASE}/admin/legal/terms`);
      await page.waitForTimeout(2000);
      // Check for toggle buttons with role="switch"
      const toggles = page.locator('[data-legal-page-admin-target="tableBody"] button[role="switch"]');
      const count = await toggles.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Preview button links to public legal page', async ({ page }) => {
      await login(page, cred);
      await page.goto(`${BASE}/admin/legal/terms`);
      const previewLink = page.locator('a:has-text("Preview")');
      await expect(previewLink).toBeVisible({ timeout: 5000 });
      const href = await previewLink.getAttribute('href');
      expect(href).toContain('/pages/terms');
    });

    test('Public Terms of Service renders sections from database', async ({ page }) => {
      await page.goto(`${BASE}/pages/terms`);
      await expect(page.locator('h1:has-text("Terms of Service")')).toBeVisible({ timeout: 10000 });
      // Should have numbered section headings from database sections
      const sections = page.locator('h2[id^="section-"]');
      const count = await sections.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Public Privacy Policy renders sections from database', async ({ page }) => {
      await page.goto(`${BASE}/pages/privacy`);
      await expect(page.locator('h1:has-text("Privacy Policy")')).toBeVisible({ timeout: 10000 });
      const sections = page.locator('h2[id^="section-"]');
      const count = await sections.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Legal admin API returns JSON sections', async ({ page }) => {
      await login(page, cred);
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/legal_pages/terms/sections`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: res.status, data: await res.json() };
      }, BASE);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('section_title');
      expect(response.data[0]).toHaveProperty('section_number');
      expect(response.data[0]).toHaveProperty('is_active');
    });

    test('Version shows SEQ 28', async ({ page }) => {
      await login(page, cred);
      // Check the version in the footer or page source
      const content = await page.content();
      expect(content).toContain('1.3.18');
    });

    test('Release notes include CM-022126-07 entries', async ({ page }) => {
      await login(page, cred);
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('text=Legal Page Maintenance')).toBeVisible({ timeout: 10000 });
    });

    // Regression tests
    test('Payments page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/payments`);
      await expect(page.locator('[data-controller="payments"]')).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
    });

    test('Buckets page loads with Priority column', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/buckets`);
      await expect(page.locator('[data-controller="buckets"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('th:has-text("Priority")')).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('Reports page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/reports`);
      await expect(page.locator('[data-controller="reports"]')).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
    });
  });
}
