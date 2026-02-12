const { test, expect } = require("@playwright/test");

const PROD_BASE = "https://djburrup.com/expensetracker";
const ACCOUNT = { email: "elijahburrup323@gmail.com", password: "Eli624462!" };
const ACCOUNT2 = { email: "djburrup@gmail.com", password: "luckydjb" };

async function login(page, email, password) {
  await page.goto(`${PROD_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${PROD_BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
  await dismissWhatsNew(page);
}

async function dismissWhatsNew(page) {
  try {
    const overlay = page.locator("#whatsNewOverlay");
    if (await overlay.isVisible({ timeout: 2000 })) {
      await page.evaluate(() => {
        const el = document.getElementById("whatsNewOverlay");
        if (el) el.remove();
      });
      await page.waitForTimeout(300);
    }
  } catch (e) {}
}

// ============================================================
// SECTION 1: Payments Total Visual Emphasis
// ============================================================
test.describe("CM-1 Section 1: Payments Total Visual Emphasis", () => {
  for (const account of [ACCOUNT, ACCOUNT2]) {
    test(`Total text is visually prominent — ${account.email}`, async ({ page }) => {
      await login(page, account.email, account.password);
      await page.goto(`${PROD_BASE}/payments`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(1000);

      // Total span should exist and contain text
      const totalSpan = page.locator("[data-payments-target='total']");
      await expect(totalSpan).toBeVisible();
      const text = await totalSpan.textContent();
      expect(text).toContain("Total:");
      expect(text).toContain("$");

      // Verify the font size is larger than text-sm (14px). text-lg = 18px
      const fontSize = await totalSpan.evaluate(el => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(18);

      // Verify font-weight is semibold (600) or more
      const fontWeight = await totalSpan.evaluate(el => {
        return parseInt(window.getComputedStyle(el).fontWeight);
      });
      expect(fontWeight).toBeGreaterThanOrEqual(600);
    });
  }
});

// ============================================================
// SECTION 2: Payment Date Validation Against Open Month
// ============================================================
test.describe("CM-1 Section 2: Payment Date Validation", () => {
  test("Date warning modal appears for out-of-month date (Add)", async ({ page }) => {
    await login(page, ACCOUNT.email, ACCOUNT.password);
    await page.goto(`${PROD_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);
    await page.waitForTimeout(1000);

    // Click Add Payment
    await page.click("[data-action='click->payments#startAdding']");
    await page.waitForTimeout(500);

    // Set a date far in the past (guaranteed outside open month)
    await page.fill("[data-payments-target='modalDate']", "2020-01-15");

    // Fill required fields
    const accountSelect = page.locator("[data-payments-target='modalAccount']");
    const options = await accountSelect.locator("option:not([value='']):not([value='new'])").all();
    if (options.length > 0) {
      const value = await options[0].getAttribute("value");
      await accountSelect.selectOption(value);
    }

    const categorySelect = page.locator("[data-payments-target='modalCategory']");
    const catOptions = await categorySelect.locator("option:not([value='']):not([value='new'])").all();
    if (catOptions.length > 0) {
      const value = await catOptions[0].getAttribute("value");
      await categorySelect.selectOption(value);
    }

    await page.fill("[data-payments-target='modalDescription']", "Test date validation");
    await page.fill("[data-payments-target='modalAmount']", "1.00");

    // Click Save
    await page.click("[data-action='click->payments#saveNew']");
    await page.waitForTimeout(1000);

    // Date warning modal should appear
    const warningModal = page.locator("[data-payments-target='dateWarningModal']");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    // Should mention "outside" or show the date warning text
    const warningText = page.locator("[data-payments-target='dateWarningMessage']");
    const messageText = await warningText.textContent();
    expect(messageText).toContain("January 2020");
    expect(messageText).toContain("outside");

    // Cancel button should dismiss
    await page.click("[data-action='click->payments#cancelDateWarning']");
    await page.waitForTimeout(300);
    await expect(warningModal).toBeHidden();
  });

  test("Date warning modal does NOT appear for current-month date (Add)", async ({ page }) => {
    await login(page, ACCOUNT.email, ACCOUNT.password);
    await page.goto(`${PROD_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);
    await page.waitForTimeout(1000);

    // Click Add Payment
    await page.click("[data-action='click->payments#startAdding']");
    await page.waitForTimeout(500);

    // Date defaults to today (should be in the open month)
    // Just verify the modal date has today's date
    const dateValue = await page.locator("[data-payments-target='modalDate']").inputValue();
    expect(dateValue).toBeTruthy();

    // Fill required fields
    const accountSelect = page.locator("[data-payments-target='modalAccount']");
    const options = await accountSelect.locator("option:not([value='']):not([value='new'])").all();
    if (options.length > 0) {
      const value = await options[0].getAttribute("value");
      await accountSelect.selectOption(value);
    }

    const categorySelect = page.locator("[data-payments-target='modalCategory']");
    const catOptions = await categorySelect.locator("option:not([value='']):not([value='new'])").all();
    if (catOptions.length > 0) {
      const value = await catOptions[0].getAttribute("value");
      await categorySelect.selectOption(value);
    }

    await page.fill("[data-payments-target='modalDescription']", "Test current month OK");
    await page.fill("[data-payments-target='modalAmount']", "0.01");

    // Click Save
    await page.click("[data-action='click->payments#saveNew']");
    await page.waitForTimeout(1500);

    // Date warning modal should NOT appear
    const warningModal = page.locator("[data-payments-target='dateWarningModal']");
    await expect(warningModal).toBeHidden();

    // The add modal should have closed (save succeeded)
    const addModal = page.locator("[data-payments-target='addModal']");
    await expect(addModal).toBeHidden();
  });

  test("Proceed button closes month and saves payment", async ({ page }) => {
    await login(page, ACCOUNT.email, ACCOUNT.password);
    await page.goto(`${PROD_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);
    await page.waitForTimeout(1000);

    // First, get the current open month via API
    const openMonthData = await page.evaluate(async () => {
      const res = await fetch("/expensetracker/api/open_month_master", {
        headers: { "Accept": "application/json" }
      });
      return res.json();
    });
    const origYear = openMonthData.current_year;
    const origMonth = openMonthData.current_month;

    // Click Add Payment
    await page.click("[data-action='click->payments#startAdding']");
    await page.waitForTimeout(500);

    // Set date to previous month
    const prevMonth = origMonth === 1 ? 12 : origMonth - 1;
    const prevYear = origMonth === 1 ? origYear - 1 : origYear;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-15`;
    await page.fill("[data-payments-target='modalDate']", dateStr);

    // Fill required fields
    const accountSelect = page.locator("[data-payments-target='modalAccount']");
    const options = await accountSelect.locator("option:not([value='']):not([value='new'])").all();
    if (options.length > 0) {
      const value = await options[0].getAttribute("value");
      await accountSelect.selectOption(value);
    }

    const categorySelect = page.locator("[data-payments-target='modalCategory']");
    const catOptions = await categorySelect.locator("option:not([value='']):not([value='new'])").all();
    if (catOptions.length > 0) {
      const value = await catOptions[0].getAttribute("value");
      await categorySelect.selectOption(value);
    }

    await page.fill("[data-payments-target='modalDescription']", "Test proceed saves payment");
    await page.fill("[data-payments-target='modalAmount']", "0.01");

    // Click Save — should trigger date warning
    await page.click("[data-action='click->payments#saveNew']");
    await page.waitForTimeout(1000);

    const warningModal = page.locator("[data-payments-target='dateWarningModal']");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    // Click Proceed
    await page.click("[data-action='click->payments#proceedDateWarning']");
    await page.waitForTimeout(2000);

    // Warning modal should be gone
    await expect(warningModal).toBeHidden();

    // Add modal should be gone (save succeeded)
    const addModal = page.locator("[data-payments-target='addModal']");
    await expect(addModal).toBeHidden();

    // Restore the original open month
    await page.evaluate(async (data) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.content : "";
      await fetch("/expensetracker/api/open_month_master", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": token
        },
        body: JSON.stringify({ open_month_master: { current_year: data.year, current_month: data.month } })
      });
    }, { year: origYear, month: origMonth });

    // Clean up: delete the test payment
    const deleteBtn = page.locator("button[data-action='click->payments#confirmDelete']").first();
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Find the payment with "Test proceed saves payment" and delete it
      const rows = page.locator("tbody tr");
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent();
        if (rowText.includes("Test proceed saves payment")) {
          const delBtn = rows.nth(i).locator("button[data-action='click->payments#confirmDelete']");
          await delBtn.click();
          await page.waitForTimeout(300);
          await page.click("[data-action='click->payments#executeDelete']");
          await page.waitForTimeout(500);
          break;
        }
      }
    }
  });
});
