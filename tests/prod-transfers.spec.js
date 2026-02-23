const { test, expect } = require("@playwright/test");

const PROD_BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", password: "Eli624462!" },
  { email: "djburrup@gmail.com", password: "luckydjb" },
];

async function login(page, email, password) {
  await page.goto(`${PROD_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${PROD_BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Production: Transfers Module (CM12)", () => {
  for (const account of ACCOUNTS) {
    test.describe(`Account: ${account.email}`, () => {

      test("Page loads with sticky header and Transfer button", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/transfer_masters`);
        await page.waitForLoadState("networkidle");

        const sticky = page.locator(".sticky.top-14.z-20");
        await expect(sticky).toBeVisible();
        await expect(sticky.locator("h1")).toContainText("Account Transfers");

        const addBtn = sticky.locator('button:has-text("Transfer")');
        await expect(addBtn).toBeVisible();
      });

      test("Sidebar shows Transfers under Accounts", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/transfer_masters`);
        await page.waitForLoadState("networkidle");

        const transferLink = page.locator('nav a:has-text("Transfers")');
        await expect(transferLink).toBeVisible();
      });

      test("Add transfer modal opens with proper fields", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/transfer_masters`);
        await page.waitForLoadState("networkidle");

        await page.click('button:has-text("Transfer")');
        await page.waitForTimeout(300);

        const modalTitle = page.locator('[data-transfer-masters-target="modalTitle"]');
        await expect(modalTitle).toContainText("Transfer Money Between Accounts");

        // Verify all form fields exist
        await expect(page.locator('[data-transfer-masters-target="modalFrom"]')).toBeVisible();
        await expect(page.locator('[data-transfer-masters-target="modalTo"]')).toBeVisible();
        await expect(page.locator('[data-transfer-masters-target="modalDate"]')).toBeVisible();
        await expect(page.locator('[data-transfer-masters-target="modalAmount"]')).toBeVisible();
        await expect(page.locator('[data-transfer-masters-target="modalMemo"]')).toBeVisible();

        // From dropdown should have account options
        const fromOptions = await page.locator('[data-transfer-masters-target="modalFrom"] option').count();
        expect(fromOptions).toBeGreaterThan(1);

        // Cancel closes modal
        await page.click('button:has-text("Cancel")');
        const modal = page.locator('[data-transfer-masters-target="modal"]');
        await expect(modal).toHaveClass(/hidden/);
      });

      test("Validation: same account shows error", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/transfer_masters`);
        await page.waitForLoadState("networkidle");

        await page.click('button:has-text("Transfer")');
        await page.waitForTimeout(300);

        // Select same account for From and To
        await page.selectOption('[data-transfer-masters-target="modalFrom"]', { index: 1 });
        await page.selectOption('[data-transfer-masters-target="modalTo"]', { index: 1 });
        await page.fill('[data-transfer-masters-target="modalDate"]', "2026-02-10");
        await page.fill('[data-transfer-masters-target="modalAmount"]', "100.00");

        await page.click('[data-transfer-masters-target="modalSaveButton"]');
        await page.waitForTimeout(300);

        const error = page.locator('[data-transfer-masters-target="modalError"]');
        await expect(error).toBeVisible();
        await expect(error).toContainText("same");

        await page.click('button:has-text("Cancel")');
      });

      test("Full CRUD: create, edit, delete transfer", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/transfer_masters`);
        await page.waitForLoadState("networkidle");

        // Get accounts to verify we have enough
        const fromOptions = await page.locator('[data-transfer-masters-target="modalFrom"] option').count();

        // Create
        await page.click('button:has-text("Transfer")');
        await page.waitForTimeout(300);
        expect(await page.locator('[data-transfer-masters-target="modalFrom"] option').count()).toBeGreaterThan(2);

        await page.selectOption('[data-transfer-masters-target="modalFrom"]', { index: 1 });
        await page.selectOption('[data-transfer-masters-target="modalTo"]', { index: 2 });
        await page.fill('[data-transfer-masters-target="modalDate"]', "2026-02-09");
        await page.fill('[data-transfer-masters-target="modalAmount"]', "42.50");
        await page.fill('[data-transfer-masters-target="modalMemo"]', "Prod test xfer");

        await page.click('[data-transfer-masters-target="modalSaveButton"]');
        await page.waitForTimeout(1500);

        // Verify row appears
        const tableBody = page.locator('[data-transfer-masters-target="tableBody"]');
        await expect(tableBody.locator("tr").first()).toContainText("$42.50");
        await expect(tableBody.locator("tr").first()).toContainText("Prod test xfer");

        // Edit
        await tableBody.locator('button[title="Edit"]').first().click();
        await page.waitForTimeout(300);
        await expect(page.locator('[data-transfer-masters-target="modalTitle"]')).toContainText("Edit Transfer Record");

        await page.fill('[data-transfer-masters-target="modalAmount"]', "99.99");
        await page.fill('[data-transfer-masters-target="modalMemo"]', "Edited xfer");
        await page.click('[data-transfer-masters-target="modalSaveButton"]');
        await page.waitForTimeout(1500);

        await expect(tableBody.locator("tr").first()).toContainText("$99.99");
        await expect(tableBody.locator("tr").first()).toContainText("Edited xfer");

        // Delete
        await tableBody.locator('button[title="Delete"]').first().click();
        await page.waitForTimeout(300);
        await expect(page.locator("h3", { hasText: "Delete Transfer" })).toBeVisible();

        await page.click('button:has-text("Delete"):not([title="Delete"])');
        await page.waitForTimeout(1500);

        const bodyText = await tableBody.textContent();
        expect(bodyText).not.toContain("Edited xfer");
      });
    });
  }
});
