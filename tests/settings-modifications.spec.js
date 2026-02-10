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

test.describe("Settings Page Modifications", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${LOCAL_BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
  });

  test("header text is updated", async ({ page }) => {
    await expect(
      page.getByText("Manage your profile, subscription, email, phone, and password.")
    ).toBeVisible();
  });

  test("two-factor toggle is present in Profile section", async ({ page }) => {
    await expect(
      page.locator('label[for="user_two_factor_enabled"]')
    ).toBeVisible();
    await expect(page.locator("text=Two-Factor Notifications")).toBeVisible();
    await expect(
      page.locator("text=When enabled, you will receive a code")
    ).toBeVisible();
  });

  test("subscription information block is present", async ({ page }) => {
    await expect(
      page.locator("text=Subscription Information")
    ).toBeVisible();
    await expect(page.locator("text=Active Subscriber")).toBeVisible();
    // Test user should have subscription_active = false (default)
    await expect(
      page.locator(
        "span.inline-flex:has-text('No')"
      )
    ).toBeVisible();
    // Subscribe button should be visible when not active
    await expect(
      page.locator('button:has-text("Subscribe")')
    ).toBeVisible();
  });

  test("email settings section has primary email and alternate emails", async ({ page }) => {
    await expect(page.locator("text=Email Settings")).toBeVisible();
    await expect(page.getByText("Primary Email", { exact: true })).toBeVisible();
    await expect(page.locator("text=Alternate Emails")).toBeVisible();
    await expect(
      page.locator('button:has-text("+ Add Email")')
    ).toBeVisible();
  });

  test("phone settings section is present", async ({ page }) => {
    await expect(page.locator("text=Phone Settings")).toBeVisible();
    await expect(page.locator("text=Alternate Phones")).toBeVisible();
    await expect(
      page.locator('button:has-text("+ Add Phone")')
    ).toBeVisible();
  });

  test("add email form shows when clicking + Add Email", async ({ page }) => {
    await page.click('button:has-text("+ Add Email")');
    await page.waitForTimeout(300);
    const addForm = page.locator(
      '[data-settings-emails-target="addForm"]'
    );
    await expect(addForm).toBeVisible();
    await expect(
      addForm.locator('input[type="email"]')
    ).toBeVisible();
  });

  test("add phone form shows when clicking + Add Phone", async ({ page }) => {
    await page.click('button:has-text("+ Add Phone")');
    await page.waitForTimeout(300);
    const addForm = page.locator(
      '[data-settings-phones-target="addForm"]'
    );
    await expect(addForm).toBeVisible();
    await expect(
      addForm.locator('input[type="tel"]')
    ).toBeVisible();
  });

  test("can add and remove an alternate email", async ({ page }) => {
    // Add an email
    await page.click('button:has-text("+ Add Email")');
    await page.waitForTimeout(300);
    const emailInput = page.locator(
      '[data-settings-emails-target="addForm"] input[type="email"]'
    );
    await emailInput.fill("testalternate@example.com");
    await page.click(
      '[data-settings-emails-target="addForm"] button:has-text("Add")'
    );
    await page.waitForTimeout(1000);

    // Verify it appears in the list
    const list = page.locator('[data-settings-emails-target="list"]');
    await expect(list).toContainText("testalternate@example.com");
    await expect(list).toContainText("Unverified");

    // Remove it
    page.on("dialog", (dialog) => dialog.accept());
    await list.locator('button[title="Remove"]').click();
    await page.waitForTimeout(1000);

    // Verify it's gone
    await expect(list).not.toContainText("testalternate@example.com");
  });

  test("can add and remove an alternate phone", async ({ page }) => {
    // Add a phone
    await page.click('button:has-text("+ Add Phone")');
    await page.waitForTimeout(300);
    const phoneInput = page.locator(
      '[data-settings-phones-target="addForm"] input[type="tel"]'
    );
    await phoneInput.fill("+15551234567");
    await page.click(
      '[data-settings-phones-target="addForm"] button:has-text("Add")'
    );
    await page.waitForTimeout(1000);

    // Verify it appears in the list
    const list = page.locator('[data-settings-phones-target="list"]');
    await expect(list).toContainText("+15551234567");
    await expect(list).toContainText("Unverified");

    // Remove it
    page.on("dialog", (dialog) => dialog.accept());
    await list.locator('button[title="Remove"]').click();
    await page.waitForTimeout(1000);

    // Verify it's gone
    await expect(list).not.toContainText("+15551234567");
  });

  test("sections are in correct order", async ({ page }) => {
    const sections = page.locator("h2");
    const texts = await sections.allTextContents();
    const expectedOrder = [
      "Profile Information",
      "Subscription Information",
      "Email Settings",
      "Phone Settings",
      "Change Password",
      "Confirm Changes",
    ];
    for (let i = 0; i < expectedOrder.length; i++) {
      expect(texts[i]).toBe(expectedOrder[i]);
    }
  });
});
