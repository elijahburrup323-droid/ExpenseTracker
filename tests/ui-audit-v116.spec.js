const { test, expect } = require("@playwright/test");
const path = require("path");

const PROD_BASE = "https://djburrup.com/mybudgethq";
const ACCOUNT = { email: "elijahburrup323@gmail.com", password: "Eli624462!" };
const ACCOUNT2 = { email: "djburrup@gmail.com", password: "luckydjb" };

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "desktop-wide", width: 1920, height: 1080 },
];

const SCREENSHOT_DIR = path.join(__dirname, "..", "ui-audit-screenshots");

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

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function screenshotViewport(page, name) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

// ============================================================
// PRICING PAGE — All viewports, both themes
// ============================================================
test.describe("Pricing Page UI Audit", () => {
  for (const vp of VIEWPORTS) {
    test(`Pricing — ${vp.name} — light mode`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      // Ensure light mode
      await page.evaluate(() => {
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      });
      await page.goto(`${PROD_BASE}/pricing`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await screenshot(page, `pricing-${vp.name}-light-monthly`);

      // Switch to annual
      await page.click("button:has-text('Annual')");
      await page.waitForTimeout(300);
      await screenshot(page, `pricing-${vp.name}-light-annual`);
    });

    test(`Pricing — ${vp.name} — dark mode`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await page.goto(`${PROD_BASE}/pricing`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await screenshot(page, `pricing-${vp.name}-dark-monthly`);

      await page.click("button:has-text('Annual')");
      await page.waitForTimeout(300);
      await screenshot(page, `pricing-${vp.name}-dark-annual`);
    });
  }
});

// ============================================================
// UPGRADE MENU — Header dropdown at all viewports
// ============================================================
test.describe("Upgrade Menu UI Audit", () => {
  for (const vp of VIEWPORTS) {
    test(`Header dropdown — ${vp.name} — light`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      });
      await page.goto(`${PROD_BASE}/dashboard`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);

      // Open header profile dropdown
      const profileBtn = page.locator(".sticky.top-0 [data-controller='dropdown'] button").first();
      await profileBtn.click();
      await page.waitForTimeout(400);
      await screenshotViewport(page, `header-dropdown-${vp.name}-light`);
    });

    test(`Header dropdown — ${vp.name} — dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await page.goto(`${PROD_BASE}/dashboard`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);

      const profileBtn = page.locator(".sticky.top-0 [data-controller='dropdown'] button").first();
      await profileBtn.click();
      await page.waitForTimeout(400);
      await screenshotViewport(page, `header-dropdown-${vp.name}-dark`);
    });
  }

  // Sidebar dropdown (desktop only — sidebar hidden on mobile)
  for (const vp of VIEWPORTS.filter(v => v.width >= 768)) {
    test(`Sidebar dropdown — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.goto(`${PROD_BASE}/dashboard`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);

      const sidebarProfileBtn = page.locator("aside [data-controller='dropdown'] button").first();
      await sidebarProfileBtn.click();
      await page.waitForTimeout(400);
      await screenshotViewport(page, `sidebar-dropdown-${vp.name}`);
    });
  }
});

