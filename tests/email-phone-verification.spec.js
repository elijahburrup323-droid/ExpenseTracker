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

// Clean up any existing alternate emails/phones for the test user via API
async function cleanupRecords(page) {
  await page.evaluate(async () => {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : "";

    // Delete all alternate emails
    const emails = await fetch("/expensetracker/api/user_emails", { headers: { Accept: "application/json" } }).then(r => r.json());
    for (const e of emails) {
      await fetch(`/expensetracker/api/user_emails/${e.id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
    }

    // Delete all alternate phones
    const phones = await fetch("/expensetracker/api/user_phones", { headers: { Accept: "application/json" } }).then(r => r.json());
    for (const p of phones) {
      await fetch(`/expensetracker/api/user_phones/${p.id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
    }
  });
}

test.describe("Email & Phone Verification", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${LOCAL_BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    // Clean up any leftover records from failed test runs
    await cleanupRecords(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    try { await cleanupRecords(page); } catch (e) {}
  });

  test("Settings page shows email and phone sections", async ({ page }) => {
    await expect(page.locator("text=Email Settings")).toBeVisible();
    await expect(page.locator("text=Alternate Emails")).toBeVisible();
    await expect(page.locator("text=+ Add Email")).toBeVisible();
    await expect(page.locator("text=Phone Settings")).toBeVisible();
    await expect(page.locator("text=Alternate Phones")).toBeVisible();
    await expect(page.locator("text=+ Add Phone")).toBeVisible();
  });

  test("Add alternate email shows verification code input", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    const uniqueEmail = `test${Date.now()}@example.com`;

    // Reload page to get fresh state after cleanup
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Click + Add Email to show form
    await page.click("text=+ Add Email");
    await page.waitForTimeout(500);

    // Fill in the email input
    const addForm = page.locator('[data-settings-emails-target="addForm"]');
    await expect(addForm).toBeVisible();
    await addForm.locator("input[type='email']").fill(uniqueEmail);

    // Set up response listener BEFORE clicking
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/user_emails") && resp.request().method() === "POST"
    );
    await addForm.locator('[data-action="click->settings-emails#addEmail"]').click();
    await responsePromise;
    await page.waitForTimeout(1000);

    // Should show the email in the list with "Unverified" badge
    const list = page.locator('[data-settings-emails-target="list"]');
    await expect(list.locator(`text=${uniqueEmail}`)).toBeVisible({ timeout: 5000 });
    await expect(list.locator("text=Unverified")).toBeVisible();
    await expect(list.locator("input[maxlength='6']")).toBeVisible();
  });

  test("Add alternate phone shows verification code input", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    const suffix = String(Date.now()).slice(-7);
    const phone = `208${suffix}`;

    // Reload page to get fresh state after cleanup
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Click + Add Phone to show form
    await page.click("text=+ Add Phone");
    await page.waitForTimeout(500);

    const addForm = page.locator('[data-settings-phones-target="addForm"]');
    await expect(addForm).toBeVisible();
    await addForm.locator("input[type='tel']").fill(phone);

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/user_phones") && resp.request().method() === "POST"
    );
    await addForm.locator('[data-action="click->settings-phones#addPhone"]').click();
    await responsePromise;
    await page.waitForTimeout(1000);

    // Should show the phone in the list with "Unverified" badge
    const list = page.locator('[data-settings-phones-target="list"]');
    await expect(list.locator("text=Unverified")).toBeVisible({ timeout: 5000 });
    await expect(list.locator("input[maxlength='6']")).toBeVisible();
  });

  test("Two-Factor toggle is in Phone Settings section", async ({ page }) => {
    await expect(page.locator("text=Two-Factor Notifications")).toBeVisible();
  });
});
