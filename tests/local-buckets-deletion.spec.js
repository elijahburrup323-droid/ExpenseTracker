const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000";
const EMAIL = "elijahburrup323@gmail.com";
const PASSWORD = "Eli624462!";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|mybudgethq\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Buckets: Deletion Logic", () => {
  test.describe.configure({ mode: "serial" });

  let defaultBucketId = null;
  let testBucketId = null;

  test("1. Setup: Create default bucket (first for an account)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/buckets`);
    await page.waitForTimeout(2000);

    // Check if buckets already exist
    const existing = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/buckets`, { headers: { Accept: "application/json" } });
      return res.json();
    }, BASE);

    if (existing.length > 0) {
      // Find an existing default bucket
      const defBucket = existing.find(b => b.is_default);
      if (defBucket) {
        defaultBucketId = defBucket.id;
        console.log(`Using existing default bucket: ${defBucket.name} (id=${defBucket.id})`);
        return;
      }
    }

    // Need to create a bucket — first one for an account auto-becomes default
    await page.click('button:has-text("Add Bucket")');
    await page.waitForTimeout(500);

    // Select first available account
    const accountSelect = page.locator('[data-buckets-target="modalAccount"]');
    const options = await accountSelect.locator("option").all();
    let selectedAccountName = "";
    for (const opt of options) {
      const val = await opt.getAttribute("value");
      if (val && val !== "") {
        await accountSelect.selectOption(val);
        selectedAccountName = await opt.textContent();
        break;
      }
    }
    console.log(`Creating default bucket on account: ${selectedAccountName}`);

    await page.fill('[data-buckets-target="modalName"]', "Primary-Test");
    await page.fill('[data-buckets-target="modalBalance"]', "0");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Verify it appeared and is default
    const buckets = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/buckets`, { headers: { Accept: "application/json" } });
      return res.json();
    }, BASE);

    const created = buckets.find(b => b.name === "Primary-Test");
    expect(created).toBeTruthy();
    expect(created.is_default).toBe(true);
    defaultBucketId = created.id;
    console.log(`Default bucket created: id=${defaultBucketId}`);
  });

  test("2. Setup: Create non-default bucket for deletion test", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/buckets`);
    await page.waitForTimeout(2000);

    expect(defaultBucketId).toBeTruthy();

    // Get the account_id of the default bucket
    const buckets = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/buckets`, { headers: { Accept: "application/json" } });
      return res.json();
    }, BASE);
    const defBucket = buckets.find(b => b.id === defaultBucketId);
    const accountId = defBucket.account_id;

    // Create a second bucket on the same account
    await page.click('button:has-text("Add Bucket")');
    await page.waitForTimeout(500);

    const accountSelect = page.locator('[data-buckets-target="modalAccount"]');
    await accountSelect.selectOption(String(accountId));

    await page.fill('[data-buckets-target="modalName"]', "TEST-DELETE-ME");
    await page.fill('[data-buckets-target="modalBalance"]', "0");
    await page.fill('[data-buckets-target="modalPriority"]', "5");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Verify
    const updated = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/buckets`, { headers: { Accept: "application/json" } });
      return res.json();
    }, BASE);

    const testBucket = updated.find(b => b.name === "TEST-DELETE-ME");
    expect(testBucket).toBeTruthy();
    expect(testBucket.is_default).toBe(false);
    testBucketId = testBucket.id;
    console.log(`Non-default bucket created: id=${testBucketId}`);
  });

  test("3. Default bucket delete button is disabled", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/buckets`);
    await page.waitForTimeout(2000);

    // Find the default bucket row by looking for the "Def" badge
    const defBadge = page.locator("td span:has-text('Def')");
    const defCount = await defBadge.count();
    console.log(`Default bucket badges: ${defCount}`);
    expect(defCount).toBeGreaterThan(0);

    // The default bucket row should NOT have a clickable delete button
    const defRow = defBadge.first().locator("xpath=ancestor::tr");
    const deleteBtn = defRow.locator('button[title="Delete"]');
    expect(await deleteBtn.count()).toBe(0);

    // Should have the disabled icon instead
    const disabledIcon = defRow.locator('span[title="Default bucket cannot be deleted"]');
    await expect(disabledIcon).toBeVisible();
    console.log("Default bucket delete button correctly disabled");
  });

  test("4. Delete non-default bucket succeeds via UI", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/buckets`);
    await page.waitForTimeout(2000);

    expect(testBucketId).toBeTruthy();

    // Find the TEST-DELETE-ME row
    const targetCell = page.locator("td:has-text('TEST-DELETE-ME')");
    await expect(targetCell.first()).toBeVisible({ timeout: 5000 });
    const targetRow = targetCell.first().locator("xpath=ancestor::tr");

    // Click delete button
    const delBtn = targetRow.locator('button[title="Delete"]');
    await expect(delBtn).toBeVisible();
    await delBtn.click();
    await page.waitForTimeout(500);

    // Confirmation modal should appear
    const modal = page.locator('[data-buckets-target="deleteModal"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-buckets-target="deleteModalName"]')).toHaveText("TEST-DELETE-ME");

    // Click Delete in modal and wait for API response
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/buckets/") && resp.request().method() === "DELETE"),
      modal.locator('button:has-text("Delete")').click(),
    ]);

    console.log(`DELETE response: ${response.status()}`);
    expect(response.status()).toBe(204);

    await page.waitForTimeout(1000);

    // Bucket should be gone from the table
    const remaining = page.locator("td:has-text('TEST-DELETE-ME')");
    expect(await remaining.count()).toBe(0);
    console.log("Non-default bucket successfully deleted");
  });

  test("5. API rejects deletion of default bucket", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/buckets`);
    await page.waitForTimeout(2000);

    expect(defaultBucketId).toBeTruthy();

    // Try to DELETE the default bucket directly via API
    const result = await page.evaluate(async ({ base, id }) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.content : "";
      const res = await fetch(`${base}/api/buckets/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token }
      });
      const body = res.status !== 204 ? await res.json().catch(() => null) : null;
      return { status: res.status, body };
    }, { base: BASE, id: defaultBucketId });

    console.log(`DELETE default bucket: status=${result.status}`, result.body);
    expect(result.status).toBe(422);
    expect(result.body?.errors?.[0]).toContain("Cannot delete the default bucket");
  });

  test("6. Cleanup: delete default bucket via soft-delete (direct DB)", async ({ page }) => {
    await login(page);

    // Soft-delete the test default bucket so it doesn't pollute future tests
    // We need to use the API for a non-default bucket, but for cleanup of the default
    // we'll just leave it — the test is complete
    console.log("Test suite complete. Default bucket remains (cannot be deleted via API by design).");
  });
});
