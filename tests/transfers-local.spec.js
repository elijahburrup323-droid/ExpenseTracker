const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/mybudgethq";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Transfers Module — Local", () => {
  test("Page loads with sticky header and empty table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");

    // Sticky header with title
    const sticky = page.locator(".sticky.top-14.z-20");
    await expect(sticky).toBeVisible();
    await expect(sticky.locator("h1")).toContainText("Account Transfers");

    // + Transfer button visible
    const addBtn = sticky.locator('button:has-text("Transfer")');
    await expect(addBtn).toBeVisible();
  });

  test("Sidebar shows Transfers under Accounts", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");

    // Check sidebar has Transfers link
    const transferLink = page.locator('nav a:has-text("Transfers")');
    await expect(transferLink).toBeVisible();
  });

  test("Add transfer modal opens and validates", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");

    // Click + Transfer button
    await page.click('button:has-text("Transfer")');

    // Modal should appear
    const modalTitle = page.locator('[data-transfer-masters-target="modalTitle"]');
    await expect(modalTitle).toContainText("Transfer Money Between Accounts");

    // Try to save without filling fields
    await page.click('button:has-text("Transfer"):not([data-action*="openAddModal"])');
    const error = page.locator('[data-transfer-masters-target="modalError"]');
    await expect(error).toBeVisible();

    // Cancel closes modal
    await page.click('button:has-text("Cancel")');
    const modal = page.locator('[data-transfer-masters-target="modal"]');
    await expect(modal).toHaveClass(/hidden/);
  });

  test("Full CRUD: create, edit, delete transfer", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");

    // First ensure we have at least 2 accounts
    const accountsRes = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/accounts`, { headers: { "Accept": "application/json" } });
      return res.json();
    }, BASE);

    if (accountsRes.length < 2) {
      test.skip("Need at least 2 accounts for transfer test");
      return;
    }

    // Create a transfer
    await page.click('button:has-text("Transfer")');
    await page.waitForTimeout(300);

    // Select first account for From
    await page.selectOption('[data-transfer-masters-target="modalFrom"]', { index: 1 });
    // Select second account for To
    await page.selectOption('[data-transfer-masters-target="modalTo"]', { index: 2 });
    // Set date
    await page.fill('[data-transfer-masters-target="modalDate"]', "2026-02-10");
    // Set amount
    await page.fill('[data-transfer-masters-target="modalAmount"]', "100.00");
    // Set memo
    await page.fill('[data-transfer-masters-target="modalMemo"]', "Test transfer");

    // Save
    await page.click('[data-transfer-masters-target="modalSaveButton"]');
    await page.waitForTimeout(1000);

    // Should see the transfer in the table
    const tableBody = page.locator('[data-transfer-masters-target="tableBody"]');
    await expect(tableBody.locator("tr").first()).toContainText("$100.00");
    await expect(tableBody.locator("tr").first()).toContainText("Test transfer");

    // Edit the transfer
    await page.click('button[title="Edit"]');
    await page.waitForTimeout(300);
    const editTitle = page.locator('[data-transfer-masters-target="modalTitle"]');
    await expect(editTitle).toContainText("Edit Transfer Record");

    await page.fill('[data-transfer-masters-target="modalAmount"]', "250.00");
    await page.fill('[data-transfer-masters-target="modalMemo"]', "Updated transfer");
    await page.click('[data-transfer-masters-target="modalSaveButton"]');
    await page.waitForTimeout(1000);

    await expect(tableBody.locator("tr").first()).toContainText("$250.00");
    await expect(tableBody.locator("tr").first()).toContainText("Updated transfer");

    // Delete the transfer
    await page.click('button[title="Delete"]');
    await page.waitForTimeout(300);
    const deleteTitle = page.locator("h3", { hasText: "Delete Transfer" });
    await expect(deleteTitle).toBeVisible();

    await page.click('button:has-text("Delete"):not([title="Delete"])');
    await page.waitForTimeout(1000);

    // Table should be empty again (or not have the deleted item)
    const bodyText = await tableBody.textContent();
    expect(bodyText).not.toContain("Updated transfer");
  });
});
