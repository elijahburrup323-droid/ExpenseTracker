const { chromium } = require('playwright');
const fs = require('fs');

async function testSite() {
  const issues = [];
  const log = (msg) => {
    console.log(msg);
    issues.push(msg);
  };

  log('=== ExpenseTracker Site Test Log ===');
  log('Test started: ' + new Date().toISOString());
  log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  try {
    // Test 1: Home page
    log('--- Test 1: Home Page ---');
    const response = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (!response.ok()) {
      log('ISSUE: Home page returned status ' + response.status());
      const body = await page.content();
      if (body.includes('AssetNotPrecompiledError') || body.includes('AssetNotFound')) {
        log('ISSUE: Asset compilation error detected');
      }
      if (body.includes('Sprockets::')) {
        log('ISSUE: Sprockets error - asset pipeline misconfigured');
      }
    } else {
      log('OK: Home page loaded successfully');
    }

    log('Page title: ' + await page.title());

    // Test 2: Login page
    log('');
    log('--- Test 2: Login Page ---');
    const loginResponse = await page.goto('http://localhost:3000/users/sign_in', { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (loginResponse.ok()) {
      log('OK: Login page accessible');

      const emailField = await page.$('input[name*="email"], input[type="email"]');
      const passwordField = await page.$('input[name*="password"], input[type="password"]');
      const submitBtn = await page.$('input[type="submit"], button[type="submit"]');

      log(emailField ? 'OK: Email field found' : 'ISSUE: Email field not found');
      log(passwordField ? 'OK: Password field found' : 'ISSUE: Password field not found');
      log(submitBtn ? 'OK: Submit button found' : 'ISSUE: Submit button not found');
    } else {
      log('ISSUE: Login page returned status ' + loginResponse.status());
    }

    // Test 3: Login attempt
    log('');
    log('--- Test 3: Login Attempt ---');
    try {
      await page.fill('input[name*="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name*="password"], input[type="password"]', 'password123');
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      const currentUrl = page.url();
      if (currentUrl.includes('sign_in')) {
        log('ISSUE: Login failed - still on sign_in page');
      } else {
        log('OK: Login successful, redirected to: ' + currentUrl);

        log('');
        log('--- Test 4: Dashboard ---');
        const navBar = await page.$('nav, .navbar');
        log(navBar ? 'OK: Navigation bar present' : 'INFO: No navigation bar');

        const logoutLink = await page.$('a[href*="sign_out"], button:has-text("Log out")');
        log(logoutLink ? 'OK: Logout link found' : 'INFO: No logout link found');
      }
    } catch (err) {
      log('ISSUE: Login test failed - ' + err.message);
    }

    // Test 4: Signup page
    log('');
    log('--- Test 5: Signup Page ---');
    const signupResponse = await page.goto('http://localhost:3000/users/sign_up', { waitUntil: 'domcontentloaded', timeout: 30000 });
    log(signupResponse.ok() ? 'OK: Signup page accessible' : 'ISSUE: Signup page returned status ' + signupResponse.status());

  } catch (error) {
    log('CRITICAL ERROR: ' + error.message);
  }

  if (consoleErrors.length > 0) {
    log('');
    log('--- Console Errors ---');
    consoleErrors.forEach(err => log('  ' + err));
  }

  if (pageErrors.length > 0) {
    log('');
    log('--- Page Errors ---');
    pageErrors.forEach(err => log('  ' + err));
  }

  log('');
  log('=== Test Complete ===');

  await browser.close();
  fs.writeFileSync('c:/Projects/ExpenseTracker/log/testlog.txt', issues.join('\n'));
  console.log('\nLog written to c:/Projects/ExpenseTracker/log/testlog.txt');
}

testSite().catch(console.error);
