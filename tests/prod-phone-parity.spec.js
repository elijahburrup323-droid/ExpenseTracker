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

test.describe("Production CM1: Phone Settings Parity", () => {
  test("elijahburrup323 - Phone Settings matches Email Settings layout", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Primary Phone is an editable input
    const phoneInput = page.locator('input[name="user[phone_number]"]');
    await expect(phoneInput).toBeVisible();
    expect(await phoneInput.getAttribute("type")).toBe("tel");

    // Primary Email is also an editable input
    const emailInput = page.locator('input[name="user[email]"]');
    await expect(emailInput).toBeVisible();

    // Both inputs should have similar width
    const emailBox = await emailInput.boundingBox();
    const phoneBox = await phoneInput.boundingBox();
    expect(Math.abs(emailBox.width - phoneBox.width)).toBeLessThan(10);

    // Alternate Phones section has border divider
    const altPhonesDiv = page.locator('[data-controller="settings-phones"]');
    await expect(altPhonesDiv).toBeVisible();
    const hasBorderTop = await altPhonesDiv.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.borderTopWidth !== "0px" && style.borderTopStyle !== "none";
    });
    expect(hasBorderTop).toBe(true);

    // Two-Factor toggle exists
    const twoFactorLabel = page.locator('label:has-text("Two-Factor Notifications")');
    await expect(twoFactorLabel).toBeVisible();

    // Add Phone button visible
    await expect(page.locator('button:has-text("+ Add Phone")')).toBeVisible();
  });

  test("djburrup - Phone Settings matches Email Settings layout", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Primary Phone is an editable input
    const phoneInput = page.locator('input[name="user[phone_number]"]');
    await expect(phoneInput).toBeVisible();
    expect(await phoneInput.getAttribute("type")).toBe("tel");

    // Alternate Phones section has border divider
    const altPhonesDiv = page.locator('[data-controller="settings-phones"]');
    await expect(altPhonesDiv).toBeVisible();
    const hasBorderTop = await altPhonesDiv.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.borderTopWidth !== "0px" && style.borderTopStyle !== "none";
    });
    expect(hasBorderTop).toBe(true);

    // Two-Factor toggle exists
    const twoFactorLabel = page.locator('label:has-text("Two-Factor Notifications")');
    await expect(twoFactorLabel).toBeVisible();

    // Add Phone button visible
    await expect(page.locator('button:has-text("+ Add Phone")')).toBeVisible();
  });
});
