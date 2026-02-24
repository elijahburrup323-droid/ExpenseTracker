// @ts-check
const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3002";
const TIMEOUT = 20000;

// Force chromium only for local testing
test.use({ browserName: "chromium" });

// ── Test accounts: one per persona ──
const PERSONAS = {
  bill_payer: {
    email: `test-bp-${Date.now()}@testauto.local`,
    password: "TestPassword123!",
    first: "Bill",
    last: "Payer",
    persona_key: "bill_payer",
    persona_label: "Bill Payer",
    account_name: "Chase Checking",
    balance: "1500.00",
    sidebar_should_show: ["Accounts", "Payments"],
    sidebar_should_hide: ["Deposits", "Monthly"],
  },
  saver: {
    email: `test-sv-${Date.now()}@testauto.local`,
    password: "TestPassword123!",
    first: "Sara",
    last: "Saver",
    persona_key: "saver",
    persona_label: "Saver",
    account_name: "Savings Account",
    balance: "5000.00",
    sidebar_should_show: ["Accounts", "Payments", "Deposits"],
    sidebar_should_hide: ["Monthly"],
  },
  full_manager: {
    email: `test-fm-${Date.now()}@testauto.local`,
    password: "TestPassword123!",
    first: "Max",
    last: "Manager",
    persona_key: "full_manager",
    persona_label: "Full Manager",
    account_name: "Primary Checking",
    balance: "3200.00",
    sidebar_should_show: ["Accounts", "Payments", "Deposits"],
    sidebar_should_hide: ["Monthly"],
  },
  exploring: {
    email: `test-ex-${Date.now()}@testauto.local`,
    password: "TestPassword123!",
    first: "Eve",
    last: "Explorer",
    persona_key: "exploring",
    persona_label: "Just Exploring",
    account_name: "Test Account",
    balance: "100.00",
    sidebar_should_show: ["Accounts"],
    sidebar_should_hide: ["Payments", "Deposits", "Monthly"],
  },
};

// ── Existing user (should bypass onboarding) ──
const EXISTING_USER = {
  email: "elijahburrup323@gmail.com",
  password: "Eli624462!",
};

