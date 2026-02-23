const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|mybudgethq/, { timeout: 30000 });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
}

test('Debug text-scale controller binding', async ({ page }) => {
  test.setTimeout(60000);
  const user = { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' };

  // Collect console messages
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMsgs.push(`[PAGE_ERROR] ${err.message}`));

  await login(page, user);
  await page.waitForTimeout(2000);

  // 1. Check if the controller element exists
  const controlEl = page.locator('[data-controller="text-scale"]');
  const exists = await controlEl.count();
  console.log(`Controller element count: ${exists}`);

  if (exists > 0) {
    // 2. Check data attributes
    const attrs = await controlEl.evaluate(el => ({
      controller: el.dataset.controller,
      apiUrl: el.dataset.textScaleApiUrlValue,
      csrfToken: el.dataset.textScaleCsrfTokenValue ? '(present)' : '(missing)',
      current: el.dataset.textScaleCurrentValue
    }));
    console.log('Data attributes:', JSON.stringify(attrs, null, 2));

    // 3. Check if Stimulus application exists and has the controller
    const stimulusInfo = await page.evaluate(() => {
      const app = window.Stimulus || window.application;
      if (!app) return { stimulusFound: false };

      // Try to find the Stimulus application on the document
      const el = document.querySelector('[data-controller="text-scale"]');
      if (!el) return { stimulusFound: true, elementFound: false };

      // Check if the controller instance is connected
      const controller = el.__stimulus_controllers || el.getAttribute('data-controller');

      // Try accessing via Stimulus application
      let registered = 'unknown';
      try {
        // Stimulus 3.x stores controllers in application.router.modules
        if (app.router && app.router.modules) {
          registered = Array.from(app.router.modules).map(m => m.definition.identifier);
        }
      } catch(e) {
        registered = `error: ${e.message}`;
      }

      return {
        stimulusFound: true,
        elementFound: true,
        controllerAttr: controller,
        registered
      };
    });
    console.log('Stimulus info:', JSON.stringify(stimulusInfo, null, 2));

    // 4. Check if the controller is actually connected by checking the increase button
    const increaseBtn = page.locator('[data-text-scale-target="increase"]');
    const btnExists = await increaseBtn.count();
    console.log(`Increase button count: ${btnExists}`);

    if (btnExists > 0) {
      const btnDisabled = await increaseBtn.isDisabled();
      console.log(`Increase button disabled: ${btnDisabled}`);

      // 5. Try to access the controller instance via Stimulus
      const controllerConnected = await page.evaluate(() => {
        const el = document.querySelector('[data-controller="text-scale"]');
        // Stimulus 3.x attaches controller references
        const app = document.querySelector('[data-controller]')?.__stimulusApplication ||
                    window.Stimulus;

        if (app) {
          try {
            const ctrl = app.getControllerForElementAndIdentifier(el, 'text-scale');
            if (ctrl) {
              return {
                connected: true,
                currentValue: ctrl.currentValue,
                hasDisplay: ctrl.hasDisplayTarget,
                hasIncrease: ctrl.hasIncreaseTarget,
                hasDecrease: ctrl.hasDecreaseTarget
              };
            }
            return { connected: false, reason: 'getControllerForElementAndIdentifier returned null' };
          } catch(e) {
            return { connected: false, reason: e.message };
          }
        }
        return { connected: false, reason: 'No Stimulus app found' };
      });
      console.log('Controller connected:', JSON.stringify(controllerConnected, null, 2));

      // 6. Try clicking via direct JS dispatch
      const displayBefore = await page.locator('[data-text-scale-target="display"]').textContent();
      console.log(`Display text before click: "${displayBefore.trim()}"`);

      await page.evaluate(() => {
        const btn = document.querySelector('[data-text-scale-target="increase"]');
        btn.click();
      });
      await page.waitForTimeout(1000);

      const displayAfter = await page.locator('[data-text-scale-target="display"]').textContent();
      console.log(`Display text after JS click: "${displayAfter.trim()}"`);

      // 7. Try Playwright click
      await page.locator('[data-text-scale-target="increase"]').click({ force: true });
      await page.waitForTimeout(1000);

      const displayAfter2 = await page.locator('[data-text-scale-target="display"]').textContent();
      console.log(`Display text after Playwright click: "${displayAfter2.trim()}"`);
    }
  }

  // 8. Print any JS errors from console
  const errors = consoleMsgs.filter(m => m.includes('ERROR') || m.includes('error') || m.includes('Error'));
  console.log(`\nConsole errors (${errors.length}):`);
  errors.forEach(e => console.log(`  ${e}`));

  // Print all console messages for debugging
  console.log(`\nAll console messages (${consoleMsgs.length}):`);
  consoleMsgs.forEach(m => console.log(`  ${m}`));
});
