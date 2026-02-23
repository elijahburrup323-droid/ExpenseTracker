// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Reports Sticky Header CM-6 — ${user.email}`, () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', user.email);
      await page.fill('input[name="user[password]"]', user.password);
      await Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }
    });

    test('Reports page loads with h1 heading', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      await expect(page.locator('h1:has-text("Reports")')).toBeVisible();
    });

    test('Reports header has sticky class', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      // The sticky div is an ancestor of h1 with these specific classes
      const stickyDiv = page.locator('div.sticky.top-14.z-20:has(h1:has-text("Reports"))');
      await expect(stickyDiv).toBeVisible();
      const classes = await stickyDiv.getAttribute('class');
      expect(classes).toContain('sticky');
      expect(classes).toContain('top-14');
      expect(classes).toContain('z-20');
    });

    test('Reports header stays visible after scroll', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      await page.locator('h1:has-text("Reports")').waitFor({ state: 'visible' });
      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
      // Header should still be visible
      await expect(page.locator('h1:has-text("Reports")')).toBeVisible();
    });

    test('Reports header has border and shadow styling', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      const stickyDiv = page.locator('.sticky.top-14.z-20').first();
      const classes = await stickyDiv.getAttribute('class');
      expect(classes).toContain('border-b');
      expect(classes).toContain('shadow-sm');
    });

    test('Report cards grid is visible below header', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      await expect(page.locator('[data-reports-target="cardsGrid"]')).toBeVisible();
    });

    test('Month label is in sticky header', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      const stickyDiv = page.locator('.sticky.top-14.z-20').first();
      // Should contain the calendar icon and month text
      const svgIcon = stickyDiv.locator('svg');
      await expect(svgIcon.first()).toBeVisible();
    });

    test('Release notes mention CM-6 sticky header', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Reports Menu header made sticky');
      await expect(page.locator('body')).toContainText('CM-6');
    });
  });
}
