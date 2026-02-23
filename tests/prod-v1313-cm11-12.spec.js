// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const DJ_EMAIL = 'djburrup@gmail.com';
const DJ_PASS = 'luckydjb';
const ELI_EMAIL = 'elijahburrup323@gmail.com';
const ELI_PASS = 'Eli624462!';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

test.describe('CM-11: Reports and Dashboard Grid Layout', () => {

  test('1. Dashboard renders in 3-column grid on desktop', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.waitForSelector('[data-controller="dashboard"]');

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    // Check that the cards grid has grid display
    const cardsGrid = page.locator('[data-dashboard-target="cardsGrid"]');
    const display = await cardsGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');

    // Check grid-template-columns has 3 columns
    const columns = await cardsGrid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    // Should have 3 column values (e.g., "350px 350px 350px" or similar)
    const colCount = columns.split(' ').filter(c => c.trim() && !c.includes('0px')).length;
    expect(colCount).toBe(3);
  });

  test('2. Reports page renders in 3-column grid on desktop', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/reports`);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    const cardsGrid = page.locator('[data-reports-target="cardsGrid"]');
    const display = await cardsGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');

    const columns = await cardsGrid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    const colCount = columns.split(' ').filter(c => c.trim() && !c.includes('0px')).length;
    expect(colCount).toBe(3);
  });

  test('3. Critical grid CSS is present in page head', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);

    // Check that the critical CSS style block exists
    const hasGridCSS = await page.evaluate(() => {
      const styles = document.querySelectorAll('head style');
      for (const style of styles) {
        if (style.textContent.includes('grid-template-columns') && style.textContent.includes('md\\:grid-cols-3')) {
          return true;
        }
      }
      return false;
    });
    expect(hasGridCSS).toBe(true);
  });

  test('4. Grid layout survives Turbo navigation (Reports -> Dashboard -> Reports)', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);

    // Navigate to Reports
    await page.goto(`${BASE}/reports`);
    await page.waitForSelector('[data-reports-target="cardsGrid"]');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    // Verify grid on Reports
    const reportsGrid = page.locator('[data-reports-target="cardsGrid"]');
    let display = await reportsGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');

    // Navigate to Dashboard via sidebar link
    await page.goto(`${BASE}/dashboard`);
    await page.waitForSelector('[data-dashboard-target="cardsGrid"]');
    await page.waitForTimeout(500);

    // Verify grid on Dashboard
    const dashGrid = page.locator('[data-dashboard-target="cardsGrid"]');
    display = await dashGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');

    // Navigate back to Reports
    await page.goto(`${BASE}/reports`);
    await page.waitForSelector('[data-reports-target="cardsGrid"]');
    await page.waitForTimeout(500);

    // Verify grid is still correct
    const reportsGrid2 = page.locator('[data-reports-target="cardsGrid"]');
    display = await reportsGrid2.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');
  });
});

test.describe('CM-12: Reports Monthly Cash Flow Routing', () => {

  test('5. Monthly Cash Flow card link has correct href with /mybudgethq prefix', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/reports`);
    await page.waitForSelector('[data-reports-target="cardsGrid"]');

    // Find the "View Report" link
    const viewReportLink = page.locator('a:has-text("View Report")').first();
    await expect(viewReportLink).toBeVisible({ timeout: 5000 });

    const href = await viewReportLink.getAttribute('href');
    // Should start with /mybudgethq
    expect(href).toContain('/mybudgethq/reports/monthly_cash_flow');
  });

  test('6. Clicking Monthly Cash Flow card navigates to report without 404', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/reports`);
    await page.waitForSelector('[data-reports-target="cardsGrid"]');

    // Click the "View Report" link
    const viewReportLink = page.locator('a:has-text("View Report")').first();
    await viewReportLink.click();

    // Should load the Monthly Cash Flow page
    await page.waitForURL(/monthly_cash_flow/);
    await expect(page.locator('text=Monthly Cash Flow')).toBeVisible({ timeout: 10000 });
  });

  test('7. Direct URL access to Monthly Cash Flow works', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);

    // Should load without 404
    await expect(page.locator('text=Monthly Cash Flow')).toBeVisible({ timeout: 10000 });

    // Should have the back link and content
    await expect(page.locator('text=Back to Reports')).toBeVisible();
  });

  test('8. Second user (Eli) can access Monthly Cash Flow report', async ({ page }) => {
    await login(page, ELI_EMAIL, ELI_PASS);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);

    await expect(page.locator('text=Monthly Cash Flow')).toBeVisible({ timeout: 10000 });
  });
});
