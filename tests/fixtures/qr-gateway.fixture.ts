/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page } from '@playwright/test';

export type QRGatewayFixtures = {
  qrGatewayPage: Page;
  mockOfflineQueue: () => Promise<any[]>;
  simulateNetworkFailure: (rate: number) => Promise<void>;
  fillPhoneGate: (phone: string) => Promise<void>;
  fillIssueDescription: (text: string) => Promise<void>;
  submitForm: () => Promise<void>;
};

export const test = base.extend<QRGatewayFixtures>({
  qrGatewayPage: async ({ page }, use) => {
    await page.goto('/qr-gateway.html?id=machine-001&name=CNC%20Lathe%201&loc=Shop%20Floor%20A');
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  mockOfflineQueue: async ({ page }, use) => {
    await use(async () => {
      return await page.evaluate(() => {
        const queue = localStorage.getItem('tf_offline_tickets');
        return queue ? JSON.parse(queue) : [];
      });
    });
  },

  simulateNetworkFailure: async ({ page }, use) => {
    await use(async (failureRate: number) => {
      await page.context().route('**/functions/v1/*', route => {
        if (Math.random() < failureRate) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
    });
  },

  fillPhoneGate: async ({ page }, use) => {
    await use(async (phone: string) => {
      await page.fill('input[type="tel"]', phone);
      await page.click('button:has-text("Proceed")');
      await page.waitForTimeout(500);
    });
  },

  fillIssueDescription: async ({ page }, use) => {
    await use(async (text: string) => {
      await page.click('button:has-text("Trouble speaking")');
      await page.fill('textarea', text);
    });
  },

  submitForm: async ({ page }, use) => {
    await use(async () => {
      await page.click('button:has-text("Review & confirm")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Yes, Submit")');
      await page.waitForTimeout(1500);
    });
  },
});

export { expect } from '@playwright/test';