// ============================================================
// SETTINGS — Subscription section
// ============================================================
test.describe("Settings Subscription UI Audit", () => {
  for (const vp of VIEWPORTS) {
    test(`Settings — ${vp.name} — light`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      });
      await page.goto(`${PROD_BASE}/users/edit`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await screenshot(page, `settings-${vp.name}-light`);
    });

    test(`Settings — ${vp.name} — dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await page.goto(`${PROD_BASE}/users/edit`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await screenshot(page, `settings-${vp.name}-dark`);
    });
  }

  // Second account (may have different subscription status)
  test("Settings — account2 subscription status", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, ACCOUNT2.email, ACCOUNT2.password);
    await page.goto(`${PROD_BASE}/users/edit`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);
    await page.waitForTimeout(500);
    await screenshot(page, `settings-account2-desktop`);
  });
});

// ============================================================
// UPLOAD MODAL — Multiple screens, both themes
// ============================================================
test.describe("Upload Modal UI Audit", () => {
  const screens = [
    { path: "/accounts", name: "accounts" },
    { path: "/payments", name: "payments" },
    { path: "/income_entries", name: "deposits" },
    { path: "/transfer_masters", name: "transfers" },
    { path: "/account_types", name: "account-types" },
    { path: "/spending_categories", name: "categories" },
    { path: "/spending_types", name: "spending-types" },
    { path: "/income_recurrings", name: "recurring-deposits" },
    { path: "/quotes", name: "quotes" },
  ];

  // Upload button placement on each screen at each viewport
  for (const screen of screens) {
    for (const vp of [VIEWPORTS[0], VIEWPORTS[2], VIEWPORTS[3]]) { // mobile, tablet-landscape, desktop
      test(`Upload button — ${screen.name} — ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await login(page, ACCOUNT.email, ACCOUNT.password);
        await page.goto(`${PROD_BASE}${screen.path}`);
        await page.waitForLoadState("networkidle");
        await dismissWhatsNew(page);
        await page.waitForTimeout(500);
        await screenshotViewport(page, `upload-btn-${screen.name}-${vp.name}`);
      });
    }
  }

  // Upload modal opened — check on a few screens at different viewports
  for (const vp of VIEWPORTS) {
    test(`Upload modal open — accounts — ${vp.name} — light`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      });
      await page.goto(`${PROD_BASE}/accounts`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await page.click("button:has-text('Upload')");
      await page.waitForTimeout(500);
      await screenshotViewport(page, `upload-modal-accounts-${vp.name}-light`);
    });

    test(`Upload modal open — accounts — ${vp.name} — dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.evaluate(() => {
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await page.goto(`${PROD_BASE}/accounts`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await page.click("button:has-text('Upload')");
      await page.waitForTimeout(500);
      await screenshotViewport(page, `upload-modal-accounts-${vp.name}-dark`);
    });
  }

  // Upload modal on payments (has more fields)
  test("Upload modal — payments — desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, ACCOUNT.email, ACCOUNT.password);
    await page.goto(`${PROD_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);
    await page.waitForTimeout(500);
    await page.click("button:has-text('Upload')");
    await page.waitForTimeout(500);
    await screenshotViewport(page, `upload-modal-payments-desktop`);
  });

  // Upload modal on quotes
  test("Upload modal — quotes — desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, ACCOUNT.email, ACCOUNT.password);
    await page.goto(`${PROD_BASE}/quotes`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);
    await page.waitForTimeout(500);
    await page.click("button:has-text('Upload')");
    await page.waitForTimeout(500);
    await screenshotViewport(page, `upload-modal-quotes-desktop`);
  });
});

// ============================================================
// PRINT BUTTON — Payments screen
// ============================================================
test.describe("Print Button UI Audit", () => {
  for (const vp of VIEWPORTS) {
    test(`Print button placement — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.goto(`${PROD_BASE}/payments`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await screenshotViewport(page, `print-btn-payments-${vp.name}`);
    });
  }
});

// ============================================================
// NON-ADMIN USER — should NOT see upload buttons
// ============================================================
test.describe("Non-Admin Upload Visibility Audit", () => {
  const screens = ["/accounts", "/payments", "/income_entries", "/spending_categories"];
  for (const screen of screens) {
    test(`No upload button for non-admin — ${screen}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await login(page, ACCOUNT2.email, ACCOUNT2.password);
      await page.goto(`${PROD_BASE}${screen}`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(500);
      await screenshotViewport(page, `nonadmin-${screen.replace("/", "")}-desktop`);
    });
  }
});

// ============================================================
// CROSS-PAGE HEADER CONSISTENCY — check Upgrade visible everywhere
// ============================================================
test.describe("Header Consistency Audit", () => {
  const pages = [
    "/dashboard", "/accounts", "/payments", "/pricing",
    "/income_entries", "/transfer_masters", "/users/edit",
  ];
  for (const p of pages) {
    test(`Header bar on ${p}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await login(page, ACCOUNT.email, ACCOUNT.password);
      await page.goto(`${PROD_BASE}${p}`);
      await page.waitForLoadState("networkidle");
      await dismissWhatsNew(page);
      await page.waitForTimeout(300);

      // Open dropdown
      const profileBtn = page.locator(".sticky.top-0 [data-controller='dropdown'] button").first();
      await profileBtn.click();
      await page.waitForTimeout(400);
      await screenshotViewport(page, `header-consistency-${p.replace(/\//g, "-").replace(/^-/, "")}`);
    });
  }
});
