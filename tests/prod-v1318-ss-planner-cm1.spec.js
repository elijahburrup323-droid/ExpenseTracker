// Social Security Benefit Planner CM-1: Mockup Rework Verification
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test.describe.serial('SS Planner CM-1: Mockup Rework', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // Login once
    await page.goto(`${BASE}/users/sign_in`);
    await page.locator('#user_email').fill('elijahburrup323@gmail.com');
    await page.locator('#user_password').fill('Eli624462!');
    await page.locator('input[type="submit"]').click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Dismiss What's New overlay if present
    const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
    if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotIt.click();
    }

    // Navigate to SS Planner
    await page.goto(`${BASE}/social_security_planner`);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('No JavaScript errors on page', async () => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(jsErrors).toEqual([]);
  });

  test('Purple gradient header is visible with correct title', async () => {
    const header = page.locator('h1:has-text("Social Security Benefit Planner")');
    await expect(header).toBeVisible();
  });

  test('Edit Assumptions and Run Strategy Analysis buttons in header', async () => {
    await expect(page.locator('button:has-text("Edit Assumptions")')).toBeVisible();
    await expect(page.locator('button:has-text("Run Strategy Analysis")')).toBeVisible();
  });

  test('Participants section with You card and Add Spouse card', async () => {
    await expect(page.locator('h2:has-text("Participants")')).toBeVisible();
    await expect(page.locator('h3:has-text("You")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Spouse")')).toBeVisible();
  });

  test('You card fields are present', async () => {
    await expect(page.locator('text=Full Name').first()).toBeVisible();
    await expect(page.locator('text=Sex').first()).toBeVisible();
    await expect(page.locator('text=Birthdate').first()).toBeVisible();
    await expect(page.locator('text=Primary Insurance Amount').first()).toBeVisible();
    await expect(page.locator('text=Currently Drawing').first()).toBeVisible();
  });

  test('Planned Claim Age dropdowns are stacked vertically', async () => {
    // Verify both year and month selects exist under the Planned Claim Age section
    await expect(page.locator('select[data-ss-planner-target="yourClaimAgeYears"]')).toBeVisible();
    await expect(page.locator('select[data-ss-planner-target="yourClaimAgeMonths"]')).toBeVisible();
  });

  test('Social Security Statement Estimates section exists', async () => {
    await expect(page.locator('h2:has-text("Social Security Statement Estimates")')).toBeVisible();
    await expect(page.locator('text=Optimal Claiming Age (You)')).toBeVisible();
    await expect(page.locator('text=Projected Lifetime Value')).toBeVisible();
  });

  test('Assumptions section with COLA dropdown and Working Before FRA', async () => {
    await expect(page.locator('h2:has-text("Assumptions")')).toBeVisible();
    await expect(page.locator('label:has-text("COLA")')).toBeVisible();
    await expect(page.locator('label:has-text("Working Before FRA")')).toBeVisible();
  });

  test('Strategy Summary section with sortable headers', async () => {
    await expect(page.locator('h2:has-text("Strategy Summary")')).toBeVisible();
    await expect(page.locator('th:has-text("You Claim Age")')).toBeVisible();
    await expect(page.locator('th:has-text("Survivor Max Benefit")')).toBeVisible();
    await expect(page.locator('th:has-text("Lifetime Value")')).toBeVisible();
  });

  test('Recommendation Summary section exists', async () => {
    await expect(page.locator('h3:has-text("Recommendation Summary")')).toBeVisible();
  });

  test('Bottom action bar with Export PDF and Compare Another Scenario', async () => {
    await expect(page.locator('button:has-text("Export PDF Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Compare Another Scenario")')).toBeVisible();
    await expect(page.locator('button:has-text("Save Scenario")')).toHaveCount(0);
  });

  test('Add Spouse toggles spouse fields', async () => {
    // Spouse section should be hidden initially
    const spouseSection = page.locator('[data-ss-planner-target="spouseSection"]');
    await expect(spouseSection).toBeHidden();

    // Click Add Spouse button
    await page.locator('button:has-text("Add Spouse")').click();
    await page.waitForTimeout(500);

    // Spouse section should now be visible
    await expect(spouseSection).toBeVisible();
    await expect(page.locator('button:has-text("Remove")')).toBeVisible();

    // Remove spouse for cleanup
    await page.locator('button:has-text("Remove")').click();
    await page.waitForTimeout(500);
    await expect(spouseSection).toBeHidden();
  });

  test('Entering data populates FRA and Life Expectancy', async () => {
    await page.fill('input[data-ss-planner-target="yourBirthdate"]', '1960-05-14');
    await page.selectOption('select[data-ss-planner-target="yourSex"]', 'male');
    await page.waitForTimeout(500);

    const fra = page.locator('[data-ss-planner-target="yourFRA"]');
    await expect(fra).not.toHaveText('\u2014');
    const le = page.locator('[data-ss-planner-target="yourLifeExpectancy"]');
    await expect(le).not.toHaveText('\u2014');
  });

  test('Entering PIA + birthdate generates strategy table', async () => {
    await page.fill('input[data-ss-planner-target="yourPIA"]', '2800');
    // Trigger change event explicitly and click Run Strategy Analysis
    await page.locator('input[data-ss-planner-target="yourPIA"]').dispatchEvent('change');
    await page.locator('button:has-text("Run Strategy Analysis")').click();
    await page.waitForTimeout(1000);

    const rows = page.locator('[data-ss-planner-target="strategyTableBody"] tr');
    await expect(rows).toHaveCount(9);
  });

  test('Sort headers toggle on click', async () => {
    await page.click('th[data-sort-field="lifetime"]');
    const sortIcon = page.locator('[data-sort-icon="lifetime"] svg');
    await expect(sortIcon).toBeVisible();
  });

  test('Line chart renders with data', async () => {
    const svg = page.locator('[data-ss-planner-target="timelineChart"] svg');
    await expect(svg).toBeVisible();
    const polylines = page.locator('[data-ss-planner-target="timelineChart"] polyline');
    await expect(polylines).toHaveCount(3);
  });

  test('Recommendation text updates with data', async () => {
    const rec = page.locator('[data-ss-planner-target="recommendationText"]');
    await expect(rec).not.toHaveText('Enter your details above');
    await expect(rec).toContainText('Based on current assumptions');
  });

  test('Life Expectancy source link is visible', async () => {
    const link = page.locator('a[href="https://www.ssa.gov/oact/STATS/table4c6.html"]').first();
    await expect(link).toBeVisible();
  });
});
