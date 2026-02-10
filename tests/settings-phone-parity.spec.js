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

test.describe("CM1: Phone Settings Parity with Email Settings", () => {
  test("Primary Phone is an editable input field (not read-only text)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Primary Phone should be a telephone input field
    const phoneInput = page.locator('input[name="user[phone_number]"]');
    await expect(phoneInput).toBeVisible();
    expect(await phoneInput.getAttribute("type")).toBe("tel");
    expect(await phoneInput.getAttribute("placeholder")).toBe("+1 (555) 123-4567");

    // Primary Phone label should exist
    const phoneLabel = page.locator('label:has-text("Primary Phone")');
    await expect(phoneLabel).toBeVisible();
  });

  test("Primary Phone input matches Primary Email input styling", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[name="user[email]"]');
    const phoneInput = page.locator('input[name="user[phone_number]"]');

    await expect(emailInput).toBeVisible();
    await expect(phoneInput).toBeVisible();

    // Both should have same dimensions (within tolerance)
    const emailBox = await emailInput.boundingBox();
    const phoneBox = await phoneInput.boundingBox();
    expect(Math.abs(emailBox.width - phoneBox.width)).toBeLessThan(10);
    expect(Math.abs(emailBox.height - phoneBox.height)).toBeLessThan(5);
  });

  test("Alternate Phones section has border divider (matching Alternate Emails)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // The Alternate Phones container should have border-t class
    const altPhonesDiv = page.locator('[data-controller="settings-phones"]');
    await expect(altPhonesDiv).toBeVisible();

    // Check it has the border-t styling by checking computed style
    const hasBorderTop = await altPhonesDiv.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.borderTopWidth !== "0px" && style.borderTopStyle !== "none";
    });
    expect(hasBorderTop).toBe(true);
  });

  test("Two-Factor toggle section exists with proper label", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Two-Factor label should be visible
    const twoFactorLabel = page.locator('label:has-text("Two-Factor Notifications")');
    await expect(twoFactorLabel).toBeVisible();

    // The checkbox should exist
    const twoFactorCheckbox = page.locator('input[name="user[two_factor_enabled]"]');
    await expect(twoFactorCheckbox.first()).toBeAttached();
  });

  test("Phone number can be saved without entering current password", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const phoneInput = page.locator('input[name="user[phone_number]"]');
    await expect(phoneInput).toBeVisible();

    // Clear and enter a test phone number
    await phoneInput.fill("+15551234567");

    // Click Save Changes without entering current password
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Should redirect back to edit page (successful save) — no error about current password
    await expect(page).toHaveURL(/\/users\/edit/);

    // The phone number should be preserved
    const phoneValue = await page.locator('input[name="user[phone_number]"]').inputValue();
    expect(phoneValue).toContain("5551234567");
  });

  test("Alternate Phones has Add Phone button and form", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Add Phone button visible
    const addPhoneBtn = page.locator('button:has-text("+ Add Phone")');
    await expect(addPhoneBtn).toBeVisible();

    // Click it to show the add form
    await addPhoneBtn.click();
    await page.waitForTimeout(300);

    // Phone input and Add/Cancel buttons should appear
    const addForm = page.locator('[data-settings-phones-target="addForm"]');
    await expect(addForm).toBeVisible();
    await expect(addForm.locator('input[type="tel"]')).toBeVisible();
    await expect(addForm.locator('button:has-text("Add")')).toBeVisible();
    await expect(addForm.locator('button:has-text("Cancel")')).toBeVisible();

    // Cancel hides the form
    await addForm.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
    await expect(addForm).toBeHidden();
  });
});
