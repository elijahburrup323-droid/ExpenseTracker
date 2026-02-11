const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

// Agent account (admin)
const AGENT = { email: "test@example.com", password: "password123" };

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Quotes — Admin CRUD", () => {
  test("Sign-in page shows a quote", async ({ page }) => {
    await page.goto(`${BASE}/users/sign_in`);
    await page.waitForLoadState("networkidle");

    // Should have either a quote or the default "Sign in to your account" text
    const quoteOrDefault = page.locator(".text-center p.italic, .text-center p:has-text('Sign in to your account')");
    await expect(quoteOrDefault.first()).toBeVisible();
  });

  test("Quotes page loads for admin", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/quotes`);
    await page.waitForLoadState("networkidle");

    // Page header visible
    await expect(page.locator("h1:has-text('Quotes')")).toBeVisible();

    // Table should have quotes loaded (from seed)
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("Admin menu shows Quotes link", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Look for Quotes in the sidebar admin section
    const quotesLink = page.locator("a:has-text('Quotes')");
    await expect(quotesLink.first()).toBeVisible();
  });

  test("Can add, edit, and delete a quote", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/quotes`);
    await page.waitForLoadState("networkidle");

    // Wait for table to populate with seeded quotes
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // --- ADD ---
    await page.click("button:has-text('Add Quote')");
    await page.fill("textarea[name='quote_text']", "Test quote from Playwright");
    await page.fill("input[name='quote_author']", "Playwright Bot");

    const [createResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/quotes") && resp.request().method() === "POST" && resp.status() === 201),
      page.click("button[title='Save']"),
    ]);
    const created = await createResp.json();
    expect(created.quote_text).toBe("Test quote from Playwright");
    expect(created.quote_author).toBe("Playwright Bot");

    // Verify row appears
    await expect(page.locator("td:has-text('Test quote from Playwright')")).toBeVisible();

    // --- EDIT ---
    const editBtn = page.locator(`button[data-id="${created.id}"][title="Edit"]`);
    await editBtn.click();
    await page.fill("textarea[name='quote_text']", "Updated test quote");

    const [updateResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/quotes/${created.id}`) && resp.request().method() === "PUT"),
      page.click("button[title='Save']"),
    ]);
    const updated = await updateResp.json();
    expect(updated.quote_text).toBe("Updated test quote");

    await expect(page.locator("td:has-text('Updated test quote')")).toBeVisible();

    // --- TOGGLE ACTIVE ---
    const toggle = page.locator(`button.active-toggle[data-id="${created.id}"]`);
    const wasChecked = await toggle.getAttribute("data-checked");
    expect(wasChecked).toBe("true");

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/quotes/${created.id}`) && resp.request().method() === "PUT"),
      toggle.click(),
    ]);
    const nowChecked = await toggle.getAttribute("data-checked");
    expect(nowChecked).toBe("false");

    // --- DELETE ---
    const deleteBtn = page.locator(`button[data-id="${created.id}"][title="Delete"]`);
    await deleteBtn.click();

    // Modal should appear
    await expect(page.locator("h3:has-text('Delete Quote')")).toBeVisible();

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/quotes/${created.id}`) && resp.request().method() === "DELETE" && resp.status() === 204),
      page.click("button:has-text('Delete'):not([data-action*='cancelDelete'])"),
    ]);

    // Row should be gone
    await expect(page.locator("td:has-text('Updated test quote')")).not.toBeVisible();
  });

  test("Header bar shows daily quote", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // The top header bar should show a quote (italic text)
    const quoteText = page.locator(".sticky p.italic");
    await expect(quoteText).toBeVisible();
    const text = await quoteText.textContent();
    expect(text.length).toBeGreaterThan(5);
  });
});