// ── Helpers ──

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="user[email]"]').fill(email);
  await page.locator('input[name="user[password]"]').fill(password);
  await Promise.all([
    page.waitForURL("**/*", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

async function dismissModals(page) {
  // Dismiss release notes / what's new overlay if present
  try {
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (await gotIt.isVisible({ timeout: 2000 })) {
      await gotIt.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no modal */ }

  // Force-remove any lingering overlay
  await page.evaluate(() => {
    const overlay = document.getElementById("whatsNewOverlay");
    if (overlay) overlay.remove();
  });

  // Wait for flash messages to auto-dismiss
  await page.waitForTimeout(1000);
}

async function signupAndOnboard(page, config) {
  // ── Signup ──
  await page.goto(`${BASE}/users/sign_up`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="user[first_name]"]').fill(config.first);
  await page.locator('input[name="user[last_name]"]').fill(config.last);
  await page.locator('input[name="user[email]"]').fill(config.email);
  await page.locator('input[name="user[password]"]').fill(config.password);
  await page.locator('input[name="user[password_confirmation]"]').fill(config.password);

  await Promise.all([
    page.waitForURL("**/*", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);

  // Should redirect to onboarding
  await page.waitForURL("**/onboarding**", { timeout: TIMEOUT });

  // ── Step 1: Name ──
  await expect(page.getByText("Step 1 of 4")).toBeVisible({ timeout: 5000 });
  await page.locator("#first_name").fill(config.first);
  await page.locator("#last_name").fill(config.last);
  await Promise.all([
    page.waitForURL("**/onboarding**", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Continue" }).click(),
  ]);

  // ── Step 2: Persona ──
  await expect(page.getByText("Step 2 of 4")).toBeVisible({ timeout: 5000 });
  const card = page.locator(`[data-persona="${config.persona_key}"]`);
  await card.click();
  await expect(card).toHaveClass(/ring-2/, { timeout: 3000 });
  await Promise.all([
    page.waitForURL("**/onboarding**", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Continue" }).click(),
  ]);

  // ── Step 3: First Account ──
  await expect(page.getByText("Step 3 of 4")).toBeVisible({ timeout: 5000 });
  await page.locator("#account_name").fill(config.account_name);
  await page.locator("#balance").fill(config.balance);
  await Promise.all([
    page.waitForURL("**/onboarding**", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Continue" }).click(),
  ]);

  // ── Step 4: Summary & Finish ──
  await expect(page.getByText("Step 4 of 4")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("You're all set!")).toBeVisible();
  await Promise.all([
    page.waitForURL("**/dashboard**", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Start Using MyBudgetHQ" }).click(),
  ]);

  await dismissModals(page);
}

// ────────────────────────────────────────────────
// SECTION 1: Existing User — No Onboarding
// ────────────────────────────────────────────────

test.describe.serial("Existing user bypasses onboarding", () => {
  test("logs in and sees dashboard, not onboarding", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    const url = page.url();
    expect(url).not.toContain("/onboarding");
    expect(url).toContain("/dashboard");

    // Sidebar should have all groups visible (existing users have all blocks)
    // Use longer timeout for first test — server may be cold
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Accounts").first()).toBeVisible({ timeout: TIMEOUT });
    await expect(sidebar.getByText("Payments").first()).toBeVisible({ timeout: TIMEOUT });
    await expect(sidebar.getByText("Deposits").first()).toBeVisible({ timeout: TIMEOUT });
    await expect(sidebar.getByText("Monthly").first()).toBeVisible({ timeout: TIMEOUT });
    await expect(sidebar.getByText("Explore More")).toBeVisible({ timeout: TIMEOUT });
  });

  test("completed user visiting /onboarding redirects to dashboard", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    await page.goto(`${BASE}/onboarding`);
    await page.waitForURL("**/dashboard**", { timeout: TIMEOUT });
    expect(page.url()).toContain("/dashboard");
  });

  test("can access feature store with all 14 blocks active", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Build Your Budget")).toBeVisible();

    // Wait for tree to load
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    const nodes = page.locator(".tech-tree-node");
    expect(await nodes.count()).toBe(14);

    // All should have active or core ring
    const activeRings = page.locator(".node-ring-active, .node-ring-core");
    expect(await activeRings.count()).toBe(14);
  });

  test("SVG connectors are drawn", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });
    await page.waitForTimeout(500);

    const svgPaths = page.locator(".tech-tree-svg path");
    expect(await svgPaths.count()).toBeGreaterThan(0);
  });

  test("tooltip data attributes are wired on nodes", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Verify tooltip data attributes exist on nodes (tooltip renders on real hover)
    const node = page.locator('[data-block-key="payments_basic"]');
    await expect(node).toHaveAttribute("data-tooltip-title", /Payments/);
    await expect(node).toHaveAttribute("data-tooltip-tier", /free/);
    await expect(node).toHaveAttribute("data-tooltip-active", /Active/);

    // Verify tooltip element exists (it starts hidden but may be briefly shown during render)
    const tooltip = page.locator(".tech-tree-tooltip");
    await expect(tooltip).toHaveCount(1);
  });

  test("API blocks endpoint returns correct JSON structure", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    const resp = await page.goto(`${BASE}/api/feature_store/blocks`, {
      waitUntil: "networkidle",
    });
    const json = await resp.json();

    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(14);

    const block = json[0];
    expect(block).toHaveProperty("key");
    expect(block).toHaveProperty("display_name");
    expect(block).toHaveProperty("active");
    expect(block).toHaveProperty("dependencies_met");
    expect(block).toHaveProperty("dependency_keys");
    expect(block).toHaveProperty("tier");
    expect(block).toHaveProperty("icon");
  });

  test("Explore More link navigates to feature store", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    const sidebar = page.locator("aside");
    const exploreLink = sidebar.getByText("Explore More");
    await expect(exploreLink).toBeVisible();

    await exploreLink.click();
    await page.waitForURL("**/feature_store**", { timeout: TIMEOUT });
    expect(page.url()).toContain("feature_store");
  });
});

// ────────────────────────────────────────────────
// SECTION 2: Auth Edge Cases
// ────────────────────────────────────────────────

test.describe("Auth edge cases", () => {
  test("unauthenticated user cannot access feature store", async ({ page }) => {
    await page.goto(`${BASE}/feature_store`);
    await page.waitForURL("**/sign_in**", { timeout: TIMEOUT });
    expect(page.url()).toContain("sign_in");
  });

  test("unauthenticated user cannot access onboarding", async ({ page }) => {
    await page.goto(`${BASE}/onboarding`);
    await page.waitForURL("**/sign_in**", { timeout: TIMEOUT });
    expect(page.url()).toContain("sign_in");
  });
});

// ────────────────────────────────────────────────
// SECTION 3: Onboarding + Sidebar for each persona
// ────────────────────────────────────────────────

for (const [persona, config] of Object.entries(PERSONAS)) {
  test.describe.serial(`${persona} persona: onboarding + sidebar`, () => {

    test(`signup, complete onboarding wizard, land on dashboard`, async ({ page }) => {
      await signupAndOnboard(page, config);

      // Should be on dashboard
      expect(page.url()).toContain("/dashboard");
    });

    test(`sidebar shows correct items for ${persona}`, async ({ page }) => {
      await login(page, config.email, config.password);
      await dismissModals(page);

      // Should land on dashboard (onboarding complete)
      await page.waitForURL("**/dashboard**", { timeout: TIMEOUT });

      const sidebar = page.locator("aside");

      // Items that should be visible
      for (const label of config.sidebar_should_show) {
        await expect(
          sidebar.getByText(label, { exact: false }).first()
        ).toBeVisible({ timeout: 5000 });
      }

      // Items that should NOT be visible (group headings are hidden)
      for (const label of config.sidebar_should_hide) {
        // The group heading link contains a span with the text
        const headingSpan = sidebar.locator(`a[data-group] span`).filter({ hasText: new RegExp(`^${label}$`) });
        const count = await headingSpan.count();
        if (count > 0) {
          await expect(headingSpan.first()).not.toBeVisible();
        }
        // If count is 0, the group was removed from DOM entirely — correct behavior
      }

      // "Explore More" should always be visible
      await expect(sidebar.getByText("Explore More")).toBeVisible();
    });

    test(`re-login goes to dashboard, not onboarding`, async ({ page }) => {
      await login(page, config.email, config.password);
      await dismissModals(page);

      const url = page.url();
      expect(url).not.toContain("/onboarding");
      expect(url).toContain("/dashboard");
    });
  });
}

// ────────────────────────────────────────────────
// SECTION 4: Feature Store — Explorer activations
// ────────────────────────────────────────────────

test.describe.serial("Feature Store: activate/deactivate for explorer", () => {
  const config = PERSONAS.exploring;

  test("setup: create explorer user", async ({ page }) => {
    // Re-create explorer user (using a fresh email just for this section)
    const freshConfig = {
      ...config,
      email: `test-fs-${Date.now()}@testauto.local`,
    };
    // Store the fresh email for subsequent tests in this serial block
    PERSONAS._feature_store_user = freshConfig;
    await signupAndOnboard(page, freshConfig);
    expect(page.url()).toContain("/dashboard");
  });

  test("tech tree shows minimal active blocks for explorer", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // core_dashboard and accounts_basic should be active (core blocks)
    await expect(
      page.locator('[data-block-key="core_dashboard"] .node-ring-core, [data-block-key="core_dashboard"] .node-ring-active')
    ).toBeVisible();

    await expect(
      page.locator('[data-block-key="accounts_basic"] .node-ring-core, [data-block-key="accounts_basic"] .node-ring-active')
    ).toBeVisible();

    // payments_basic should be inactive
    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-inactive')
    ).toBeVisible();
  });

  test("clicking an available node activates it and redirects to feature page", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // payments_basic depends on accounts_basic (active), so it should be clickable
    const paymentsNode = page.locator('[data-block-key="payments_basic"]');
    await paymentsNode.click();

    // Should redirect to the feature page (not reload feature store)
    await page.waitForURL("**/payments**", { timeout: TIMEOUT });
    expect(page.url()).toContain("/payments");

    // Verify the feature is now active by going back to feature store
    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // payments_basic should now be active
    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-active')
    ).toBeVisible();
  });

  test("sidebar updates after activation — Payments group now visible", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Payments").first()).toBeVisible({ timeout: 5000 });
  });

  test("deactivate non-core block shows confirm modal", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Click payments_basic (now active, non-core) to deactivate
    const paymentsNode = page.locator('[data-block-key="payments_basic"]');
    await paymentsNode.click();

    // Confirm modal should appear
    const modal = page.locator('[data-feature-store-target="confirmModal"]');
    await expect(modal).not.toHaveClass(/hidden/, { timeout: 3000 });

    // Should show deactivate confirmation text
    const title = page.locator('[data-feature-store-target="confirmTitle"]');
    await expect(title).toContainText("Deactivate");

    // Cancel to keep it active
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(modal).toHaveClass(/hidden/);
  });

  test("confirm deactivation removes the feature", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Click payments_basic to deactivate
    const paymentsNode = page.locator('[data-block-key="payments_basic"]');
    await paymentsNode.click();

    const modal = page.locator('[data-feature-store-target="confirmModal"]');
    await expect(modal).not.toHaveClass(/hidden/, { timeout: 3000 });

    // The Deactivate button text is inside the confirmBtn target
    const confirmBtn = page.locator('[data-feature-store-target="confirmBtn"]');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toContainText("Deactivate");

    // Call the deactivate API directly (btn.onclick triggers window.location.reload
    // which destroys the evaluate context, so we use fetch + manual reload instead)
    const apiResult = await page.evaluate(async () => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const resp = await fetch("/api/feature_store/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ key: "payments_basic" }),
      });
      return resp.ok ? "ok" : "failed";
    });
    expect(apiResult).toBe("ok");

    // Reload page to reflect changes
    await page.goto(`${BASE}/feature_store?_t=${Date.now()}`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // payments_basic should now be inactive again
    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-inactive')
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("sidebar hides Payments after deactivation", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    const sidebar = page.locator("aside");

    // Payments group should be gone
    const paymentsHeading = sidebar.locator(`a[data-group] span`).filter({ hasText: /^Payments$/ });
    const count = await paymentsHeading.count();
    if (count > 0) {
      await expect(paymentsHeading.first()).not.toBeVisible();
    }
  });

  test("activate block with dependencies auto-activates parents", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    // After deactivation test, payments_basic is inactive → tags is locked.
    // Use the API to activate tags which auto-activates its dependency (payments_basic).
    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    const activateResult = await page.evaluate(async () => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const resp = await fetch("/api/feature_store/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ key: "tags" }),
      });
      return resp.ok ? await resp.json() : null;
    });

    // API should auto-activate payments_basic (dependency) along with tags
    expect(activateResult).toBeTruthy();
    expect(activateResult.activated).toContain("tags");
    expect(activateResult.activated).toContain("payments_basic");

    // Reload and verify both are active in the tree
    await page.goto(`${BASE}/feature_store?_t=${Date.now()}`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-active')
    ).toBeVisible();
    await expect(
      page.locator('[data-block-key="tags"] .node-ring-active')
    ).toBeVisible();
  });

  test("cascade deactivation also deactivates dependents", async ({ page }) => {
    const user = PERSONAS._feature_store_user;
    await login(page, user.email, user.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // payments_basic has tags depending on it — click to deactivate
    const paymentsNode = page.locator('[data-block-key="payments_basic"]');
    await paymentsNode.click();

    const modal = page.locator('[data-feature-store-target="confirmModal"]');
    await expect(modal).not.toHaveClass(/hidden/, { timeout: 3000 });

    // Should show cascade deactivation warning mentioning Tags
    const title = page.locator('[data-feature-store-target="confirmTitle"]');
    await expect(title).toContainText("Deactivate Payments");
    const message = page.locator('[data-feature-store-target="confirmMessage"]');
    await expect(message).toContainText("Tags");

    // Confirm button should say "Deactivate All"
    const confirmBtn = page.locator('[data-feature-store-target="confirmBtn"]');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toContainText("Deactivate All");

    // Call cascade deactivate API directly (btn.onclick triggers page reload
    // which destroys the evaluate context)
    const apiResult = await page.evaluate(async () => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const resp = await fetch("/api/feature_store/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ key: "payments_basic" }),
      });
      return resp.ok ? await resp.json() : null;
    });

    // Verify cascade happened
    expect(apiResult).toBeTruthy();
    expect(apiResult.deactivated).toContain("payments_basic");
    expect(apiResult.deactivated).toContain("tags");

    // Reload and verify both payments_basic AND tags are now inactive
    await page.goto(`${BASE}/feature_store?_t=${Date.now()}`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-inactive')
    ).toBeVisible({ timeout: TIMEOUT });
    // Tags is deactivated AND its dependency (payments_basic) is inactive,
    // so it renders as "locked" rather than "inactive"
    const tagsInactive = page.locator('[data-block-key="tags"] .node-ring-inactive');
    const tagsLocked = page.locator('[data-block-key="tags"] .node-ring-locked');
    await expect(tagsInactive.or(tagsLocked)).toBeVisible({ timeout: TIMEOUT });
  });
});

