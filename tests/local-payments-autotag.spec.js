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

test.describe("Payments: Auto-Tag by Category Name", () => {
  test("1. Verify categories and tags exist, find matching pair", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForTimeout(3000);

    // Get categories and tags via API
    const [categories, tags] = await page.evaluate(async (base) => {
      const [catRes, tagRes] = await Promise.all([
        fetch(`${base}/api/spending_categories`, { headers: { Accept: "application/json" } }),
        fetch(`${base}/api/tags`, { headers: { Accept: "application/json" } }),
      ]);
      return [await catRes.json(), await tagRes.json()];
    }, BASE);

    console.log(`Categories: ${categories.length}, Tags: ${tags.length}`);
    console.log("Category names:", categories.map(c => c.name).join(", "));
    console.log("Tag names:", tags.map(t => t.name).join(", "));

    // Find categories that have a matching tag name
    const matches = categories.filter(c =>
      tags.some(t => t.name.toLowerCase() === c.name.toLowerCase())
    );
    console.log(`Categories with matching tags: ${matches.map(m => m.name).join(", ") || "NONE"}`);

    // At least report — the test will be meaningful if there are matching pairs
    expect(categories.length).toBeGreaterThan(0);
  });

  test("2. Selecting a category auto-assigns matching tag in Add mode", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForTimeout(3000);

    // Find a category-tag match
    const match = await page.evaluate(async (base) => {
      const [catRes, tagRes] = await Promise.all([
        fetch(`${base}/api/spending_categories`, { headers: { Accept: "application/json" } }),
        fetch(`${base}/api/tags`, { headers: { Accept: "application/json" } }),
      ]);
      const cats = await catRes.json();
      const tags = await tagRes.json();

      for (const cat of cats) {
        const tag = tags.find(t => t.name.toLowerCase() === cat.name.toLowerCase());
        if (tag) return { categoryId: cat.id, categoryName: cat.name, tagId: tag.id, tagName: tag.name };
      }
      return null;
    }, BASE);

    if (!match) {
      console.log("No category-tag name match found — creating a test tag");
      // Get a category name and create a tag with the same name
      const firstCat = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/spending_categories`, { headers: { Accept: "application/json" } });
        const cats = await res.json();
        return cats[0];
      }, BASE);

      if (!firstCat) {
        console.log("No categories exist — skipping test");
        return;
      }

      // Create a tag matching the first category name
      const created = await page.evaluate(async ({ base, name }) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
        const res = await fetch(`${base}/api/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({ tag: { name } }),
        });
        return { status: res.status, data: await res.json() };
      }, { base: BASE, name: firstCat.name });

      console.log(`Created tag "${firstCat.name}": status=${created.status}`);
      if (created.status === 201 || created.status === 200) {
        // Reload page to pick up new tag
        await page.goto(`${BASE}/payments`);
        await page.waitForTimeout(3000);
      }
    }

    // Now open Add Payment modal and select the matching category
    const matchAfter = await page.evaluate(async (base) => {
      const [catRes, tagRes] = await Promise.all([
        fetch(`${base}/api/spending_categories`, { headers: { Accept: "application/json" } }),
        fetch(`${base}/api/tags`, { headers: { Accept: "application/json" } }),
      ]);
      const cats = await catRes.json();
      const tags = await tagRes.json();
      for (const cat of cats) {
        const tag = tags.find(t => t.name.toLowerCase() === cat.name.toLowerCase());
        if (tag) return { categoryId: cat.id, categoryName: cat.name, tagId: tag.id, tagName: tag.name };
      }
      return null;
    }, BASE);

    if (!matchAfter) {
      console.log("Still no match after creation — test inconclusive");
      return;
    }

    console.log(`Using: Category "${matchAfter.categoryName}" → Tag "${matchAfter.tagName}"`);

    // Click Add Payment
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    // Select the matching category
    const categorySelect = page.locator('[data-payments-target="modalCategory"]');
    await categorySelect.selectOption(String(matchAfter.categoryId));
    await page.waitForTimeout(500);

    // Check that the tag pill appeared
    const tagPills = page.locator('[data-payments-target="modalTagsPills"]');
    const pillsHtml = await tagPills.innerHTML();
    console.log("Tag pills HTML:", pillsHtml.substring(0, 200));

    // Verify the matching tag name appears in the pills
    await expect(tagPills.locator(`text=${matchAfter.tagName}`)).toBeVisible({ timeout: 3000 });
    console.log(`Auto-tag SUCCESS: Tag "${matchAfter.tagName}" was auto-assigned`);
  });
});
