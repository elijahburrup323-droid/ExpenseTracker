const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' }
];

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(1000);
}

test.describe.configure({ mode: 'serial' });

for (const user of USERS) {
  test.describe(`SSBP CM-6 [${user.email}]`, () => {

    test('SSBP page loads with correct structure', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/social_security_planner`);
      await page.waitForTimeout(3000);

      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('Social Security Benefit Planner');
      console.log(`${user.email}: SSBP page loaded`);

      // Verify NO PIA block exists
      expect(bodyText).not.toContain('Benefit at Full Retirement Age (PIA)');
      console.log(`${user.email}: PIA block removed`);

      // Verify Full Name labels say "(Optional)"
      const labels = await page.locator('label').allTextContents();
      const nameLabels = labels.filter(l => l.includes('Full Name'));
      expect(nameLabels.length).toBeGreaterThanOrEqual(1);
      for (const label of nameLabels) {
        expect(label).toContain('(Optional)');
      }
      console.log(`${user.email}: Full Name labels say (Optional)`);

      // Verify 3 claim age rows exist with text inputs (not dropdowns)
      const claimYearsInputs = page.locator('[data-claim-who="your"][data-claim-field="years"]');
      expect(await claimYearsInputs.count()).toBe(3);
      console.log(`${user.email}: 3 Years inputs found`);

      const claimMonthsInputs = page.locator('[data-claim-who="your"][data-claim-field="months"]');
      expect(await claimMonthsInputs.count()).toBe(3);
      console.log(`${user.email}: 3 Months inputs found`);

      const claimBenefitInputs = page.locator('[data-claim-who="your"][data-claim-field="benefit"]');
      expect(await claimBenefitInputs.count()).toBe(3);
      console.log(`${user.email}: 3 Benefit inputs found`);

      // Verify Row 1 is blank (no birthdate entered yet)
      const row1Years = await claimYearsInputs.nth(0).inputValue();
      expect(row1Years).toBe('');
      console.log(`${user.email}: Row 1 Years is blank (no birthdate)`);

      // Verify Row 2 defaults to 67/0
      const row2Years = await claimYearsInputs.nth(1).inputValue();
      const row2Months = await claimMonthsInputs.nth(1).inputValue();
      expect(row2Years).toBe('67');
      expect(row2Months).toBe('0');
      console.log(`${user.email}: Row 2 defaults to 67/0`);

      // Verify Row 3 defaults to 70/0
      const row3Years = await claimYearsInputs.nth(2).inputValue();
      const row3Months = await claimMonthsInputs.nth(2).inputValue();
      expect(row3Years).toBe('70');
      expect(row3Months).toBe('0');
      console.log(`${user.email}: Row 3 defaults to 70/0`);
    });

    test('Row 1 auto-populates from birthdate', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/social_security_planner`);
      await page.waitForTimeout(3000);

      // Enter a birthdate (Jan 15, 1980)
      await page.fill('[data-ss-planner-target="yourBirthdate"]', '1980-01-15');
      await page.dispatchEvent('[data-ss-planner-target="yourBirthdate"]', 'change');
      await page.waitForTimeout(500);

      // Row 1 should now have the user's current age (46 years as of Feb 2026)
      const row1Years = page.locator('[data-claim-who="your"][data-claim-field="years"]').nth(0);
      const yearsVal = await row1Years.inputValue();
      const yearsNum = parseInt(yearsVal);
      expect(yearsNum).toBeGreaterThanOrEqual(45);
      expect(yearsNum).toBeLessThanOrEqual(47);
      console.log(`${user.email}: Row 1 auto-populated years: ${yearsVal}`);

      // Row 1 months should also be populated (1 for Feb - Jan = 1 month)
      const row1Months = page.locator('[data-claim-who="your"][data-claim-field="months"]').nth(0);
      const monthsVal = await row1Months.inputValue();
      const monthsNum = parseInt(monthsVal);
      expect(monthsNum).toBeGreaterThanOrEqual(0);
      expect(monthsNum).toBeLessThanOrEqual(11);
      console.log(`${user.email}: Row 1 auto-populated months: ${monthsVal}`);

      // FRA and Life Expectancy should be populated
      const fraText = await page.locator('[data-ss-planner-target="yourFRA"]').textContent();
      expect(fraText).toContain('67');
      console.log(`${user.email}: FRA displayed: ${fraText}`);

      const leText = await page.locator('[data-ss-planner-target="yourLifeExpectancy"]').textContent();
      expect(leText).toContain('Years');
      console.log(`${user.email}: Life Expectancy displayed: ${leText}`);
    });

    test('Spouse panel hidden by default, shows on Add Spouse', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/social_security_planner`);
      await page.waitForTimeout(3000);

      // Spouse section should be hidden
      const spouseSection = page.locator('[data-ss-planner-target="spouseSection"]');
      await expect(spouseSection).toBeHidden();
      console.log(`${user.email}: spouse section hidden by default`);

      // Add Spouse button should be visible
      const addSpouseBtn = page.locator('button:has-text("Add Spouse")');
      await expect(addSpouseBtn).toBeVisible();
      console.log(`${user.email}: Add Spouse button visible`);

      // Click Add Spouse
      await addSpouseBtn.click();
      await page.waitForTimeout(500);

      // Spouse section should now be visible
      await expect(spouseSection).toBeVisible();
      console.log(`${user.email}: spouse section visible after click`);

      // Spouse Full Name label should say "(Optional)"
      const spouseLabels = await page.locator('[data-ss-planner-target="spouseSection"] label').allTextContents();
      const spouseNameLabel = spouseLabels.find(l => l.includes('Full Name'));
      expect(spouseNameLabel).toContain('(Optional)');
      console.log(`${user.email}: spouse Full Name says (Optional)`);

      // Remove button should be visible
      const removeBtn = page.locator('button:has-text("Remove")');
      await expect(removeBtn).toBeVisible();
      console.log(`${user.email}: Remove button visible`);

      // Click Remove to hide spouse
      await removeBtn.click();
      await page.waitForTimeout(500);
      await expect(spouseSection).toBeHidden();
      console.log(`${user.email}: spouse section hidden after Remove`);

      // Screenshot
      await page.screenshot({ path: `tests/screenshots/ssbp-cm6-${user.email.split('@')[0]}.png`, fullPage: true });
      console.log(`${user.email}: screenshot saved`);
    });
  });
}
