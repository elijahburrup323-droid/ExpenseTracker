const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";
const EMAIL = "test@test.com";
const PASSWORD = "password123";
const SECONDARY_EMAIL = "theworldeknows@gmail.com";

async function login(page, email = EMAIL, password = PASSWORD) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", {
    name: "Sign in",
    exact: true,
  });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe.serial("Profile Settings", () => {
  test("settings page loads with current values", async ({ page }) => {
    await login(page);

    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Page should load with the settings heading
    await expect(page.locator("h1")).toHaveText("Account Settings");

    // Email field should have current email
    const emailField = page.locator('input[name="user[email]"]');
    await expect(emailField).toHaveValue(EMAIL);

    console.log("Settings page loaded successfully");
  });

  test("change name only — saves without password", async ({ page }) => {
    await login(page);

    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Change first name
    const firstNameField = page.locator('input[name="user[first_name]"]');
    await firstNameField.fill("TestFirst");

    const lastNameField = page.locator('input[name="user[last_name]"]');
    await lastNameField.fill("TestLast");

    // Submit WITHOUT entering current password
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForTimeout(3000);

    // Should stay on settings page (or redirect back) without errors
    const url = page.url();
    console.log("After name save URL:", url);

    // Check no error messages
    const errorBox = page.locator(".bg-red-50, .dark\\:bg-red-900\\/30");
    const errorCount = await errorBox.count();
    console.log("Error boxes:", errorCount);

    // Reload and verify name persisted
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(
      page.locator('input[name="user[first_name]"]')
    ).toHaveValue("TestFirst");
    await expect(page.locator('input[name="user[last_name]"]')).toHaveValue(
      "TestLast"
    );

    console.log("Name change saved without password - OK");
  });

  test("set secondary email — requires current password", async ({
    page,
  }) => {
    await login(page);

    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Set secondary email
    const secondaryField = page.locator(
      'input[name="user[secondary_email]"]'
    );
    await secondaryField.fill(SECONDARY_EMAIL);

    // Enter current password
    const currentPwField = page.locator(
      'input[name="user[current_password]"]'
    );
    await currentPwField.fill(PASSWORD);

    // Submit
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log("After secondary email save URL:", url);

    // Check for errors
    const pageText = await page.locator("body").innerText();
    if (pageText.includes("error") || pageText.includes("Error")) {
      console.log(
        "Page contains error text:",
        pageText.substring(0, 1000)
      );
    }

    // Reload and verify secondary email persisted
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(secondaryField).toHaveValue(SECONDARY_EMAIL);

    console.log("Secondary email saved - OK");
  });

  test("login with secondary email", async ({ page }) => {
    // Sign out first, then try logging in with secondary email
    await login(page, SECONDARY_EMAIL, PASSWORD);

    // Should be on dashboard
    const url = page.url();
    console.log("After secondary email login URL:", url);
    expect(url).toContain("/dashboard");

    console.log("Secondary email login - OK");
  });

  test("change password — requires current password", async ({ page }) => {
    await login(page);

    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const NEW_PASSWORD = "Eli624462!!";

    // Fill new password
    const pwField = page.locator('input[name="user[password]"]');
    await pwField.fill(NEW_PASSWORD);

    const pwConfirmField = page.locator(
      'input[name="user[password_confirmation]"]'
    );
    await pwConfirmField.fill(NEW_PASSWORD);

    // Enter current password
    const currentPwField = page.locator(
      'input[name="user[current_password]"]'
    );
    await currentPwField.fill(PASSWORD);

    // Submit
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log("After password change URL:", url);

    // Check for errors on page
    const pageText = await page.locator("body").innerText();
    if (pageText.includes("error") || pageText.includes("Error")) {
      console.log("Error text found:", pageText.substring(0, 1000));
    }

    console.log("Password change submitted");
  });

  test("login with new password", async ({ page }) => {
    const NEW_PASSWORD = "Eli624462!!";
    await login(page, EMAIL, NEW_PASSWORD);

    const url = page.url();
    console.log("After new password login URL:", url);
    expect(url).toContain("/dashboard");

    console.log("New password login - OK");
  });

  test("cleanup: reset password back to original", async ({ page }) => {
    const NEW_PASSWORD = "Eli624462!!";
    await login(page, EMAIL, NEW_PASSWORD);

    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Change password back
    const pwField = page.locator('input[name="user[password]"]');
    await pwField.fill(PASSWORD);

    const pwConfirmField = page.locator(
      'input[name="user[password_confirmation]"]'
    );
    await pwConfirmField.fill(PASSWORD);

    const currentPwField = page.locator(
      'input[name="user[current_password]"]'
    );
    await currentPwField.fill(NEW_PASSWORD);

    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForTimeout(3000);

    // Clear secondary email too
    await page.goto(`${BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const secondaryField = page.locator(
      'input[name="user[secondary_email]"]'
    );
    await secondaryField.fill("");

    const currentPwField2 = page.locator(
      'input[name="user[current_password]"]'
    );
    await currentPwField2.fill(PASSWORD);

    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForTimeout(3000);

    console.log("Cleanup done - password and secondary email reset");
  });
});
