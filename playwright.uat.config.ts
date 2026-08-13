import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.UAT_BASE_URL || 'http://127.0.0.1:5175';
const useManagedServer = !process.env.UAT_NO_WEBSERVER;

export default defineConfig({
  testDir: './tests/uat',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-uat' }],
    ['json', { outputFile: 'test-results-uat.json' }],
    ['list'],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
  },
  ...(useManagedServer ? {
    webServer: {
      command: 'npx vite --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  } : {}),
  projects: [
    {
      name: 'uat-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'uat-tablet',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'uat-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