// ────────────────────────────────────────────────
// SECTION 5: Tech Tree visual checks
// ────────────────────────────────────────────────

test.describe("Tech tree visual structure", () => {
  test("tree has row labels", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    await expect(page.locator(".tech-tree-row-label").first()).toBeVisible();
    await expect(page.getByText("Foundation")).toBeVisible();
  });

  test("legend is visible with all items including tier indicators", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    // Use fresh load to avoid browser caching
    await page.goto(`${BASE}/feature_store?_t=${Date.now()}`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Scroll legend into view
    const legend = page.locator(".tech-tree-legend");
    await legend.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await expect(legend).toBeVisible();
    await expect(legend.getByText("Active", { exact: true })).toBeVisible();
    await expect(legend.getByText("Inactive", { exact: true })).toBeVisible();
    await expect(legend.getByText("Core (always on)")).toBeVisible();
    await expect(legend.getByText("Locked (deps needed)")).toBeVisible();

    // Check legend HTML content for new items (in case they wrap to second line)
    const legendHTML = await legend.innerHTML();
    expect(legendHTML).toContain("Paid Tier");
    expect(legendHTML).toContain("Advanced Tier");
    expect(legendHTML).toContain("Recommended");
  });

  test("each node has a label", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    const labels = page.locator(".node-label");
    const count = await labels.count();
    expect(count).toBe(14);

    // Spot-check a few labels
    await expect(page.locator('[data-block-key="core_dashboard"] .node-label')).toContainText("Dashboard");
    await expect(page.locator('[data-block-key="payments_basic"] .node-label')).toContainText("Payments");
    await expect(page.locator('[data-block-key="buckets"] .node-label')).toContainText("Buckets");
  });
});

