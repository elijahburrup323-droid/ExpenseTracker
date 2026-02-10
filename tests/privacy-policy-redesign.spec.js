const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

test.describe("Privacy Policy Redesign", () => {
  test("Privacy policy has TOC sidebar and card-based sections", async ({ page }) => {
    await page.goto(`${BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Page title
    await expect(page.locator("h1")).toContainText("Privacy Policy");

    // Breadcrumb navigation
    await expect(page.locator("text=Home")).toBeVisible();

    // TOC sidebar should be visible on desktop
    const toc = page.locator('[data-legal-toc-target="toc"]');
    await expect(toc).toBeVisible();

    // TOC should have links for all sections
    const tocLinks = toc.locator("a");
    const linkCount = await tocLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(10); // 10 main sections

    // Content area should have card-based sections
    const cards = page.locator('[data-legal-toc-target="content"] .rounded-lg.shadow-sm');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(9);
  });

  test("TOC links scroll to correct sections", async ({ page }) => {
    await page.goto(`${BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click on "Data Sharing" in TOC
    const tocLink = page.locator('[data-toc-id="data-sharing"]');
    await tocLink.click();
    await page.waitForTimeout(1000);

    // The section should be in view
    const section = page.locator("#data-sharing");
    await expect(section).toBeVisible();
  });

  test("Visualizations are present", async ({ page }) => {
    await page.goto(`${BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Section 2: Information cards (blue, green, purple, amber)
    const infoCards = page.locator('[data-legal-toc-target="content"] .bg-blue-50, [data-legal-toc-target="content"] .bg-green-50, [data-legal-toc-target="content"] .bg-purple-50, [data-legal-toc-target="content"] .bg-amber-50');
    expect(await infoCards.count()).toBeGreaterThanOrEqual(4);

    // Section 4: Security visualization (TLS, Encrypted DB, bcrypt circles)
    const securityCircles = page.locator('.rounded-full.border-2');
    expect(await securityCircles.count()).toBeGreaterThanOrEqual(3);

    // Section 6: Rights cards
    const rightsCards = page.locator('#your-rights').locator('..').locator('.text-center.p-4');
    expect(await rightsCards.count()).toBeGreaterThanOrEqual(5);

    // Section 7: Cookies table
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test("Terms of Service also has TOC and card layout", async ({ page }) => {
    await page.goto(`${BASE}/pages/terms`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("h1")).toContainText("Terms of Service");

    // TOC should be present
    const toc = page.locator('[data-legal-toc-target="toc"]');
    await expect(toc).toBeVisible();

    const tocLinks = toc.locator("a");
    expect(await tocLinks.count()).toBeGreaterThanOrEqual(10);
  });

  test("Last updated date is displayed", async ({ page }) => {
    await page.goto(`${BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.locator("text=Last updated:")).toBeVisible();
  });
});
