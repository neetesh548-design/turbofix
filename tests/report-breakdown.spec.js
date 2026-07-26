import { test, expect } from '@playwright/test';

const MACHINE = {
  id: 'm1',
  machine_id: 'M-001',
  machine_name: 'Hydraulic Press',
  location: 'Shop Floor B',
  criticality: 'critical',
  status: 'breakdown',
};

const NOW = new Date().toISOString();

function authScript(role = 'operator') {
  return ({ jwt }) => {
    window.localStorage.setItem('tf_token', jwt);
    window.localStorage.setItem('tf_user', JSON.stringify({
      role,
      name: 'Asha',
      user_id: 'user-1',
      company_name: 'TurboFix Demo',
    }));
  };
}

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  return `${header}.${payload}.fake-signature`;
}

async function mockBreakdownData(page) {
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('machines')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MACHINE]),
      });
    }

    if (url.includes('tickets') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 't1',
            machine_id: MACHINE.id,
            issue_text: 'Spindle making unusual noise',
            status: 'open',
            urgency: 'high',
            created_at: NOW,
          },
        ]),
      });
    }

    if (url.includes('tickets') && method === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 't2', ok: true }]),
      });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/functions/v1/**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

test.describe('Report breakdown scenarios', () => {
  test.beforeEach(async ({ page }) => {
    const jwt = fakeJwt();
    await page.addInitScript(authScript('operator'), { jwt });
    await mockBreakdownData(page);
  });

  test('loads the simple three-step breakdown flow', async ({ page }) => {
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('report-breakdown-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tell TurboFix what happened' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Machine' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Issue' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Photo' })).toBeVisible();
    await expect(page.getByTestId('breakdown-quick-phrases')).toContainText('Oil leak');
    await expect(page.getByTestId('breakdown-submit')).toBeDisabled();
  });

  test('keeps the breakdown flow usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    const breakdown = page.getByTestId('report-breakdown-page');
    await expect(breakdown).toBeVisible();
    await expect(page.getByTestId('breakdown-machine-list')).toBeVisible();
    await expect(page.getByTestId('breakdown-issue-text')).toBeVisible();
    await expect(page.getByTestId('breakdown-submit')).toBeVisible();
    const box = await breakdown.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test('falls back to text when microphone input is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined });
    });
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('breakdown-mic').click();

    await expect(page.getByTestId('breakdown-voice-status')).toContainText(
      'Voice input is not supported on this device — please type it.',
    );
    await expect(page.getByTestId('breakdown-issue-text')).toBeEditable();
  });

  test('records, stops, and adds the voice transcript to the issue', async ({ page }) => {
    await page.addInitScript(() => {
      const stream = { getTracks: () => [{ stop() {} }] };
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => stream },
      });
      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        value: class {
          constructor(input) {
            this.stream = input;
            this.mimeType = 'audio/webm';
          }

          start() {}

          stop() {
            this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) });
            this.onstop?.();
          }
        },
      });
    });
    await page.route('**/functions/v1/ai_translation', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: 'Hydraulic pressure is dropping' }),
    }));
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    const mic = page.getByTestId('breakdown-mic');
    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await expect(mic).toContainText('Stop');

    await mic.click();

    await expect(page.getByTestId('breakdown-issue-text')).toHaveValue(
      'Hydraulic pressure is dropping',
    );
    await expect(page.getByTestId('breakdown-voice-status')).toContainText(
      'Transcribed — check the words below before you send it.',
    );
    await expect(page.getByTestId('breakdown-issue-text')).toBeEditable();
  });

  test('exposes a named page and labelled breakdown steps', async ({ page }) => {
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#main-content[tabindex="-1"]')).toBeVisible();
    for (const name of ['Machine', 'Issue', 'Photo']) {
      await expect(page.getByRole('region', { name })).toBeVisible();
    }
  });

  test('submits a breakdown after choosing the machine and entering the issue', async ({ page }) => {
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('breakdown-machine-list').getByRole('button', { name: /Hydraulic Press/i }).click();
    await page.getByTestId('breakdown-issue-text').fill('Spindle making unusual noise');

    await expect(page.getByTestId('breakdown-submit')).toBeEnabled();
    await page.getByTestId('breakdown-submit').click();

    await expect(page.getByTestId('breakdown-receipt')).toBeVisible();
    await expect(page.getByTestId('breakdown-receipt-message')).toContainText('Hydraulic Press');
    await expect(page.getByTestId('breakdown-report-another')).toBeVisible();
  });

  test('report another returns to a clean entry state', async ({ page }) => {
    await page.goto('/report-breakdown.html', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('breakdown-machine-list').getByRole('button', { name: /Hydraulic Press/i }).click();
    await page.getByTestId('breakdown-issue-text').fill('Unusual vibration from spindle');
    await page.getByTestId('breakdown-submit').click();

    await page.getByTestId('breakdown-report-another').click();

    await expect(page.getByTestId('breakdown-machine-chosen')).toBeVisible();
    await expect(page.getByTestId('breakdown-issue-text')).toHaveValue('');
    await expect(page.getByTestId('breakdown-submit')).toBeDisabled();
  });
});