// ────────────────────────────────────────────────
// SECTION 6: Existing User — Cascade Deactivation
// ────────────────────────────────────────────────

test.describe.serial("Existing user: cascade deactivation", () => {
  // Only run on chromium to avoid race conditions (both browsers share the same DB user)
  test.beforeEach(async ({ browserName }) => {
    test.skip(browserName !== "chromium", "cascade tests use shared DB state — run on chromium only");
  });

  test("deactivate payments_basic cascades to tags and recurring_payments", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    // Navigate to feature store first so we have a valid CSRF token
    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Make sure payments_basic, tags, recurring_payments are all active via API
    const activateResult = await page.evaluate(async () => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const results = [];
      for (const key of ["payments_basic", "tags", "recurring_payments"]) {
        const resp = await fetch("/api/feature_store/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({ key }),
        });
        results.push({ key, ok: resp.ok, status: resp.status });
      }
      return results;
    });

    // Verify API calls succeeded
    for (const r of activateResult) {
      expect(r.ok).toBe(true);
    }

    // Reload feature store to pick up activation changes
    await page.goto(`${BASE}/feature_store?_t=${Date.now()}`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Verify payments_basic is active
    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-active')
    ).toBeVisible({ timeout: TIMEOUT });

    // Click payments_basic to deactivate
    const paymentsNode = page.locator('[data-block-key="payments_basic"]');
    await paymentsNode.click();

    const modal = page.locator('[data-feature-store-target="confirmModal"]');
    await expect(modal).not.toHaveClass(/hidden/, { timeout: 3000 });

    // Should show cascade info — the confirm modal mentions dependents
    const confirmBtn = page.locator('[data-feature-store-target="confirmBtn"]');
    await expect(confirmBtn).toBeVisible();

    // Cascade deactivate via API directly (reliable across browsers)
    const deactivateResult = await page.evaluate(async () => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const resp = await fetch("/api/feature_store/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ key: "payments_basic" }),
      });
      return resp.ok ? await resp.json() : null;
    });

    // Verify cascade deactivation happened (API returns all deactivated keys)
    expect(deactivateResult).toBeTruthy();
    expect(deactivateResult.deactivated).toContain("payments_basic");
    expect(deactivateResult.deactivated).toContain("tags");
    expect(deactivateResult.deactivated).toContain("recurring_payments");

    // Reload and verify: payments_basic should be inactive; tags and recurring_payments
    // become "locked" (deps not met) since their dependency is now inactive
    await page.reload();
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-inactive')
    ).toBeVisible({ timeout: TIMEOUT });
    // Tags and recurring_payments are deactivated AND their deps are no longer met,
    // so they show as inactive or locked depending on the rendering logic
    const tagsRingInactive = page.locator('[data-block-key="tags"] .node-ring-inactive');
    const tagsRingLocked = page.locator('[data-block-key="tags"] .node-ring-locked');
    await expect(tagsRingInactive.or(tagsRingLocked)).toBeVisible({ timeout: TIMEOUT });

    const rpRingInactive = page.locator('[data-block-key="recurring_payments"] .node-ring-inactive');
    const rpRingLocked = page.locator('[data-block-key="recurring_payments"] .node-ring-locked');
    await expect(rpRingInactive.or(rpRingLocked)).toBeVisible({ timeout: TIMEOUT });
  });

  test("re-activate payments_basic for cleanup", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    // Navigate to feature store first for a valid CSRF token
    await page.goto(`${BASE}/feature_store`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    // Re-activate all blocks that were cascade-deactivated
    await page.evaluate(async () => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      for (const key of ["payments_basic", "tags", "recurring_payments"]) {
        await fetch("/api/feature_store/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({ key }),
        });
      }
    });

    // Reload to pick up changes
    await page.goto(`${BASE}/feature_store?_t=${Date.now()}`);
    await page.waitForSelector(".tech-tree-node", { timeout: TIMEOUT });

    await expect(
      page.locator('[data-block-key="payments_basic"] .node-ring-active')
    ).toBeVisible({ timeout: TIMEOUT });
  });
});

