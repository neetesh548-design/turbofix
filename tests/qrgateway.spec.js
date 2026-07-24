import { test, expect } from '@playwright/test';

// Mock data
const MOCK_MACHINE = {
  id: 'MOCK-MACHINE-123',
  machine_name: 'CNC Milling Machine #4',
  location: 'Assembly Area A',
  technician_user_id: 'TECH-789'
};

const MOCK_USER = {
  name: 'Neetesh Soni'
};

const MOCK_TICKET = {
  id: 'TICKET-999',
  wo_number: 'WO-020582',
  created_at: new Date().toISOString(),
  lifecycle_stage: 'open',
  urgency: 'high'
};

test.describe('QR Gateway Issue Reporting Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock navigator.mediaDevices.getUserMedia and MediaRecorder for headless browser runs
    await page.addInitScript(() => {
      class MediaRecorderMock {
        state = 'inactive';
        mimeType = 'audio/webm';
        ondataavailable = null;
        onstop = null;
        constructor(stream) {
          this.stream = stream;
        }
        start() {
          this.state = 'recording';
          // Auto-trigger dataavailable/stop if left running (safety timeout)
          this.timeoutId = setTimeout(() => {
            if (this.state === 'recording') {
              this.stop();
            }
          }, 10000);
        }
        stop() {
          clearTimeout(this.timeoutId);
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({
              data: new Blob(['mock audio binary data contents'.repeat(25)], { type: this.mimeType })
            });
          }
          if (this.onstop) {
            this.onstop();
          }
        }
      }

      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => {
          // Return a mock MediaStream with a dummy audio track
          return new MediaStream();
        };
      }
      window.MediaRecorder = MediaRecorderMock;
    });

    // Log browser console logs
    page.on('console', msg => console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Global fallback mock for get_machine_details (e.g. for phone gate and other non-mocked tests)
    await page.route('**/functions/v1/*', async (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody && requestBody.action === 'get_machine_details') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ machine: { id: 'MOCK-MACHINE-123', name: 'CNC Milling Machine #4', location: 'Assembly Area A', technician_name: 'Neetesh Soni' } })
        });
      } else {
        await route.continue();
      }
    });

    // 1. Mock Supabase Fetch Machine Details
    await page.route('**/rest/v1/machines?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MACHINE)
      });
    });

    // 2. Mock Supabase Fetch Technician Name
    await page.route('**/rest/v1/users?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER)
      });
    });

    // 3. Mock Storage Upload for Photos
    await page.route('**/storage/v1/object/repair-proofs/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'repair-proofs/test-img.png' })
      });
    });

    // 4. Mock Storage Get Public URL
    await page.route('**/storage/v1/object/public/repair-proofs/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ publicUrl: 'https://supabase.co/storage/v1/object/public/repair-proofs/MOCK-MACHINE-123/test-img.png' })
      });
    });
  });

  test('Scenario 1: Reporter Mobile Identification (Phone Gate)', async ({ page }) => {
    // Clear localStorage to trigger phone gate
    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Verify phone gate is visible (in either Hindi or English)
    const phoneHeader = page.locator('h3', { hasText: /Mobile Identification|मोबाइल नंबर सत्यापन/ });
    await expect(phoneHeader).toBeVisible();

    // Fill valid phone number and proceed
    await page.fill('input[type="tel"]', '9876543210');
    await page.locator('button', { hasText: /Proceed|आगे बढ़ें/ }).click();

    // Gate should close
    await expect(phoneHeader).not.toBeVisible();
    await expect(page.locator('span', { hasText: /बोलने के लिए|Tap to speak/ })).toBeVisible();
    
    // Verify phone is saved in localStorage
    const savedPhone = await page.evaluate(() => window.localStorage.getItem('tf_reporter_phone'));
    expect(savedPhone).toBe('9876543210');
  });

  test('Scenario 2 & 3: Voice recording, Gemini transcription, and Editing', async ({ page }) => {
    // Set phone number in localStorage to bypass phone gate
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    // Mock Gemini transcription Edge function response
    await page.route('**/functions/v1/*', async (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody && requestBody.action === 'get_machine_details') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ machine: { id: 'MOCK-MACHINE-123', name: 'CNC Milling Machine #4', location: 'Assembly Area A', technician_name: 'Neetesh Soni' } })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcript: 'The spindle motor is overheating and leaking hydraulic fluid' })
        });
      }
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Click to start recording (using the mic button which is the first button containing SVG)
    await page.locator('#voice-mic-button').click({ force: true });
    await expect(page.locator('span', { hasText: /रोकने के लिए दबाएं|Tap to stop/ })).toBeVisible();

    await page.waitForTimeout(1000);
    // Click to stop recording
    await page.locator('#voice-mic-button').click({ force: true });

    // Wait for listen-back step, then send for transcription
    await expect(page.locator('.qr-gateway-listenback')).toBeVisible();
    await page.locator('button', { hasText: 'Send for transcription' }).click();

    // Verify manual description box is filled with transcribed text
    const textInput = page.locator('textarea').first();
    await expect(textInput).toBeVisible();
    await expect(textInput).toHaveValue('The spindle motor is overheating and leaking hydraulic fluid');

    // Edit the text description in the manual box
    await textInput.fill('Spindle motor overheating and leaking hydraulic oil near bottom gasket');

    // Manually select 'stopped' to change condition
    await page.locator('button', { hasText: /बंद है|Stopped/ }).first().click();

    // Click 'Review Report' to open confirmation overlay
    await page.locator('button', { hasText: /समीक्षा|Review/ }).click();

    // Verify confirmation overlay appears (we can assert that the submit button is visible)
    await expect(page.locator('button', { hasText: /हाँ, दर्ज करें|Yes, Submit/ })).toBeVisible();
  });

  test('Scenario 4: Photo capture and attachment preview', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Attach mock photo file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('span', { hasText: /Take Photo or Upload|फोटो लें या अपलोड करें/ }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'issue-breakdown.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data')
    });

    // Verify thumbnail preview and remove button are visible
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
    
    const removeBtn = page.locator('button', { hasText: /हटाएं|Remove/ });
    await expect(removeBtn).toBeVisible();

    // Remove photo and verify cleared
    await removeBtn.click();
    await expect(page.locator('img[alt="Preview"]')).not.toBeVisible();
  });

  test('Scenario 5: Duplicate ticket detection and merging', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    // Mock duplicate tickets check - return an existing open ticket
    await page.route('**/rest/v1/tickets?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TICKET)
      });
    });

    // Mock Gemini transcription and public ticket update responses
    await page.route('**/functions/v1/*', async (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody && requestBody.action === 'check_duplicate') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ duplicate: { id: 'DUPLICATE-ID-111', issue_text: 'Oil leak on main line', created_at: new Date().toISOString() } })
        });
      } else if (requestBody && requestBody.action === 'get_ticket') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { ai_summary: { photo_url: null } } })
        });
      } else if (requestBody && requestBody.action === 'get_machine_details') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ machine: { id: 'MOCK-MACHINE-123', name: 'CNC Milling Machine #4', location: 'Assembly Area A', technician_name: 'Neetesh Soni' } })
        });
      } else if (requestBody && (requestBody.action === 'log_ticket' || requestBody.action === 'update_ticket')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_TICKET })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcript: 'Leak is getting worse' })
        });
      }
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Record voice (click to start and click to stop)
    await page.locator('#voice-mic-button').click({ force: true });
    await expect(page.locator('span', { hasText: /रोकने के लिए दबाएं|Tap to stop/ })).toBeVisible();
    await page.waitForTimeout(1000);
    await page.locator('#voice-mic-button').click({ force: true });

    // Wait for listen-back and send for transcription
    await expect(page.locator('.qr-gateway-listenback')).toBeVisible();
    await page.locator('button', { hasText: 'Send for transcription' }).click();

    // Wait for voice transcription to complete and populate the description box
    await expect(page.locator('textarea').first()).toHaveValue('Leak is getting worse');

    // Click Review Report
    await page.locator('button', { hasText: /समीक्षा|Review/ }).click();

    // Trigger ticket insertion
    await page.locator('button', { hasText: /हाँ, दर्ज करें|Yes, Submit/ }).click();

    // Verify duplicate warning screen
    await expect(page.locator('h4', { hasText: /समान टिकट पहले से खुला है|Similar Ticket Open/ })).toBeVisible();
    await expect(page.locator('button', { hasText: /विवरण जोड़ें \(अनुशंसित\)|Append Details/ })).toBeVisible();
  });

  test('Scenario 6: Successful Ticket Submission and receipt visual', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    // Mock tickets check (no duplicates) and ticket insertion
    await page.route('**/rest/v1/tickets?*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_TICKET)
        });
      }
    });

    await page.route('**/functions/v1/*', async (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody && requestBody.action === 'check_duplicate') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ duplicate: null })
        });
      } else if (requestBody && requestBody.action === 'get_machine_details') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ machine: { id: 'MOCK-MACHINE-123', name: 'CNC Milling Machine #4', location: 'Assembly Area A', technician_name: 'Neetesh Soni' } })
        });
      } else if (requestBody && (requestBody.action === 'log_ticket' || requestBody.action === 'update_ticket')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_TICKET })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcript: 'Air pipe leak' })
        });
      }
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    await page.locator('#voice-mic-button').click({ force: true });
    await expect(page.locator('span', { hasText: /रोकने के लिए दबाएं|Tap to stop/ })).toBeVisible();
    await page.waitForTimeout(1000);
    await page.locator('#voice-mic-button').click({ force: true });

    await expect(page.locator('.qr-gateway-listenback')).toBeVisible();
    await page.locator('button', { hasText: 'Send for transcription' }).click();

    // Wait for voice transcription to complete and populate the description box
    await expect(page.locator('textarea').first()).toHaveValue('Air pipe leak');

    // Click Review Report
    await page.locator('button', { hasText: /समीक्षा|Review/ }).click();

    await page.locator('button', { hasText: /हाँ, दर्ज करें|Yes, Submit/ }).click();

    // Verify receipt visual is shown
    await expect(page.locator('h3', { hasText: /Ticket Registered Successfully!|टिकट सफलतापूर्वक दर्ज हुआ!/ })).toBeVisible();
    await expect(page.locator('strong:has-text("WO-020582")')).toBeVisible();
    await expect(page.locator('span:has-text("CNC Milling Machine #4")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Neetesh Soni")')).toBeVisible();

    // Verify clicking "Report Another Issue" resets form state
    await page.locator('button', { hasText: /दूसरी समस्या रिपोर्ट करें|Report Another Issue/ }).click();
    await expect(page.locator('h3', { hasText: /Ticket Registered Successfully!|टिकट सफलतापूर्वक दर्ज हुआ!/ })).not.toBeVisible();
    await expect(page.locator('span', { hasText: /बोलने के लिए|Tap to speak/ })).toBeVisible();
  });

  test('Scenario 7: Transcription Failure and Fallback to Manual Input', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    // Mock Gemini transcription failure (status 500)
    await page.route('**/functions/v1/*', async (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody && requestBody.action === 'get_machine_details') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ machine: { id: 'MOCK-MACHINE-123', name: 'CNC Milling Machine #4', location: 'Assembly Area A', technician_name: 'Neetesh Soni' } })
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal API Server Error' })
        });
      }
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Trigger recording
    await page.locator('#voice-mic-button').click({ force: true });
    await expect(page.locator('span', { hasText: /रोकने के लिए दबाएं|Tap to stop/ })).toBeVisible();
    await page.waitForTimeout(1000);
    await page.locator('#voice-mic-button').click({ force: true });

    // Listen-back should remain available on transcription failure
    await expect(page.locator('.qr-gateway-listenback')).toBeVisible();
    await page.locator('button', { hasText: 'Send for transcription' }).click();

    // Verify error instruction is shown and fallback path is available
    await expect(page.locator('div', { hasText: /non-2xx|Error|failed/i }).first()).toBeVisible();

    // Click trouble speaking / manual text input fallback button
    await page.locator('button', { hasText: /बोलने में समस्या|Trouble speaking/ }).click();

    // Verify manual textbox is cleared and available
    await expect(page.locator('textarea').first()).toHaveValue('');
  });

  test('Scenario 8: Language Translation Toggle updates UI labels', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Verify default Hindi state
    await expect(page.locator('span', { hasText: /बोलने के लिए/ })).toBeVisible();
    // Toggle language to English using the select dropdown
    await page.locator('select').selectOption('en-US');

    // Verify UI labels changed to English
    await expect(page.locator('span', { hasText: 'Tap to speak' })).toBeVisible();
    await expect(page.locator('button', { hasText: /Trouble speaking\? Write here|बोलने में समस्या\? लिखकर दर्ज करें/ })).toBeVisible();

    // Toggle language back to Hindi using the select dropdown
    await page.locator('select').selectOption('hi-IN');
    await expect(page.locator('span', { hasText: /बोलने के लिए/ })).toBeVisible();
  });

  test('Scenario 9: Empty Description validation prevention', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Open manual entry form
    await page.locator('button', { hasText: /लिखकर दर्ज करें|Trouble speaking\? Write here/ }).click();
    await expect(page.locator('textarea')).toBeVisible();

    // Ensure description is empty
    await page.locator('textarea').fill('');

    // Capture dialog alert
    let alertMsg = '';
    page.on('dialog', async (dialog) => {
      alertMsg = dialog.message();
      await dialog.accept();
    });

    // Click Review Report
    await page.locator('button', { hasText: /समीक्षा|Review/ }).click();

    // Verify alert message was captured and validation stopped overlay from appearing
    expect(alertMsg).toMatch(/समस्या का विवरण लिखें|Please describe the issue/);
    await expect(page.locator('button', { hasText: /हाँ, दर्ज करें|Yes, Submit/ })).not.toBeVisible();
  });

  test('Scenario 10: Microphone Access Denied Fallback', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
      // Mock getUserMedia to reject
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
        },
        configurable: true
      });
    });

    await page.goto('/qr-gateway.html?id=MOCK-MACHINE-123');

    // Click mic button
    await page.locator('#voice-mic-button').click({ force: true });

    // Verify error alert/dialog is displayed
    await expect(page.locator('span', { hasText: /माइक एक्सेस समस्या|Microphone Access Blocked/ })).toBeVisible();

    // Verify fallback form textarea is displayed
    await expect(page.locator('textarea')).toBeVisible();
  });

});
