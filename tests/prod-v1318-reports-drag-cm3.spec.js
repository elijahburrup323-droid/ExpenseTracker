// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Reports Drag CM-3 — ${user.email}`, () => {

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

    test('Reports page loads with card grid', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      await expect(page.locator('h2:has-text("Reports")')).toBeVisible();
      const grid = page.locator('[data-reports-target="cardsGrid"]');
      await expect(grid).toBeVisible();
      const cards = grid.locator('[data-reports-target="cardWrapper"]');
      expect(await cards.count()).toBeGreaterThan(0);
    });

    test('No drag handle icon on report cards', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      await page.waitForTimeout(1000);
      // The old drag-handle span should not exist
      const handles = page.locator('.drag-handle');
      expect(await handles.count()).toBe(0);
    });

    test('Report cards have slot and report-key data attributes', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      const cards = page.locator('[data-reports-target="cardWrapper"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const slot = await card.getAttribute('data-slot-number');
        const key = await card.getAttribute('data-report-key');
        expect(slot).toBeTruthy();
        expect(key).toBeTruthy();
      }
    });

    test('Report cards are interactive — View Report links work', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      const links = page.locator('[data-reports-target="cardWrapper"] a:has-text("View Report")');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      // Verify first link has an href
      const href = await links.first().getAttribute('href');
      expect(href).toBeTruthy();
    });

    test('Reorder API endpoint responds', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      const response = await page.evaluate(async (base) => {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        // Send an empty reorder — should at least respond (200 or 422)
        const res = await fetch(`${base}/api/reports/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': csrfToken || '',
          },
          body: JSON.stringify({ slots: [] }),
        });
        return { status: res.status };
      }, BASE);
      // Should respond (not 404/500)
      expect([200, 204, 400, 422]).toContain(response.status);
    });

    test('Release notes mention CM-3', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Drag-and-drop card reordering');
      await expect(page.locator('body')).toContainText('CM-3');
    });
  });
}
