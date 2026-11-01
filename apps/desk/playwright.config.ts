import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end: the built Desk against a real runner with seeded cases
 * (scripts/desk-dev-server.mjs), on its own port with a pinned token.
 * `pnpm --filter @counterpart/desk e2e`; the Desk must be built first.
 */

export const E2E_PORT = 4790;
export const E2E_TOKEN = 'e2e-token-for-tests-only';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node ../../scripts/desk-dev-server.mjs',
    url: `http://127.0.0.1:${E2E_PORT}/api/health`,
    env: { COUNTERPART_PORT: String(E2E_PORT), COUNTERPART_TOKEN: E2E_TOKEN },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