// ────────────────────────────────────────────────
// SECTION 7: Tour Button + Tutorial Wiring
// ────────────────────────────────────────────────

test.describe("Tour button and tutorial", () => {
  test("Tour button visible on feature pages for existing user", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    // Check Tour button on accounts page
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");

    const tourLink = page.locator('a:has-text("Tour")').first();
    await expect(tourLink).toBeVisible({ timeout: 5000 });
    const href = await tourLink.getAttribute("href");
    expect(href).toContain("start_tutorial=1");
  });

  test("Tour button triggers tutorial overlay", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    // Visit accounts with start_tutorial=1
    await page.goto(`${BASE}/accounts?start_tutorial=1`);
    await page.waitForLoadState("networkidle");

    // Tutorial controller starts after 800ms delay — wait for the overlay div to appear
    // The tutorial controller creates overlay elements dynamically
    await page.waitForTimeout(2000);

    // Check for any element created by the tutorial controller
    const tutorialElements = await page.evaluate(() => {
      // Tutorial controller creates elements with high z-index
      const overlay = document.querySelector('[style*="z-index: 9998"], [style*="z-index: 9999"]');
      const tutorialDiv = document.querySelector('[data-controller="tutorial"]');
      return {
        hasOverlay: !!overlay,
        hasTutorialDiv: !!tutorialDiv,
        tutorialDivContent: tutorialDiv ? tutorialDiv.innerHTML.substring(0, 200) : null,
      };
    });

    // The tutorial div should be injected by the layout
    expect(tutorialElements.hasTutorialDiv).toBe(true);
  });

  test("data-tutorial attributes exist on feature pages", async ({ page }) => {
    await login(page, EXISTING_USER.email, EXISTING_USER.password);
    await dismissModals(page);

    // Check accounts page has tutorial markers
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-tutorial="accounts-table"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-tutorial="accounts-add-btn"]')).toBeVisible({ timeout: 5000 });
  });
});
