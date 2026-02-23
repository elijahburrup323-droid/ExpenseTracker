// Playwright config for UAT QA gate before production promotion
// Excludes prod-specific, local-only, debug, and one-off email tests
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: "https://djburrup.com/mybudgethq",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  reporter: [["list"]],
  testIgnore: [
    "**/prod-*",
    "**/local-*",
    "**/send-*",
    "**/debug-*",
    "**/localhost-*",
    "**/reset-*",
    "**/ui-audit-*",
  ],
});
