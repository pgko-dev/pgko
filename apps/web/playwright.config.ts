import { defineConfig, devices } from "@playwright/test";

const previewOrigin = "http://127.0.0.1:43180";

export default defineConfig({
  testDir: "./e2e/node",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  use: {
    baseURL: previewOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command:
      "bun run --cwd ../.. build:packages && bun x --no-install vite build --config e2e/vite.config.ts && bun x --no-install vite preview --config e2e/vite.config.ts --host 127.0.0.1 --port 43180 --strictPort",
    url: `${previewOrigin}/e2e/browser/bundle.html`,
    // Always build the current sources, independently of the manual lab on port 43179.
    reuseExistingServer: false,
    env: { PUBLIC_API_URL: previewOrigin },
  },
});
