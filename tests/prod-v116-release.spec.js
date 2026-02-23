const { test, expect } = require("@playwright/test");

const PROD_BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", password: "Eli624462!", isAdmin: true },
  { email: "djburrup@gmail.com", password: "luckydjb", isAdmin: false },
];

async function login(page, email, password) {
  await page.goto(`${PROD_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${PROD_BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
  // Dismiss What's New popup if present
  await dismissWhatsNew(page);
}

async function dismissWhatsNew(page) {
  try {
    const overlay = page.locator("#whatsNewOverlay");
    if (await overlay.isVisible({ timeout: 2000 })) {
      // Click the overlay background to dismiss it
      await page.evaluate(() => {
        const el = document.getElementById("whatsNewOverlay");
        if (el) el.remove();
      });
      await page.waitForTimeout(300);
    }
  } catch (e) {
    // No popup, continue
  }
}

test.describe("Production: v1.1.6 Release Tests", () => {
  for (const account of ACCOUNTS) {
    test.describe(`Account: ${account.email}`, () => {

      test("QA Mode banner visible", async ({ page }) => {
        await login(page, account.email, account.password);
        const banner = page.locator("text=NEW RELEASE QA MODE");
        await expect(banner).toBeVisible();
        await expect(banner).toContainText("1.1.6");
      });

      test("Version 1.1.6 in footer", async ({ page }) => {
        await login(page, account.email, account.password);
        const footer = page.locator("footer");
        await expect(footer).toContainText("1.1.6");
      });

      test("Pricing page loads with 3 tiers", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/pricing`);
        await page.waitForLoadState("networkidle");
        await dismissWhatsNew(page);

        // Check page title (use getByRole to avoid strict mode with multiple h1)
        await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible();

        // Check 3 tier headings
        await expect(page.locator("h3", { hasText: "Free" })).toBeVisible();
        await expect(page.locator("h3", { hasText: "Paid" })).toBeVisible();
        await expect(page.locator("h3", { hasText: "Advanced" })).toBeVisible();

        // Check monthly prices visible
        await expect(page.locator("text=$0")).toBeVisible();
        await expect(page.locator("text=$3.99")).toBeVisible();
        await expect(page.locator("text=$5.99")).toBeVisible();
      });

      test("Pricing page billing toggle works", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/pricing`);
        await page.waitForLoadState("networkidle");
        await dismissWhatsNew(page);

        // Click Annual
        await page.click("button:has-text('Annual')");
        await page.waitForTimeout(300);

        // Annual prices should show
        await expect(page.locator("text=$2.08")).toBeVisible();
        await expect(page.locator("text=$2.92")).toBeVisible();

        // Savings badges visible
        await expect(page.locator("text=Billed $25/year")).toBeVisible();
        await expect(page.locator("text=Billed $35/year")).toBeVisible();

        // Click Monthly back
        await page.click("button:has-text('Monthly')");
        await page.waitForTimeout(300);

        // Monthly prices should return
        await expect(page.locator("text=$3.99")).toBeVisible();
        await expect(page.locator("text=$5.99")).toBeVisible();
      });

      test("Upgrade link in header profile dropdown", async ({ page }) => {
        await login(page, account.email, account.password);
        await dismissWhatsNew(page);

        // Open the header profile dropdown
        const profileBtn = page.locator(".sticky.top-0 [data-controller='dropdown'] button").first();
        await profileBtn.click();
        await page.waitForTimeout(300);

        // Upgrade link should be visible
        const upgradeLink = page.locator(".sticky.top-0 [data-controller='dropdown'] a:has-text('Upgrade')");
        await expect(upgradeLink).toBeVisible();

        // Click it — should navigate to pricing
        await upgradeLink.click();
        await page.waitForURL(`${PROD_BASE}/pricing`);
        await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible();
      });

      test("Upgrade link in sidebar profile dropdown", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(500);
        await dismissWhatsNew(page);

        // Open sidebar profile dropdown (bottom of sidebar)
        const sidebarProfileBtn = page.locator("aside [data-controller='dropdown'] button").first();
        await sidebarProfileBtn.click();
        await page.waitForTimeout(300);

        // Upgrade link in sidebar
        const upgradeLink = page.locator("aside [data-controller='dropdown'] a:has-text('Upgrade')");
        await expect(upgradeLink).toBeVisible();
      });

      test("Settings page Subscribe/Renew or subscription info visible", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/users/edit`);
        await page.waitForLoadState("networkidle");

        // The subscription section should exist
        const subscriptionSection = page.locator("h2:has-text('Subscription Information')");
        await expect(subscriptionSection).toBeVisible();

        // Either Subscribe link (not subscribed) or active subscriber badge (subscribed)
        const subscribeLink = page.locator("a:has-text('Subscribe'), a:has-text('Renew Subscription')");
        const activeBadge = page.locator("text=Active Subscriber");
        const hasSubscribe = await subscribeLink.count() > 0;
        const hasActive = await activeBadge.isVisible().catch(() => false);

        // At least one should be true
        expect(hasSubscribe || hasActive).toBeTruthy();

        // If subscribe link exists, verify it points to pricing
        if (hasSubscribe && await subscribeLink.first().isVisible().catch(() => false)) {
          const href = await subscribeLink.first().getAttribute("href");
          expect(href).toContain("pricing");
        }
      });

      test("Dashboard loads correctly", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/dashboard`);
        await page.waitForLoadState("networkidle");
        const hello = page.locator("h1:has-text('Hello')");
        await expect(hello).toBeVisible();
      });

      test("Payments page loads with Print button", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/payments`);
        await page.waitForLoadState("networkidle");

        // Print button should exist
        const printBtn = page.locator("button[data-action*='printView']");
        await expect(printBtn).toBeVisible();
      });

      // Upload button only visible for admin
      if (account.isAdmin) {
        test("Upload button visible on Accounts (admin)", async ({ page }) => {
          await login(page, account.email, account.password);
          await page.goto(`${PROD_BASE}/accounts`);
          await page.waitForLoadState("networkidle");

          const uploadBtn = page.locator("button:has-text('Upload')");
          await expect(uploadBtn).toBeVisible();
        });

        test("Upload modal opens and has format radios", async ({ page }) => {
          await login(page, account.email, account.password);
          await page.goto(`${PROD_BASE}/accounts`);
          await page.waitForLoadState("networkidle");

          // Click Upload button
          await page.click("button:has-text('Upload')");
          await page.waitForTimeout(500);

          // Modal should be visible
          const modalTitle = page.locator("h3:has-text('Upload Accounts')");
          await expect(modalTitle).toBeVisible();

          // CSV and Excel radio buttons
          await expect(page.locator("input[value='csv']")).toBeVisible();
          await expect(page.locator("input[value='excel']")).toBeVisible();

          // Download Template button
          await expect(page.locator("button:has-text('Download Template')")).toBeVisible();

          // Close modal
          await page.click("button:has-text('Cancel')");
        });

        test("Upload button on all 9 screens (admin)", async ({ page }) => {
          await login(page, account.email, account.password);
          const screens = [
            "/accounts", "/payments", "/income_entries",
            "/transfer_masters", "/account_types",
            "/spending_categories", "/spending_types",
            "/income_recurrings", "/quotes",
          ];

          for (const screen of screens) {
            await page.goto(`${PROD_BASE}${screen}`);
            await page.waitForLoadState("networkidle");
            const uploadBtn = page.locator("button:has-text('Upload')");
            await expect(uploadBtn).toBeVisible({ timeout: 5000 });
          }
        });
      }

      test("Key pages load without errors", async ({ page }) => {
        await login(page, account.email, account.password);
        const pages = [
          "/dashboard", "/accounts", "/payments",
          "/income_entries", "/transfer_masters",
          "/spending_categories", "/spending_types",
          "/account_types", "/income_recurrings",
          "/pricing",
        ];

        for (const p of pages) {
          const resp = await page.goto(`${PROD_BASE}${p}`);
          expect(resp.status()).toBeLessThan(400);
        }
      });

    });
  }
});
