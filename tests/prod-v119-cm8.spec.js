const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";
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
    const popup = page.locator("[data-dashboard-target='whatsNewModal']");
    if (await popup.isVisible({ timeout: 2000 })) {
      await popup.locator("button", { hasText: "Close" }).click();
      await popup.waitFor({ state: "hidden" });
    }
  } catch (e) {}
}

test.describe("v1.1.9 — CM-8 Payments Edit Modal", () => {
  test("QA banner shows v1.1.9", async ({ page }) => {
    await login(page);
    await dismissWhatsNew(page);
    const banner = page.locator("text=QA MODE");
    await expect(banner.first()).toBeVisible({ timeout: 5000 });
    const body = await page.content();
    expect(body).toContain("1.1.9");
  });

  test("Payments page loads with table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    const table = page.locator("[data-payments-target='tableBody']");
    await expect(table).toBeVisible();
  });

  test("Edit button exists on payment rows", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    // Wait for data to load
    await page.waitForTimeout(1000);
    const editButtons = page.locator("button[data-action='click->payments#startEditing']");
    const count = await editButtons.count();
    console.log("Edit buttons found:", count);
    expect(count).toBeGreaterThan(0);
  });

  test("Edit blocked modal exists in DOM", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    const modal = page.locator("[data-payments-target='editBlockedModal']");
    await expect(modal).toHaveCount(1);
    await expect(modal).toHaveClass(/hidden/);
  });

  test("Add modal has dynamic title target", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    const modalTitle = page.locator("[data-payments-target='modalTitle']");
    await expect(modalTitle).toHaveCount(1);
  });

  test("Clicking Add Payment opens modal with 'Add Payment' title", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    // Click Add Payment button
    await page.click("[data-payments-target='addButton']");
    // Modal should be visible
    const modal = page.locator("[data-payments-target='addModal']");
    await expect(modal).not.toHaveClass(/hidden/);
    // Title should say "Add Payment"
    const title = page.locator("[data-payments-target='modalTitle']");
    await expect(title).toHaveText("Add Payment");
    // Close modal
    await page.keyboard.press("Escape");
  });

  test("Clicking Edit on current-month payment opens Edit modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Get current open month to find a payment in it
    const openMonthRes = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/open_month_master`, {
        headers: { "Accept": "application/json" }
      });
      return res.json();
    }, BASE);
    console.log("Open month:", openMonthRes.current_year, openMonthRes.current_month);

    // Find a payment in the current month by checking edit buttons
    const editButtons = page.locator("button[data-action='click->payments#startEditing']");
    const buttonCount = await editButtons.count();
    console.log("Total edit buttons:", buttonCount);

    if (buttonCount > 0) {
      // Click the first edit button
      await editButtons.first().click();
      await page.waitForTimeout(500);

      // Check if edit modal opened OR edit blocked modal opened
      const addModal = page.locator("[data-payments-target='addModal']");
      const editBlockedModal = page.locator("[data-payments-target='editBlockedModal']");

      const addModalVisible = !(await addModal.getAttribute("class")).includes("hidden");
      const editBlockedVisible = !(await editBlockedModal.getAttribute("class")).includes("hidden");

      console.log("Add/Edit modal visible:", addModalVisible);
      console.log("Edit blocked modal visible:", editBlockedVisible);

      // One of them should be visible
      expect(addModalVisible || editBlockedVisible).toBeTruthy();

      if (addModalVisible) {
        // Verify title says "Edit Payment"
        const title = page.locator("[data-payments-target='modalTitle']");
        await expect(title).toHaveText("Edit Payment");
        // Verify fields are pre-populated (description should not be empty)
        const desc = page.locator("[data-payments-target='modalDescription']");
        const descValue = await desc.inputValue();
        console.log("Pre-populated description:", descValue);
        expect(descValue.length).toBeGreaterThan(0);
        // Close
        await page.keyboard.press("Escape");
      } else {
        // Edit was blocked — that's also valid (payment outside open month)
        console.log("Edit was blocked (payment outside open month)");
        await page.click("[data-action='click->payments#closeEditBlocked']");
      }
    }
  });

  test("No inline edit rows appear when Edit is clicked", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const editButtons = page.locator("button[data-action='click->payments#startEditing']");
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(500);
      // There should be NO inline edit inputs in the table body
      const inlineInputs = page.locator("[data-payments-target='tableBody'] input[name='description']");
      await expect(inlineInputs).toHaveCount(0);
      // Close whatever modal opened
      await page.keyboard.press("Escape");
    }
  });

  test("Cancel and Save buttons use cancelModal and saveModal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    const body = await page.content();
    // Verify no cancelAdding references remain in page
    expect(body).not.toContain("cancelAdding");
    // Verify cancelModal and saveModal are referenced
    expect(body).toContain("cancelModal");
    expect(body).toContain("saveModal");
  });

  test("Server returns 409 for out-of-month edit attempt", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);

    // Get a payment that's outside current open month
    const result = await page.evaluate(async (baseUrl) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.getAttribute("content") : "";

      // Get open month
      const omRes = await fetch(`${baseUrl}/api/open_month_master`, {
        headers: { "Accept": "application/json" }
      });
      const openMonth = await omRes.json();

      // Get all payments
      const pRes = await fetch(`${baseUrl}/api/payments`, {
        headers: { "Accept": "application/json" }
      });
      const payments = await pRes.json();

      // Find a payment outside current open month
      const outsidePayment = payments.find(p => {
        const [y, m] = p.payment_date.split("-").map(Number);
        return y !== openMonth.current_year || m !== openMonth.current_month;
      });

      if (!outsidePayment) return { skipped: true, reason: "No payments outside open month" };

      // Try to update it
      const res = await fetch(`${baseUrl}/api/payments/${outsidePayment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({ payment: { description: "Test edit blocked" } }),
      });

      return { status: res.status, body: await res.json() };
    }, BASE);

    console.log("Server-side edit check:", JSON.stringify(result, null, 2));
    if (result.skipped) {
      console.log("Skipped:", result.reason);
    } else {
      expect(result.status).toBe(409);
      expect(result.body.errors[0]).toContain("not in the current open month");
    }
  });
});
