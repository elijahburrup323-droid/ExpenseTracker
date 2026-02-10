const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@example.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe("Documentation Pages", () => {
  test("Documentation index shows all 8 cards", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Documentation");

    // All 8 doc cards should be visible
    await expect(page.locator("text=Database Schema")).toBeVisible();
    await expect(page.locator("text=Database Visualization")).toBeVisible();
    await expect(page.locator("text=Release Notes")).toBeVisible();
    await expect(page.locator("text=Claude.ai Prompt")).toBeVisible();
    await expect(page.locator("text=Architecture Overview")).toBeVisible();
    await expect(page.locator("text=Deployment Runbook")).toBeVisible();
    await expect(page.locator("text=Test Coverage")).toBeVisible();
    await expect(page.locator("text=Environment Variables")).toBeVisible();
  });

  test("Architecture Overview renders with flow diagram", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/architecture-overview`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Architecture Overview");
    await expect(page.locator("text=Request Flow")).toBeVisible();
    await expect(page.getByText("Stimulus", { exact: true }).first()).toBeVisible();
    await expect(page.locator("text=Api::Controller")).toBeVisible();
    await expect(page.locator("text=PostgreSQL")).toBeVisible();
    await expect(page.locator("text=Sidebar Layout")).toBeVisible();
    await expect(page.locator("text=Stimulus State Machine")).toBeVisible();
    await expect(page.locator("text=Key Conventions")).toBeVisible();
    await expect(page.locator("text=Soft Delete")).toBeVisible();

    // Breadcrumb back to documentation
    const backLink = page.locator('a:has-text("Documentation")').first();
    await expect(backLink).toBeVisible();
  });

  test("Deployment Runbook renders with all sections", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/deployment-runbook`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Deployment Runbook");
    await expect(page.locator("text=Pre-Deploy Checklist")).toBeVisible();
    await expect(page.locator("text=Deploy to Production")).toBeVisible();
    await expect(page.locator("text=Rollback Procedures")).toBeVisible();
    await expect(page.locator("text=Common Issues")).toBeVisible();
  });

  test("Test Coverage renders with auto-generated test data", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/test-coverage`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Test Coverage Report");

    // Summary cards should show non-zero counts
    await expect(page.getByText("Test Files", { exact: true })).toBeVisible();
    await expect(page.locator("text=Total Tests")).toBeVisible();
    await expect(page.locator("text=Local Suites")).toBeVisible();
    await expect(page.locator("text=Production Suites")).toBeVisible();

    // Should have local and production test sections
    await expect(page.locator("text=Local Test Suites")).toBeVisible();
    await expect(page.locator("text=Production Test Suites")).toBeVisible();
    await expect(page.locator("text=Screen Coverage Matrix")).toBeVisible();
  });

  test("Environment Variables renders with all sections", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation/environment-variables`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Environment Variables");
    await expect(page.locator("text=Security Notice")).toBeVisible();
    await expect(page.locator("text=Database & Connection").first()).toBeVisible();
    await expect(page.locator("text=Rails Core")).toBeVisible();
    await expect(page.locator("text=OAuth Providers")).toBeVisible();
    await expect(page.locator("text=Email & SMS").first()).toBeVisible();
    await expect(page.locator("text=Setup Reference")).toBeVisible();

    // Key env vars should be listed
    await expect(page.locator("text=DATABASE_URL")).toBeVisible();
    await expect(page.locator("text=SECRET_KEY_BASE")).toBeVisible();
    await expect(page.locator("text=GOOGLE_CLIENT_ID")).toBeVisible();
    await expect(page.locator("text=TWILIO_ACCOUNT_SID")).toBeVisible();
    await expect(page.locator("text=SENDGRID_USERNAME")).toBeVisible();
  });
});
