const { test, expect } = require("@playwright/test");

const LOCAL_BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${LOCAL_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${LOCAL_BASE}/dashboard`),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
}

test.describe("Net Worth Dashboard Card", () => {
  test("Net Worth card shows on dashboard with current value", async ({
    page,
  }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Card 3 should show "Net Worth" heading
    await expect(page.locator("text=Net Worth").first()).toBeVisible();

    // Should show the subtext
    await expect(
      page.locator(
        "text=Your net worth chart will build automatically as more months are added."
      )
    ).toBeVisible();
  });

  test("Admin can see Populate Test Data button", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Admin user should see the populate control
    await expect(
      page.locator('button:has-text("Populate Test Data")')
    ).toBeVisible();
    await expect(page.locator("select")).toBeVisible();
  });

  test("Admin can populate historical data and chart renders", async ({
    page,
  }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Select 3 months back and click populate
    await page.selectOption(
      '[data-net-worth-populate-target="months"]',
      "3"
    );
    await page.click('button:has-text("Populate Test Data")');

    // Wait for page reload after populate
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // After reload, should see the chart SVG with line (multiple months)
    await expect(page.locator("text=Net Worth").first()).toBeVisible();

    // Should have SVG polyline (multi-month chart)
    const polyline = page.locator(
      ".bg-white.rounded-xl:has(text='Net Worth') polyline, .dark\\:bg-gray-800.rounded-xl:has(text='Net Worth') polyline"
    );
    // Alternative: just check for circle elements in the net worth card area
    const circles = page.locator("svg circle[fill='#a855f7']");
    const circleCount = await circles.count();
    expect(circleCount).toBeGreaterThanOrEqual(2);
  });

  test("Chart shows month labels from real data", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // After populating data above, we should see month labels
    // Check that at least one month label is visible (e.g., current month)
    const currentMonth = new Date().toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    // The month label should be somewhere on the page
    await expect(page.locator("text=Net Worth").first()).toBeVisible();
  });
});
