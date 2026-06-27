import { defineConfig, devices } from "@playwright/test";

const e2eHost = process.env.E2E_HOST ?? "127.0.0.1";
const e2ePort = process.env.E2E_PORT ?? "3101";
const e2eBaseUrl = `http://${e2eHost}:${e2ePort}`;
const shouldManageWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry"
  },
  webServer: shouldManageWebServer
    ? {
        command: "node scripts/run-next-e2e-server.mjs",
        url: e2eBaseUrl,
        reuseExistingServer: false,
        timeout: 120_000
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
