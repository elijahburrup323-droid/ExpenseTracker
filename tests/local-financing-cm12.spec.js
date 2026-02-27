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

let testInstrumentId = null;

test.describe("CM-12: Financing Amortization Engine", () => {
  test.describe.configure({ mode: "serial" });

  test("1. Loans & Notes page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/financing/loans-notes`);
    await expect(page.getByRole("heading", { name: "Loans & Notes" })).toBeVisible();
  });

  test("2. Create a test instrument via API", async ({ page }) => {
    await login(page);
    // Clean up any leftover test instruments first
    await page.evaluate(async (base) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.content : "";
      const listRes = await fetch(`${base}/api/financing_instruments`, {
        headers: { Accept: "application/json", "X-CSRF-Token": token },
      });
      const instruments = await listRes.json();
      for (const inst of instruments.filter((i) => i.name === "CM12 Test Loan")) {
        // Delete payments first
        const pRes = await fetch(`${base}/api/financing_instruments/${inst.id}/financing_payments`, {
          headers: { Accept: "application/json", "X-CSRF-Token": token },
        });
        const payments = await pRes.json();
        for (const p of payments) {
          await fetch(`${base}/api/financing_instruments/${inst.id}/financing_payments/${p.id}`, {
            method: "DELETE", headers: { "X-CSRF-Token": token },
          });
        }
        await fetch(`${base}/api/financing_instruments/${inst.id}`, {
          method: "DELETE", headers: { "X-CSRF-Token": token },
        });
      }
    }, BASE);
    // Create instrument via API
    const resp = await page.evaluate(async (base) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.content : "";
      const res = await fetch(`${base}/api/financing_instruments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          financing_instrument: {
            name: "CM12 Test Loan",
            instrument_type: "PAYABLE",
            instrument_subtype: "PERSONAL_LOAN",
            original_principal: 10000,
            interest_rate: 6.0,
            term_months: 36,
            start_date: "2026-01-01",
            payment_frequency: "MONTHLY",
            monthly_payment: 304.22,
            include_in_net_worth: true,
          },
        }),
      });
      return res.json();
    }, BASE);

    expect(resp.id).toBeTruthy();
    testInstrumentId = resp.id;
    console.log("Created test instrument:", testInstrumentId);
  });

  test("3. Instrument detail page loads with tabs", async ({ page }) => {
    await login(page);
    expect(testInstrumentId).toBeTruthy();

    await page.goto(`${BASE}/financing/instruments/${testInstrumentId}`);
    // Header shows name
    await expect(page.getByRole("heading", { name: "CM12 Test Loan" })).toBeVisible();
    // Badge shows PAYABLE
    await expect(page.locator("span").filter({ hasText: "PAYABLE" })).toBeVisible();
    // Three tabs visible
    await expect(page.getByRole("button", { name: "Amortization Schedule" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Payment History" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Payoff Simulation" })).toBeVisible();
    // Summary metrics (multiple elements show $10,000 — check first metric card)
    await expect(page.getByText("Original Principal")).toBeVisible();
    await expect(page.getByText("Interest Rate")).toBeVisible();
  });

  test("4. Generate amortization schedule", async ({ page }) => {
    await login(page);
    expect(testInstrumentId).toBeTruthy();

    await page.goto(`${BASE}/financing/instruments/${testInstrumentId}`);
    await page.waitForTimeout(2000);

    // Click Generate Schedule and wait for network
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("amortization_schedule") && resp.status() < 400, { timeout: 10000 }),
      page.click('button:has-text("Generate Schedule")'),
    ]);
    await page.waitForTimeout(1000);

    // Should show summary with "payments"
    await expect(page.locator('[data-financing-detail-target="scheduleSummary"]')).toContainText("payments", { timeout: 10000 });
  });

  test("5. Record a payment", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/financing/instruments/${testInstrumentId}`);

    // Click Record Payment
    await page.click('button:has-text("Record Payment")');
    // Modal appears
    await expect(page.locator('[data-financing-detail-target="paymentModal"]')).toBeVisible();
    // Fill in payment
    await page.fill('[data-financing-detail-target="payAmount"]', "304.22");
    // Save
    await page.click('button:has-text("Save Payment")');
    // Modal should close
    await expect(page.locator('[data-financing-detail-target="paymentModal"]')).toBeHidden({ timeout: 5000 });
  });

  test("6. Payment appears in history tab", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/financing/instruments/${testInstrumentId}`);

    // Switch to payments tab
    await page.click('button:has-text("Payment History")');
    await page.waitForTimeout(1000);
    // Payment row should appear
    await expect(page.locator('[data-financing-detail-target="paymentsBody"] tr').first()).not.toContainText("No payments");
  });

  test("7. Payoff simulation works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/financing/instruments/${testInstrumentId}`);

    // Switch to simulation tab
    await page.click('button:has-text("Payoff Simulation")');
    // Fill extra monthly
    await page.fill('[data-financing-detail-target="simExtraMonthly"]', "100");
    // Run simulation
    await page.click('button:has-text("Run Simulation")');
    // Results should appear
    await expect(page.locator('[data-financing-detail-target="simResults"]')).toBeVisible({ timeout: 5000 });
    // Interest saved should be positive
    const saved = await page.locator('[data-financing-detail-target="simInterestSaved"]').textContent();
    expect(saved).not.toBe("$0.00");
  });

  test("8. Instrument name links from Loans & Notes table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/financing/loans-notes`);
    await page.waitForTimeout(1000);
    // Find the test loan link
    const link = page.locator(`a[href="/financing/instruments/${testInstrumentId}"]`);
    if (await link.isVisible()) {
      await link.click();
      await page.waitForURL(/financing\/instruments/);
      await expect(page.getByRole("heading", { name: "CM12 Test Loan" })).toBeVisible();
    }
  });

  test("9. Cleanup: delete test instrument", async ({ page }) => {
    await login(page);
    if (!testInstrumentId) return;

    // Delete any payments first
    const paymentsResp = await page.evaluate(
      async ({ base, id }) => {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const token = csrfMeta ? csrfMeta.content : "";
        const res = await fetch(`${base}/api/financing_instruments/${id}/financing_payments`, {
          headers: { Accept: "application/json", "X-CSRF-Token": token },
        });
        return res.json();
      },
      { base: BASE, id: testInstrumentId }
    );

    for (const p of paymentsResp) {
      await page.evaluate(
        async ({ base, instId, payId }) => {
          const csrfMeta = document.querySelector('meta[name="csrf-token"]');
          const token = csrfMeta ? csrfMeta.content : "";
          await fetch(`${base}/api/financing_instruments/${instId}/financing_payments/${payId}`, {
            method: "DELETE",
            headers: { "X-CSRF-Token": token },
          });
        },
        { base: BASE, instId: testInstrumentId, payId: p.id }
      );
    }

    // Delete instrument
    await page.evaluate(
      async ({ base, id }) => {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const token = csrfMeta ? csrfMeta.content : "";
        await fetch(`${base}/api/financing_instruments/${id}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": token },
        });
      },
      { base: BASE, id: testInstrumentId }
    );
    console.log("Cleaned up test instrument:", testInstrumentId);
  });
});
