const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";
const ACCT = { email: "elijahburrup323@gmail.com", password: "Eli624462!" };

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', ACCT.email);
  await page.fill('input[name="user[password]"]', ACCT.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

async function dismissWhatsNew(page) {
  try {
    // Remove the whatsNewOverlay if present (full-screen overlay with z-50)
    await page.evaluate(() => {
      const overlay = document.getElementById('whatsNewOverlay');
      if (overlay) overlay.remove();
    });
    await page.waitForTimeout(300);
    // Also try the Stimulus-based modal
    const popup = page.locator("[data-dashboard-target='whatsNewModal']");
    if (await popup.isVisible({ timeout: 1000 })) {
      await popup.locator("button", { hasText: "Close" }).click();
      await popup.waitFor({ state: "hidden" });
    }
  } catch (e) {}
}

test.describe("v1.2.0 — Batch 3 Production Tests", () => {
  test("QA banner shows v1.2.0", async ({ page }) => {
    await login(page);
    await dismissWhatsNew(page);
    const banner = page.locator("text=QA MODE");
    await expect(banner.first()).toBeVisible({ timeout: 5000 });
    const body = await page.content();
    expect(body).toContain("1.2.0");
  });

  // CM-9: Accounts effective date field
  test("CM-9: Accounts Add shows effective date field", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    // Click Add Account
    const addBtn = page.locator("[data-accounts-target='addButton']");
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      // Check for effective date input
      const dateInput = page.locator("input[name='effective_date']");
      await expect(dateInput).toBeVisible();
      // Should have min/max constraints
      const min = await dateInput.getAttribute("min");
      const max = await dateInput.getAttribute("max");
      console.log("Date min:", min, "max:", max);
      expect(min).toBeTruthy();
      expect(max).toBeTruthy();
      // Cancel
      await page.keyboard.press("Escape");
    }
  });

  // CM-9: Server rejects out-of-month account creation
  test("CM-9: Server returns 409 for out-of-month account creation", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);

    const result = await page.evaluate(async (baseUrl) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.getAttribute("content") : "";

      const res = await fetch(`${baseUrl}/api/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          account: {
            name: "Test Bad Date",
            account_type_id: 1,
            balance: 0,
            effective_date: "2020-01-15"
          }
        }),
      });
      return { status: res.status, body: await res.json() };
    }, BASE);

    console.log("Server response:", JSON.stringify(result, null, 2));
    expect(result.status).toBe(409);
    expect(result.body.errors[0]).toContain("open month");
  });

  // CM-7 Freq: FrequencyMasters page loads with Deposits text
  test("CM-7: FrequencyMasters shows Deposits terminology", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForLoadState("networkidle");
    const body = await page.content();
    expect(body).toContain("deposits");
    expect(body).toContain("Master Deposit Frequency Options");
    expect(body).not.toContain("income entries");
  });

  // CM-7 Freq: No Delete button, has Deactivate/Reactivate
  test("CM-7: FrequencyMasters has Deactivate instead of Delete", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const body = await page.content();
    // Should NOT have deleteItem action
    expect(body).not.toContain("deleteItem");
    // Should have deactivateItem or reactivateItem
    const hasDeactivate = body.includes("deactivateItem") || body.includes("reactivateItem");
    expect(hasDeactivate).toBeTruthy();
  });

  // CM-7 Freq: Server rejects DELETE with 405
  test("CM-7: Server returns 405 for frequency master delete", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);

    const result = await page.evaluate(async (baseUrl) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.getAttribute("content") : "";

      const res = await fetch(`${baseUrl}/api/income_frequency_masters/1`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "X-CSRF-Token": token,
        },
      });
      return { status: res.status, body: await res.json() };
    }, BASE);

    console.log("Delete response:", JSON.stringify(result, null, 2));
    expect(result.status).toBe(405);
    expect(result.body.errors[0]).toContain("Deactivate");
  });

  // CM-11: Soft Close and Open Soft Close menu items exist
  test("CM-11: Profile menu has Soft Close and Open Soft Close", async ({ page }) => {
    await login(page);
    await dismissWhatsNew(page);
    await page.waitForTimeout(500);
    // Open the TOP-RIGHT profile dropdown (not sidebar)
    const profileBtn = page.locator(".sticky [data-controller='dropdown'] button").first();
    await profileBtn.click({ force: true });
    await page.waitForTimeout(300);
    // Check menu items exist within the header dropdown
    const dropdown = page.locator(".sticky [data-controller='dropdown']").first();
    const softClose = dropdown.locator("text=Soft Close Month");
    const openSoftClose = dropdown.locator("text=Open Soft Close");
    await expect(softClose.first()).toBeVisible();
    await expect(openSoftClose.first()).toBeVisible();
  });

  // CM-15: DBU page loads with sticky header
  test("CM-15: DBU page loads with Record Browser default", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    // Record Browser tab should be active by default
    const tabRecords = page.locator("[data-dbu-target='tabRecords']");
    const tabClass = await tabRecords.getAttribute("class");
    expect(tabClass).toContain("border-brand-600");
    // Schema Inspector tab should not be active
    const tabSchema = page.locator("[data-dbu-target='tabSchema']");
    const schemaClass = await tabSchema.getAttribute("class");
    expect(schemaClass).toContain("border-transparent");
  });

  // CM-15: DBU has Edit/Delete modals in DOM
  test("CM-15: DBU has modal elements", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    const editModal = page.locator("[data-dbu-target='editModal']");
    const deleteModal = page.locator("[data-dbu-target='deleteModal']");
    await expect(editModal).toHaveCount(1);
    await expect(deleteModal).toHaveCount(1);
    // Both should be hidden initially
    await expect(editModal).toHaveClass(/hidden/);
    await expect(deleteModal).toHaveClass(/hidden/);
  });

  // CM-15: DBU sticky sub-header
  test("CM-15: DBU sub-header is sticky", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    // Check for sticky class on sub-header
    const subHeader = page.locator(".sticky").filter({ hasText: "DBU" });
    await expect(subHeader.first()).toBeVisible();
  });

  // DBU UPDATE: Schema Inspector loads all tables
  test("DBU UPDATE: Schema Inspector shows tables from information_schema", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    // Switch to Schema Inspector
    const schemaTab = page.locator("[data-dbu-target='tabSchema']");
    await schemaTab.click();
    await page.waitForTimeout(2000);
    // Should show tables
    const content = page.locator("[data-dbu-target='schemaContent']");
    await expect(content).toBeVisible();
    const html = await content.innerHTML();
    // Should contain common tables
    expect(html).toContain("users");
    expect(html).toContain("accounts");
    expect(html).toContain("payments");
  });
});
