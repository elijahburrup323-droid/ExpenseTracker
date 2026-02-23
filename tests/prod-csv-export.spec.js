const { test, expect } = require("@playwright/test");
const fs = require("fs");

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

test.describe("Production CSV Export", () => {
  test("elijahburrup323 - Export CSV button visible and functional", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verify button exists
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();

    // Check if there are payments
    const noPayments = page.locator('text=No payments found');
    if (await noPayments.isVisible()) {
      // No data — verify alert on export
      let alertMessage = "";
      page.on("dialog", async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });
      await exportBtn.click();
      await page.waitForTimeout(1000);
      expect(alertMessage).toContain("No payments to export");
    } else {
      // Has data — verify download
      const downloadPromise = page.waitForEvent("download");
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^payments_\d{4}-\d{2}-\d{2}\.csv$/);

      const filePath = await download.path();
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines[0]).toBe("Date,Account,Category,Spending Type,Description,Amount");
    }
  });

  test("djburrup - Export CSV button visible and functional", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verify button exists
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();

    // Check if there are payments
    const noPayments = page.locator('text=No payments found');
    if (await noPayments.isVisible()) {
      let alertMessage = "";
      page.on("dialog", async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });
      await exportBtn.click();
      await page.waitForTimeout(1000);
      expect(alertMessage).toContain("No payments to export");
    } else {
      const downloadPromise = page.waitForEvent("download");
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^payments_\d{4}-\d{2}-\d{2}\.csv$/);

      const filePath = await download.path();
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines[0]).toBe("Date,Account,Category,Spending Type,Description,Amount");
    }
  });
});
