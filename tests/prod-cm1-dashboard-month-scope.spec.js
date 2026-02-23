// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|mybudgethq/);
  // Dismiss What's New popup if present
  await page.evaluate(() => {
    const el = document.getElementById('whatsNewOverlay');
    if (el) el.remove();
  });
  await page.waitForTimeout(500);
}

for (const acct of ACCOUNTS) {
  test.describe(`CM-1 Dashboard month-scoping — ${acct.email}`, () => {
    test('Dashboard loads with correct version 1.2.4', async ({ page }) => {
      await login(page, acct.email, acct.password);
      const body = await page.content();
      expect(body).toContain('1.2.4');
    });

    test('Card 4 (Income & Spending) is visible with line items', async ({ page }) => {
      await login(page, acct.email, acct.password);
      const card4Heading = page.locator('h2:has-text("Income & Spending")');
      await expect(card4Heading).toBeVisible();
      await expect(page.locator('text=Beginning Balance').first()).toBeVisible();
      await expect(page.locator('text=Income').first()).toBeVisible();
      await expect(page.locator('text=Expenses').first()).toBeVisible();
      await expect(page.locator('text=Current Balance').first()).toBeVisible();
    });

    test('Card 5 (Recent Activity) is visible', async ({ page }) => {
      await login(page, acct.email, acct.password);
      const card5Heading = page.locator('h2:has-text("Recent Activity")');
      await expect(card5Heading).toBeVisible();
    });

    test('Month navigation prev/next works', async ({ page }) => {
      await login(page, acct.email, acct.password);

      // Get current month label
      const monthLabel = page.locator('[data-dashboard-target="monthLabel"]').first();
      const initialLabel = await monthLabel.textContent();

      // Use JavaScript to trigger the Stimulus controller prevMonth action directly
      await page.evaluate(() => {
        const el = document.querySelector('[data-controller="dashboard"]');
        const controller = window.Stimulus?.getControllerForElementAndIdentifier?.(el, 'dashboard');
        if (controller) {
          controller.prevMonth();
        } else {
          // Fallback: directly click with event
          document.querySelector('[data-action="click->dashboard#prevMonth"]')?.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
      await page.waitForTimeout(3000);

      const newLabel = await monthLabel.textContent();
      expect(newLabel).not.toBe(initialLabel);

      // Go back to original month
      await page.evaluate(() => {
        const el = document.querySelector('[data-controller="dashboard"]');
        const controller = window.Stimulus?.getControllerForElementAndIdentifier?.(el, 'dashboard');
        if (controller) {
          controller.nextMonth();
        } else {
          document.querySelector('[data-action="click->dashboard#nextMonth"]')?.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
      await page.waitForTimeout(3000);

      const restoredLabel = await monthLabel.textContent();
      expect(restoredLabel).toBe(initialLabel);
    });

    test('QA Mode banner is visible', async ({ page }) => {
      await login(page, acct.email, acct.password);
      const qaBanner = page.locator('text=QA Mode');
      await expect(qaBanner.first()).toBeVisible({ timeout: 5000 });
    });
  });
}
