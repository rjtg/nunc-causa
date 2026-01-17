import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  webServer: {
    command: "npm run dev:ui",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  use: {
    baseURL: process.env.PW_TEST_BASE_URL ?? "http://localhost:3000",
    headless: true,
    browserName: "firefox",
  },
});
