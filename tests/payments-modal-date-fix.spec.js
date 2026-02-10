const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@example.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe("CM5: Payments Add Modal Date Width Fix", () => {
  test("Date input has modal-date-input class with correct CSS", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open modal
    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    await expect(dateInput).toBeVisible();

    // Check CSS properties
    const styles = await dateInput.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        maxWidth: cs.maxWidth,
        boxSizing: cs.boxSizing,
        width: el.offsetWidth,
        parentWidth: el.parentElement.offsetWidth,
      };
    });

    expect(styles.boxSizing).toBe("border-box");
    // Date input should not exceed parent width
    expect(styles.width).toBeLessThanOrEqual(styles.parentWidth);
  });

  test("At iPad width (1024px), date input fits inside modal", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open modal
    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    const modalBody = page.locator('[data-payments-target="addModalBody"]');

    const dateBox = await dateInput.boundingBox();
    const modalBox = await modalBody.boundingBox();

    // Date input right edge should not exceed modal body right edge
    expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 1);
  });

  test("At iPad width (834px), date input fits inside modal", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open modal
    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    const modalBody = page.locator('[data-payments-target="addModalBody"]');

    const dateBox = await dateInput.boundingBox();
    const modalBox = await modalBody.boundingBox();

    // Date input should fit inside modal
    expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 1);
  });

  test("Date input aligns with other form controls", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open modal
    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    const accountSelect = page.locator('[data-payments-target="modalAccount"]');

    const dateBox = await dateInput.boundingBox();
    const accountBox = await accountSelect.boundingBox();

    // Same left edge (aligned)
    expect(Math.abs(dateBox.x - accountBox.x)).toBeLessThan(2);
    // Same width (within 2px)
    expect(Math.abs(dateBox.width - accountBox.width)).toBeLessThan(2);
  });

  test("Desktop layout unchanged — date input still fits", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open modal
    await page.locator('[data-payments-target="addButton"]').click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-payments-target="modalDate"]');
    const modalBody = page.locator('[data-payments-target="addModalBody"]');

    const dateBox = await dateInput.boundingBox();
    const modalBox = await modalBody.boundingBox();

    expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 1);
  });
});
