const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(4000);
}

test.describe("Production Documentation Pages", () => {
  test("elijahburrup323 - All 8 documentation pages accessible", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");

    // Documentation index
    await page.goto(`${BASE}/documentation`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Documentation");
    await expect(page.locator("text=Architecture Overview")).toBeVisible();
    await expect(page.locator("text=Deployment Runbook")).toBeVisible();
    await expect(page.locator("text=Test Coverage")).toBeVisible();
    await expect(page.locator("text=Environment Variables")).toBeVisible();

    // Architecture Overview
    await page.goto(`${BASE}/documentation/architecture-overview`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Architecture Overview");
    await expect(page.locator("text=Request Flow")).toBeVisible();
    await expect(page.locator("text=Key Conventions")).toBeVisible();

    // Deployment Runbook
    await page.goto(`${BASE}/documentation/deployment-runbook`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Deployment Runbook");
    await expect(page.locator("text=Pre-Deploy Checklist")).toBeVisible();

    // Test Coverage
    await page.goto(`${BASE}/documentation/test-coverage`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Test Coverage Report");
    await expect(page.getByText("Test Files", { exact: true })).toBeVisible();

    // Environment Variables
    await page.goto(`${BASE}/documentation/environment-variables`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Environment Variables");
    await expect(page.locator("text=DATABASE_URL")).toBeVisible();
  });

  test("djburrup - All 8 documentation pages accessible", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");

    // Documentation index
    await page.goto(`${BASE}/documentation`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Documentation");

    // Architecture Overview
    await page.goto(`${BASE}/documentation/architecture-overview`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Architecture Overview");

    // Deployment Runbook
    await page.goto(`${BASE}/documentation/deployment-runbook`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Deployment Runbook");

    // Test Coverage
    await page.goto(`${BASE}/documentation/test-coverage`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Test Coverage Report");

    // Environment Variables
    await page.goto(`${BASE}/documentation/environment-variables`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1.text-2xl")).toHaveText("Environment Variables");
  });
});
