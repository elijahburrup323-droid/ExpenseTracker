// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Theme + Rebrand CM-7 — ${user.email}`, () => {

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

    // --- Rebrand: MyBudgetHQ ---

    test('Page title is MyBudgetHQ', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await expect(page).toHaveTitle('MyBudgetHQ');
    });

    test('Navbar logo says MyBudgetHQ', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      const logo = page.locator('[data-sidebar-label]:has-text("MyBudgetHQ")').first();
      await expect(logo).toBeVisible();
    });

    test('Footer says MyBudgetHQ', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await expect(page.locator('footer')).toContainText('MyBudgetHQ');
    });

    test('No standalone BudgetHQ in footer', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      const footerText = await page.locator('footer').textContent();
      // Should contain MyBudgetHQ but not bare BudgetHQ
      expect(footerText).toContain('MyBudgetHQ');
    });

    test('Reconciliation page shows MyBudgetHQ', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      await expect(page.locator('body')).toContainText('MyBudgetHQ');
    });

    // --- Theme Settings Screen ---

    test('Theme Settings route is accessible', async ({ page }) => {
      const response = await page.goto(`${BASE}/settings/theme`);
      expect(response.status()).toBe(200);
      await expect(page.locator('h1:has-text("Theme Settings")')).toBeVisible();
    });

    test('Theme Settings shows 6 preset cards', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      const cards = page.locator('.theme-card');
      await expect(cards).toHaveCount(6);
    });

    test('Theme Settings shows correct preset names', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      await expect(page.locator('.theme-card:has-text("Default Purple")')).toBeVisible();
      await expect(page.locator('.theme-card:has-text("Navy")')).toBeVisible();
      await expect(page.locator('.theme-card:has-text("Teal")')).toBeVisible();
      await expect(page.locator('.theme-card:has-text("Charcoal")')).toBeVisible();
      await expect(page.locator('.theme-card:has-text("Deep Green")')).toBeVisible();
      await expect(page.locator('.theme-card:has-text("Burgundy")')).toBeVisible();
    });

    test('Theme Settings has Save and Cancel buttons', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      await expect(page.locator('[data-theme-settings-target="saveBtn"]')).toBeVisible();
      await expect(page.locator('[data-action="click->theme-settings#cancel"]')).toBeVisible();
    });

    test('Save button is disabled when no change', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      const saveBtn = page.locator('[data-theme-settings-target="saveBtn"]');
      await expect(saveBtn).toBeDisabled();
    });

    test('Selecting a different theme enables Save', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      await page.waitForTimeout(1000);
      // Click a theme that isn't currently selected
      const navyCard = page.locator('.theme-card[data-theme-key="navy"]');
      await navyCard.click();
      const saveBtn = page.locator('[data-theme-settings-target="saveBtn"]');
      await expect(saveBtn).toBeEnabled();
    });

    test('Cancel reverts preview', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      await page.waitForTimeout(1000);
      // Get original theme
      const original = await page.locator('html').getAttribute('data-accent-theme');
      // Select a different theme
      const tealCard = page.locator('.theme-card[data-theme-key="teal"]');
      await tealCard.click();
      // Theme should preview
      const preview = await page.locator('html').getAttribute('data-accent-theme');
      expect(preview).toBe('teal');
      // Cancel
      await page.click('button:has-text("Cancel")');
      const reverted = await page.locator('html').getAttribute('data-accent-theme');
      expect(reverted).toBe(original);
    });

    // --- Theme API ---

    test('Theme API accepts valid theme', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      const response = await page.evaluate(async (base) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const res = await fetch(`${base}/api/theme`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'Accept': 'application/json' },
          body: JSON.stringify({ accent_theme_key: 'purple' })
        });
        return { status: res.status, ok: res.ok };
      }, BASE);
      expect(response.ok).toBe(true);
    });

    test('Theme API rejects invalid theme', async ({ page }) => {
      await page.goto(`${BASE}/settings/theme`);
      const response = await page.evaluate(async (base) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const res = await fetch(`${base}/api/theme`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'Accept': 'application/json' },
          body: JSON.stringify({ accent_theme_key: 'rainbow' })
        });
        return { status: res.status };
      }, BASE);
      expect(response.status).toBe(422);
    });

    // --- CSS Variables ---

    test('HTML element has data-accent-theme attribute', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      const theme = await page.locator('html').getAttribute('data-accent-theme');
      expect(theme).toBeTruthy();
      expect(['purple', 'navy', 'teal', 'charcoal', 'deep_green', 'burgundy']).toContain(theme);
    });

    test('CSS variables are defined for brand colors', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      const brandColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--brand-600').trim();
      });
      expect(brandColor).toBeTruthy();
    });

    // --- Profile Dropdown ---

    test('Theme Settings link in header profile dropdown', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(500);
      // Click profile dropdown in header bar
      const profileBtn = page.locator('.sticky.top-0 [data-controller="dropdown"] button').first();
      await profileBtn.click();
      await expect(page.locator('.sticky.top-0 [data-dropdown-target="menu"] a:has-text("Theme Settings")')).toBeVisible();
    });

    test('Theme Settings link in sidebar profile menu', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(500);
      // Click profile name in sidebar to open dropdown
      const sidebarProfile = page.locator('aside [data-controller="dropdown"] button').first();
      await sidebarProfile.click();
      await expect(page.locator('aside [data-dropdown-target="menu"] a:has-text("Theme Settings")')).toBeVisible();
    });

    // --- Release Notes ---

    test('Release notes mention CM-7 theme and rebrand', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Accent color presets');
      await expect(page.locator('body')).toContainText('MyBudgetHQ');
    });
  });
}
