const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(4000);
}

test.describe("Production CM5: Modal Date Width Fix", () => {
  test("elijahburrup323 - Date input constrained in modal at iPad width", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    const modalBody = page.locator('[data-payments-target="addModalBody"]');
    const accountSelect = page.locator('[data-payments-target="modalAccount"]');

    const dateBox = await dateInput.boundingBox();
    const modalBox = await modalBody.boundingBox();
    const accountBox = await accountSelect.boundingBox();

    // Date fits inside modal
    expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 1);
    // Date aligns with account select
    expect(Math.abs(dateBox.x - accountBox.x)).toBeLessThan(2);
    expect(Math.abs(dateBox.width - accountBox.width)).toBeLessThan(2);
  });

  test("djburrup - Date input fits at desktop width", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    const modalBody = page.locator('[data-payments-target="addModalBody"]');

    const dateBox = await dateInput.boundingBox();
    const modalBox = await modalBody.boundingBox();

    expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 1);
  });
});
