const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' }
];

test.describe('Post-Deploy: Legal Admin + Login Verification', () => {
  test.setTimeout(180000);

  for (const user of USERS) {
    test(`Login + dashboard check (${user.email})`, async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 120000 });
      await page.fill('input[name="user[email]"]', user.email);
      await page.fill('input[name="user[password]"]', user.password);
      await page.click('input[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 30000 });

      // Dismiss What's New
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      // Dashboard has data
      await expect(page.locator('body')).not.toBeEmpty();
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('Hello');

      // Check navigation works
      await page.locator('.sidebar-link, nav a').first().waitFor({ timeout: 5000 });
    });
  }

  test('Terms Maint data binding fix (admin)', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
    await page.fill('input[name="user[password]"]', 'luckydjb');
    await page.click('input[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 30000 });

    const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
    if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotIt.click();
    }

    // --- Terms Maintenance ---
    await page.goto(`${BASE}/admin/legal/terms`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Table has data
    let rowCount = await page.locator('[data-legal-page-admin-target="tableBody"] tr').count();
    console.log('Terms rows:', rowCount);
    expect(rowCount).toBeGreaterThan(1);

    // Edit modal pre-populates body
    const editBtn = page.locator('[data-action="click->legal-page-admin#openEditModal"]').first();
    await editBtn.click();
    await page.waitForTimeout(1500);

    const modalVisible = await page.locator('[data-legal-page-admin-target="modal"]').isVisible();
    expect(modalVisible).toBe(true);

    // Check title pre-populated
    const title = await page.locator('[data-legal-page-admin-target="modalTitle2"]').inputValue();
    expect(title).toBeTruthy();
    console.log('Edit modal title:', title);

    // Check body has content — either in Quill or in HTML textarea
    const quillHtml = await page.locator('[data-legal-page-admin-target="quillEditor"]').innerHTML();
    const textareaVal = await page.locator('[data-legal-page-admin-target="modalBody"]').inputValue();
    const bodyContent = quillHtml.length > 20 ? quillHtml : textareaVal;
    console.log('Body content length:', bodyContent.length);
    console.log('Body snippet:', bodyContent.substring(0, 100));
    expect(bodyContent.length).toBeGreaterThan(10);

    await page.screenshot({ path: 'tests/screenshots/legal-edit-fix-verified.png', fullPage: true });

    // Close modal
    await page.locator('[data-action="click->legal-page-admin#closeModal"]').click();

    // --- Privacy Maintenance ---
    await page.goto(`${BASE}/admin/legal/privacy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    rowCount = await page.locator('[data-legal-page-admin-target="tableBody"] tr').count();
    console.log('Privacy rows:', rowCount);
    expect(rowCount).toBeGreaterThan(1);

    // --- Regression: Payments page ---
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const paymentsBody = await page.locator('body').textContent();
    expect(paymentsBody).toContain('Payment');

    // --- Regression: Public Terms page ---
    await page.goto(`${BASE}/pages/terms`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const termsContent = await page.locator('body').textContent();
    expect(termsContent).toContain('Terms of Service');
    expect(termsContent).toContain('Acceptance');
    await page.screenshot({ path: 'tests/screenshots/legal-public-terms.png', fullPage: true });
  });
});
