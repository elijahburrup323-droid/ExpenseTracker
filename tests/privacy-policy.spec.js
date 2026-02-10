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

test.describe("Privacy Policy & Terms", () => {
  test("Privacy Policy page loads from footer (logged in)", async ({ page }) => {
    await login(page);
    await page.goto(`${LOCAL_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Click Privacy link in footer
    await Promise.all([
      page.waitForURL(`${LOCAL_BASE}/pages/privacy`),
      page.click('footer a:has-text("Privacy")'),
    ]);
    await page.waitForLoadState("networkidle");

    // Should show privacy policy content
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "1. Introduction" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "2. Information We Collect" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "4. Data Storage and Security" })).toBeVisible();
  });

  test("Terms of Service page loads from footer (logged in)", async ({ page }) => {
    await login(page);
    await page.goto(`${LOCAL_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Click Terms link in footer
    await Promise.all([
      page.waitForURL(`${LOCAL_BASE}/pages/terms`),
      page.click('footer a:has-text("Terms")'),
    ]);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
    await expect(page.locator("text=Acceptance of Terms")).toBeVisible();
  });

  test("Privacy page accessible without login", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });

  test("Privacy policy has all 10 sections", async ({ page }) => {
    await login(page);
    await page.goto(`${LOCAL_BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");

    const sections = [
      "1. Introduction",
      "2. Information We Collect",
      "3. How We Use Your Information",
      "4. Data Storage and Security",
      "5. Data Sharing",
      "6. Your Rights",
      "7. Cookies and Local Storage",
      "8. Children's Privacy",
      "9. Changes to This Policy",
      "10. Contact Us",
    ];

    for (const section of sections) {
      await expect(page.locator(`text=${section}`)).toBeVisible();
    }
  });
});
