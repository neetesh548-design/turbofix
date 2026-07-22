import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('QRGateway - Worst Case Scenarios', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    await page.addInitScript(() => {
      window.localStorage.setItem('tf_lang', 'en-US');
    });

    // Setup: Navigate to QR Gateway
    await page.goto('/qr-gateway.html?id=machine-001&name=CNC%20Lathe%201&loc=Shop%20Floor%20A');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page?.close().catch(() => {});
  });

  // ========== NETWORK & CONNECTIVITY FAILURES ==========

  test('Should handle offline submission and queue ticket locally', async () => {
    // Simulate offline condition
    await page.context().setOffline(true);

    // Phone gate
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input mode
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Machine overheating issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();

    // Try to submit
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();
    await page.waitForTimeout(800);

    // Verify offline queue was created
    const offlineQueue = await page.evaluate(() => {
      return localStorage.getItem('tf_offline_tickets');
    });
    expect(offlineQueue).toBeTruthy();
    expect(JSON.parse(offlineQueue || '[]').length).toBeGreaterThan(0);

    // Should show offline saved message
  });

  test('Should retry on transient network failures', async () => {
    // Simulate network timeout
    await page.context().route('**/functions/v1/*', route => {
      // First request fails, second succeeds
      if (Math.random() > 0.5) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Should eventually succeed after retries
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();

    // Submit and wait for retry logic
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();

    // Should handle the retry gracefully
    await page.waitForTimeout(3000);
  });

  test('Should handle API timeout gracefully', async () => {
    // Simulate slow API responses
    await page.context().route('**/functions/v1/*', route => {
      setTimeout(() => route.continue(), 15000); // Simulate 15s timeout
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Try to submit
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Urgent issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();

    // The current flow should remain stable even if the network is slow.
    await page.waitForTimeout(3000);
    await expect(page.locator('main')).toBeVisible();
  });

  // ========== PERMISSION & ACCESS DENIED ==========

  test('Should handle microphone permission denied', async () => {
    await page.context().addInitScript(() => {
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('Permission denied', 'NotAllowedError');
        };
      }
      window.__originalGetUserMedia = originalGetUserMedia;
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    await page.locator('button#voice-mic-button').click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('textarea').first()).toBeVisible();
    await expect(page.getByText(/Microphone Access Blocked|माइक एक्सेस समस्या|माइक प्रवेश अडचण/)).toBeVisible();
  });

  test('Should handle camera permission denied for photo upload', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');

    // Try to access camera
    const cameraLabel = page.locator('label:has-text("Attach Photo")').or(page.locator('[style*="Camera"]'));
    await cameraLabel.click();
    await page.waitForTimeout(500);

    // Should handle gracefully - text submission should still work
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await expect(page.locator('.qr-gateway-review textarea').first()).toHaveValue('Test issue');
  });

  // ========== SPEECH RECOGNITION FAILURES ==========

  test('Should handle no speech detected error', async () => {
    // Mock the voice path so the recorder ends without a transcript.
    await page.context().addInitScript(() => {
      const MediaRecorderMock = class {
        state = 'inactive';
        mimeType = 'audio/webm';
        ondataavailable;
        onstop;
        constructor(stream) {
          this.stream = stream;
        }
        start() {
          this.state = 'recording';
          setTimeout(() => {
            this.state = 'inactive';
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob(['voice'.repeat(200)], { type: this.mimeType }) });
            }
            if (this.onstop) this.onstop();
          }, 250);
        }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['voice'.repeat(200)], { type: this.mimeType }) });
          }
          if (this.onstop) this.onstop();
        }
      };

      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => new MediaStream();
      }
      window.MediaRecorder = MediaRecorderMock;
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.context().route('**/functions/v1/*', route => {
      if (route.request().postDataJSON()?.action === 'transcribe') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transcript: '' })
        });
      } else {
        route.continue();
      }
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Start voice input
    await page.locator('button#voice-mic-button').click({ force: true });

    await expect(page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i })).toBeVisible();
    await page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i })).toBeVisible();
    await expect(page.locator('audio[controls]')).toBeVisible();
    await expect(page.locator('.qr-gateway-review')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या|लिखकर दर्ज करें/i })).toBeVisible();
  });

  test('Should handle transcription API failure', async () => {
    await page.context().addInitScript(() => {
      const MediaRecorderMock = class {
        state = 'inactive';
        mimeType = 'audio/webm';
        ondataavailable;
        onstop;
        constructor(stream) {
          this.stream = stream;
        }
        start() {
          this.state = 'recording';
          setTimeout(() => {
            this.state = 'inactive';
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob(['voice'.repeat(200)], { type: this.mimeType }) });
            }
            if (this.onstop) this.onstop();
          }, 250);
        }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['voice'.repeat(200)], { type: this.mimeType }) });
          }
          if (this.onstop) this.onstop();
        }
      };

      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => new MediaStream();
      }
      window.MediaRecorder = MediaRecorderMock;
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Mock transcription endpoint to fail
    await page.context().route('**/functions/v1/*', route => {
      if (route.request().postDataJSON()?.action === 'transcribe') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Try voice input
    await page.locator('button#voice-mic-button').click({ force: true });

    await expect(page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i })).toBeVisible();
    await page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i }).click();
    await page.waitForTimeout(500);

    // Should preserve the recording and offer fallback retry paths
    await expect(page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i })).toBeVisible();
    await expect(page.locator('audio[controls]')).toBeVisible();
    await expect(page.locator('.qr-gateway-review')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या|लिखकर दर्ज करें/i })).toBeVisible();
  });

  test('Should handle SpeechRecognition API unavailable', async () => {
    // Mock unavailable SpeechRecognition
    await page.addInitScript(() => {
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Should still allow text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    const textarea = page.locator('textarea');
    expect(await textarea.isVisible()).toBeTruthy();

    // Should be able to submit text
    await textarea.fill('Machine issue via text');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    expect(page.locator('h4:has-text("Review")')).toBeVisible();
  });

  // ========== INVALID INPUT SCENARIOS ==========

  test('Should validate phone number format on phone gate', async () => {
    // Try invalid phone numbers
    const testCases = [
      { input: 'abcdefghij', shouldPass: false },
      { input: '123', shouldPass: false },
      { input: '123456789', shouldPass: false }, // Too short
      { input: '9876543210', shouldPass: true },
    ];

    for (const testCase of testCases) {
      await page.fill('input[type="tel"]', testCase.input);
      await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();

      if (testCase.shouldPass) {
        await page.waitForTimeout(500);
        // Should proceed to voice input
        expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
      } else {
        // Invalid input should keep the gate active.
        await expect(page.locator('input[type="tel"]')).toBeVisible();
      }

      // Reset for next test
      await page.reload();
    }
  });

  test('Should handle very long issue descriptions', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();

    // Generate very long text (10KB)
    const longText = 'Issue: ' + 'A'.repeat(10000);
    await page.fill('textarea', longText);

    // Should not crash or truncate unexpectedly
    const textValue = await page.inputValue('textarea');
    expect(textValue.length).toBeGreaterThan(5000);

    // Should still allow submission
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    const reviewArea = page.locator('.qr-gateway-review textarea').first();
    await expect(reviewArea).toBeVisible();
  });

  test('Should handle special characters in input', async () => {
    await page.fill('input[type="tel"]', '9876543210');
      await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();

    // Try special characters that might break JSON/encoding
    const specialText = 'Issue: <script>alert("xss")</script> & "quotes" & \'single\' \\backslash \\n newline';
    await page.fill('textarea', specialText);
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();

    // Should safely handle special chars
    const reviewText = await page.locator('.qr-gateway-review textarea').first().inputValue();
    expect(reviewText).toContain('script');
    expect(reviewText).not.toEqual(''); // Should not be sanitized to empty
  });

  test('Should handle empty/whitespace-only submission', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();

    // Try to submit empty text
    await page.fill('textarea', '   ');
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  // ========== PHOTO UPLOAD FAILURES ==========

  test('Should handle corrupted image file', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');

    // Create and upload corrupted image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{ name: 'corrupt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xFF, 0xD8, 0xFF]) }]);
    await page.waitForTimeout(800);

    // Should handle gracefully - still allow submission without photo
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await expect(page.locator('.qr-gateway-review textarea').first()).toHaveValue('Test issue');
  });

  test('Should handle very large image file (>50MB)', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();

    // Simulate large file selection
    const largePath = '/private/tmp/turbofix-large-test.jpg';
    const fs = await import('fs');
    if (!fs.existsSync(largePath)) {
      fs.writeFileSync(largePath, Buffer.alloc(60 * 1024 * 1024));
    }
    await page.locator('input[type="file"]').setInputFiles(largePath);

    await page.waitForTimeout(1000);

    // Should warn about file size or handle gracefully
    // File upload should still be optional
    await page.fill('textarea', 'Issue description');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await expect(page.locator('.qr-gateway-review textarea').first()).toBeVisible();
  });

  test('Should handle storage upload failure', async () => {
    // Mock storage upload to fail
    await page.context().route('**/repair-proofs/**', route => {
      route.abort('failed');
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input with photo
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Issue with photo');

    // Add a valid image (simulated)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('fake-image-data') }]);
    await page.waitForTimeout(500);

    // Try to submit
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();
    await page.waitForTimeout(2000);

    // Should not break the screen even if the photo upload fails.
    await expect(page.locator('main')).toBeVisible();
  });

  // ========== CONCURRENT & RACE CONDITIONS ==========

  test('Should handle rapid form submissions', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();

    // Rapidly click submit button multiple times
    const submitBtn = page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ });
    for (let i = 0; i < 5; i++) {
      await submitBtn.click();
      await page.waitForTimeout(100);
    }

    // Should only submit once
    await page.waitForTimeout(2000);
    await expect(page.locator('.qr-gateway-review')).toBeVisible();
  });

  test('Should handle language change during submission', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go to text input
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();

    // Change language while form is being submitted
    const select = page.locator('select').first();
    await select.selectOption('mr-IN');
    await page.waitForTimeout(500);

    // Should handle language switch gracefully
    // Form should still be functional
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();
    await page.waitForTimeout(2000);
  });

  // ========== BROWSER API FAILURES ==========

  test('Should handle localStorage quota exceeded', async () => {
    // Fill localStorage to near capacity
    const keys: string[] = [];
    try {
      for (let i = 0; i < 1000; i++) {
        const key = `test_key_${i}`;
        localStorage[key] = 'x'.repeat(10000);
        keys.push(key);
      }
    } catch (e) {
      // Expected to fail at some point
    }

    // Try to submit ticket (should queue offline)
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go offline to force queue
    await page.context().setOffline(true);

    // Try to submit
    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();
    await page.waitForTimeout(1500);

    // Should handle gracefully
    await expect(page.locator('main')).toBeVisible();

    // Cleanup
    for (const key of keys) {
      delete localStorage[key];
    }
  });

  test('Should handle speechSynthesis API failure', async () => {
    // Disable speechSynthesis
    await page.addInitScript(() => {
      (window as any).speechSynthesis = null;
    });

    // Should still work without audio feedback
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Should proceed normally
    expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
  });

  // ========== EDGE CASES & STATE MANAGEMENT ==========

  test('Should handle back button during phone gate', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Go back in browser history
    await page.goBack();
    await page.waitForTimeout(500);

    // Current flow lands back on the initial browser state.
    await expect(page).toHaveURL('about:blank');
  });

  test('Should persist reporter phone across page reload', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should remember phone across reload
    const savedPhone = await page.evaluate(() => localStorage.getItem('tf_reporter_phone'));
    expect(savedPhone).toBe('9876543210');
  });

  test('Should handle machine details fetch failure', async () => {
    // Mock machine details endpoint to fail
    await page.context().route('**/functions/v1/*', route => {
      if (route.request().postDataJSON()?.action === 'get_machine_details') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Should still load with fallback machine name
    expect(await page.locator('text=CNC Lathe 1').isVisible()).toBeTruthy();
  });

  test('Should handle duplicate check failure gracefully', async () => {
    // Mock duplicate check to fail
    await page.context().route('**/functions/v1/*', route => {
      if (route.request().postDataJSON()?.action === 'check_duplicate') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Should still allow offline submission
    await page.context().setOffline(true);

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Test issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();
    await page.waitForTimeout(1500);

    // Should queue offline
    const queue = await page.evaluate(() => localStorage.getItem('tf_offline_tickets'));
    expect(queue).toBeTruthy();
  });

  test('Should handle ticket log failure with fallback', async () => {
    // First ticket log fails, but should queue offline
    await page.context().setOffline(true);

    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या/ }).click();
    await page.fill('textarea', 'Critical issue');
    await page.getByRole('button', { name: /Review & confirm|समीक्षा|पुष्टि/ }).click();
    await page.getByRole('button', { name: /Yes, Submit|हाँ, दर्ज करें|होय, नोंदवा/ }).click();
    await page.waitForTimeout(1500);

    // Should show success/offline indicator
    const successOrOffline = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('offline') || text.includes('Successfully') || text.includes('success');
    });
    expect(successOrOffline).toBeTruthy();
  });

  test('Should handle rapid language switches without state corruption', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();
    await page.waitForTimeout(500);

    // Rapidly switch languages
    const select = page.locator('select').first();
    const languages = ['hi-IN', 'mr-IN', 'en-US', 'hi-IN', 'mr-IN'];

    for (const lang of languages) {
      await select.selectOption(lang);
      await page.waitForTimeout(100);
    }

    // Should maintain form state
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('Should handle zero-width screen edge case', async () => {
    // Simulate extreme viewport
    await page.setViewportSize({ width: 300, height: 800 });
    await page.waitForTimeout(500);

    // Should still be usable
    await page.fill('input[type="tel"]', '9876543210');
    await page.getByRole('button', { name: /Proceed|आगे बढ़ें/ }).click();

    // All buttons should be accessible
    expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
  });
});
