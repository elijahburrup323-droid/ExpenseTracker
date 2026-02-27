const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000";
const EMAIL = "elijahburrup323@gmail.com";
const PASSWORD = "Eli624462!";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|mybudgethq\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Dashboard Financial Pulse Strip", () => {
  test("1. Pulse strip visible on dashboard", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    // The pulse strip should be visible
    const strip = page.locator('[data-dashboard-target="pulseStrip"]');
    await expect(strip).toBeVisible({ timeout: 10000 });

    // Should contain "Financial Pulse" label
    await expect(strip.locator("text=Financial Pulse")).toBeVisible();

    // Should contain at least one metric (Debt or Savings will always show, even as "—")
    const text = await strip.textContent();
    console.log("Pulse strip text:", text);

    // At minimum, Savings and Debt should be present (may show "—" if no data)
    expect(text).toContain("Savings");
    expect(text).toContain("Debt");
  });

  test("2. API returns pulse data", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    const data = await page.evaluate(async (base) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.content : "";
      const res = await fetch(`${base}/api/dashboard/card_data`, {
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-CSRF-Token": token },
      });
      return res.json();
    }, BASE);

    console.log("Pulse data:", JSON.stringify(data.pulse));
    expect(data.pulse).toBeDefined();
    expect(data.pulse).toHaveProperty("liquidity");
    expect(data.pulse).toHaveProperty("debt_ratio");
    expect(data.pulse).toHaveProperty("savings_rate");
  });

  test("3. No vertical layout shift (cards grid position check)", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    // The cards grid should still be visible and not pushed off-screen
    const grid = page.locator('[data-dashboard-target="cardsGrid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });

    // Pulse strip should have minimal height (1 line)
    const strip = page.locator('[data-dashboard-target="pulseStrip"]');
    const box = await strip.boundingBox();
    console.log(`Pulse strip dimensions: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
    // Strip should be thin — less than 40px height (single line text + padding)
    expect(box.height).toBeLessThan(40);
  });
});
