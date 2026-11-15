import { defineConfig, devices } from "@playwright/test";

// Runs `tests-dev/` against `astro dev`, where drafts are previewable.
const PORT = 4341;

export default defineConfig({
  testDir: "./tests-dev",
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    channel: process.env.CI ? undefined : "chrome",
  },
  // The dev server compiles pages on first request.
  timeout: 60_000,
  webServer: {
    // `--ignore-lock` keeps astro in the foreground (it backgrounds itself
    // when it detects a coding agent), so Playwright can stop it.
    command: `pnpm astro dev --port ${PORT} --ignore-lock`,
    port: PORT,
    // Never reuse: another checkout's dev server would answer for this one.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
