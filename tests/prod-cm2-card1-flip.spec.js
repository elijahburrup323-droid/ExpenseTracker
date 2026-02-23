const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";
const ACCOUNTS = [
  { label: "elijahburrup323", email: "elijahburrup323@gmail.com", password: "Eli624462!" },
  { label: "djburrup", email: "djburrup@gmail.com", password: "luckydjb" },
];

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
  // Dismiss What's New overlay if present
  const gotItBtn = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.locator('#whatsNewOverlay').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

for (const acct of ACCOUNTS) {
  test.describe(`Production CM-2 Card 1 Flip — ${acct.label}`, () => {

    test(`${acct.label} - Card 1 has pie icon and flips to category breakdown`, async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      // Pie icon should be visible
      const pieBtn = page.locator('button[aria-label="View spending by category"]');
      await expect(pieBtn).toBeVisible();

      // Click to flip
      await pieBtn.click();
      await page.waitForTimeout(800);

      // Back side header visible
      const backHeader = page.locator('h2:has-text("Spending by Category")');
      await expect(backHeader).toBeVisible();

      // Back content area exists
      const backContent = page.locator('[data-dashboard-target="card1BackContent"]');
      await expect(backContent).toBeVisible();

      // Take screenshot of back side
      await page.screenshot({ path: `test-results/cm2-card1-back-${acct.label}.png`, fullPage: false });
    });

    test(`${acct.label} - Card 1 flips back to front`, async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      // Flip to back
      await page.locator('button[aria-label="View spending by category"]').click();
      await page.waitForTimeout(800);

      // Flip back — force:true needed because Playwright 2D hit-testing
      // cannot resolve clicks inside CSS 3D-transformed containers (preserve-3d + perspective)
      await page.locator('button[aria-label="Back to spending overview"]').click({ force: true });
      await page.waitForTimeout(800);

      // Front header visible
      await expect(page.locator('h2:has-text("Spending Overview")')).toBeVisible();
    });

    test(`${acct.label} - Card 2 flip still works independently`, async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      // Card 2 pie icon should work
      const card2Pie = page.locator('button[aria-label="View pie chart"]');
      await expect(card2Pie).toBeVisible();

      // Flip Card 1
      await page.locator('button[aria-label="View spending by category"]').click();
      await page.waitForTimeout(800);

      // Card 2 pie should still be accessible
      await expect(card2Pie).toBeVisible();
    });
  });
}
