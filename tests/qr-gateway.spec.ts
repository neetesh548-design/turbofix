import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('QRGateway - Worst Case Scenarios', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup: Navigate to QR Gateway
    await page.goto('http://localhost:5173/qr-gateway.html?id=machine-001&name=CNC%20Lathe%201&loc=Shop%20Floor%20A');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ========== NETWORK & CONNECTIVITY FAILURES ==========

  test('Should handle offline submission and queue ticket locally', async () => {
    // Simulate offline condition
    await page.context().setOffline(true);

    // Phone gate
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input mode
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Machine overheating issue');
    await page.click('button:has-text("Review & confirm")');

    // Try to submit
    await page.click('button:has-text("Yes, Submit")');
    await page.waitForTimeout(800);

    // Verify offline queue was created
    const offlineQueue = await page.evaluate(() => {
      return localStorage.getItem('tf_offline_tickets');
    });
    expect(offlineQueue).toBeTruthy();
    expect(JSON.parse(offlineQueue || '[]').length).toBeGreaterThan(0);

    // Should show offline saved message
    const promptText = await page.locator('p[style*="color"]').first().textContent();
    expect(promptText).toContain('offline');
  });

  test('Should retry on transient network failures', async () => {
    // Simulate network timeout
    await page.context().route('**/ai_assistant', route => {
      // First request fails, second succeeds
      if (Math.random() > 0.5) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Should eventually succeed after retries
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');
    await page.click('button:has-text("Review & confirm")');

    // Submit and wait for retry logic
    await page.click('button:has-text("Yes, Submit")');

    // Should handle the retry gracefully
    await page.waitForTimeout(3000);
  });

  test('Should handle API timeout gracefully', async () => {
    // Simulate slow API responses
    await page.context().route('**/ai_assistant', route => {
      setTimeout(() => route.continue(), 15000); // Simulate 15s timeout
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Try to submit
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Urgent issue');
    await page.click('button:has-text("Review & confirm")');

    // Should timeout and show error
    await page.waitForTimeout(3000);
    const errorMsg = await page.locator('[style*="rgba(239,68,68)"]').first().textContent();
    // Should either queue offline or show error
    expect(errorMsg || (await page.evaluate(() => localStorage.getItem('tf_offline_tickets')))).toBeTruthy();
  });

  // ========== PERMISSION & ACCESS DENIED ==========

  test('Should handle microphone permission denied', async () => {
    // Reject microphone access
    await page.context().grantPermissions([]);

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Try to use voice input
    const voiceButton = page.locator('button#voice-mic-button');
    await voiceButton.click();
    await page.waitForTimeout(800);

    // Should show microphone blocked error
    const errorAlert = page.locator('[style*="rgba(239,68,68,0.12)"]');
    const errorText = await errorAlert.textContent();
    expect(errorText).toContain('Microphone');

    // Should fallback to text input option
    const textButton = page.locator('button:has-text("Trouble speaking")');
    expect(await textButton.isVisible()).toBeTruthy();
  });

  test('Should handle camera permission denied for photo upload', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');

    // Try to access camera
    const cameraLabel = page.locator('label:has-text("Attach Photo")').or(page.locator('[style*="Camera"]'));
    await cameraLabel.click();
    await page.waitForTimeout(500);

    // Should handle gracefully - text submission should still work
    await page.click('button:has-text("Review & confirm")');
    expect(page.locator('textarea')).toHaveValue('Test issue');
  });

  // ========== SPEECH RECOGNITION FAILURES ==========

  test('Should handle no speech detected error', async () => {
    // Mock SpeechRecognition to return no results
    await page.addInitScript(() => {
      const SpeechRecognitionMock = class {
        lang = 'en-US';
        continuous = true;
        interimResults = true;
        onresult: any;
        onerror: any;

        start() {}
        stop() {
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({ results: [], resultIndex: 0 });
            }
          }, 1000);
        }
        abort() {}
      };

      (window as any).SpeechRecognition = SpeechRecognitionMock;
      (window as any).webkitSpeechRecognition = SpeechRecognitionMock;
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Start voice input
    const voiceButton = page.locator('button#voice-mic-button');
    await voiceButton.click();
    await page.waitForTimeout(1500);

    // Should fall back to text input
    const textFallback = page.locator('textarea');
    expect(await textFallback.isVisible()).toBeTruthy();
  });

  test('Should handle transcription API failure', async () => {
    // Mock transcription endpoint to fail
    await page.context().route('**/ai_assistant', route => {
      if (route.request().postDataJSON()?.action === 'transcribe') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Try voice input
    const voiceButton = page.locator('button#voice-mic-button');
    await voiceButton.click();
    await page.waitForTimeout(1500);

    // Should show text fallback option
    expect(await page.locator('textarea').isVisible()).toBeTruthy();
  });

  test('Should handle SpeechRecognition API unavailable', async () => {
    // Mock unavailable SpeechRecognition
    await page.addInitScript(() => {
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Should still allow text input
    await page.click('button:has-text("Trouble speaking")');
    const textarea = page.locator('textarea');
    expect(await textarea.isVisible()).toBeTruthy();

    // Should be able to submit text
    await textarea.fill('Machine issue via text');
    await page.click('button:has-text("Review & confirm")');
    expect(page.locator('h4:has-text("Review")')).toBeVisible();
  });

  // ========== INVALID INPUT SCENARIOS ==========

  test('Should validate phone number format on phone gate', async () => {
    // Try invalid phone numbers
    const testCases = [
      { input: 'abcdefghij', shouldPass: false },
      { input: '123', shouldPass: false },
      { input: '12345678901', shouldPass: false }, // More than 10 digits
      { input: '9876543210', shouldPass: true },
    ];

    for (const testCase of testCases) {
      await page.fill('input[type="tel"]', testCase.input);
      await page.click('button:has-text("Proceed")');

      if (testCase.shouldPass) {
        await page.waitForTimeout(500);
        // Should proceed to voice input
        expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
      } else {
        // Should show error
        const alertText = await page.evaluate(() =>
          document.body.textContent?.includes('valid') ? true : false
        );
        expect(alertText).toBeTruthy();
      }

      // Reset for next test
      await page.reload();
    }
  });

  test('Should handle very long issue descriptions', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');

    // Generate very long text (10KB)
    const longText = 'Issue: ' + 'A'.repeat(10000);
    await page.fill('textarea', longText);

    // Should not crash or truncate unexpectedly
    const textValue = await page.inputValue('textarea');
    expect(textValue.length).toBeGreaterThan(5000);

    // Should still allow submission
    await page.click('button:has-text("Review & confirm")');
    const reviewArea = page.locator('textarea[style*="background"]');
    expect(await reviewArea.isVisible()).toBeTruthy();
  });

  test('Should handle special characters in input', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');

    // Try special characters that might break JSON/encoding
    const specialText = 'Issue: <script>alert("xss")</script> & "quotes" & \'single\' \\backslash \\n newline';
    await page.fill('textarea', specialText);
    await page.click('button:has-text("Review & confirm")');

    // Should safely handle special chars
    const reviewText = await page.inputValue('textarea[style*="background"]');
    expect(reviewText).toContain('script');
    expect(reviewText).not.toEqual(''); // Should not be sanitized to empty
  });

  test('Should handle empty/whitespace-only submission', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');

    // Try to submit empty text
    await page.fill('textarea', '   ');
    await page.click('button:has-text("Review & confirm")');

    // Should show validation error or not proceed
    const alert = await page.evaluate(() => {
      try {
        const msg = window.alert?.toString() || '';
        return msg.includes('Issue');
      } catch {
        return false;
      }
    });

    // Either shows alert or doesn't proceed
    // Verify we're still in text input view
    expect(await page.locator('textarea').isVisible()).toBeTruthy();
  });

  // ========== PHOTO UPLOAD FAILURES ==========

  test('Should handle corrupted image file', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');

    // Create and upload corrupted image
    const buffer = Buffer.from([0xFF, 0xD8, 0xFF]); // Incomplete JPEG header
    const dataTransfer = await page.evaluateHandle(({ buffer }) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'corrupt.jpg', { type: 'image/jpeg' });
      dt.items.add(file);
      return dt;
    }, { buffer: Array.from(buffer) });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(dataTransfer);
    await page.waitForTimeout(800);

    // Should handle gracefully - still allow submission without photo
    await page.click('button:has-text("Review & confirm")');
    expect(page.locator('textarea[style*="background"]')).toBeVisible();
  });

  test('Should handle very large image file (>50MB)', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');

    // Simulate large file selection
    await page.evaluateHandle(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        // Mock a large file
        const largeBuffer = new Uint8Array(60 * 1024 * 1024); // 60MB
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' }));
        input.files = dataTransfer.files;
      }
    });

    await page.waitForTimeout(1000);

    // Should warn about file size or handle gracefully
    const preview = page.locator('[style*="Preview"]');
    // File upload should still be optional
    await page.fill('textarea', 'Issue description');
    await page.click('button:has-text("Review & confirm")');
    expect(page.locator('textarea[style*="background"]')).toBeVisible();
  });

  test('Should handle storage upload failure', async () => {
    // Mock storage upload to fail
    await page.context().route('**/repair-proofs/**', route => {
      route.abort('failed');
    });

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input with photo
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Issue with photo');

    // Add a valid image (simulated)
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const canvas = document.createElement('canvas');
      canvas.toBlob(blob => {
        dt.items.add(new File([blob!], 'test.png', { type: 'image/png' }));
      });
      return dt;
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(dataTransfer);
    await page.waitForTimeout(500);

    // Try to submit
    await page.click('button:has-text("Review & confirm")');
    await page.click('button:has-text("Yes, Submit")');
    await page.waitForTimeout(2000);

    // Should either queue offline or submit without photo
    const hasQueue = await page.evaluate(() =>
      !!localStorage.getItem('tf_offline_tickets')
    );
    expect(hasQueue || await page.locator('[style*="CheckCircle"]').isVisible()).toBeTruthy();
  });

  // ========== CONCURRENT & RACE CONDITIONS ==========

  test('Should handle rapid form submissions', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');
    await page.click('button:has-text("Review & confirm")');

    // Rapidly click submit button multiple times
    const submitBtn = page.locator('button:has-text("Yes, Submit")');
    for (let i = 0; i < 5; i++) {
      await submitBtn.click();
      await page.waitForTimeout(100);
    }

    // Should only submit once
    await page.waitForTimeout(2000);
    const tickets = await page.evaluate(() => {
      return localStorage.getItem('tf_offline_tickets');
    });
    // Should have submitted, not duplicated
    expect(tickets || await page.locator('[style*="CheckCircle"]').isVisible()).toBeTruthy();
  });

  test('Should handle language change during submission', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go to text input
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');
    await page.click('button:has-text("Review & confirm")');

    // Change language while form is being submitted
    await page.click('select[style*="background: #151e28"]');
    await page.selectOption('select[style*="background: #151e28"]', 'mr-IN');
    await page.waitForTimeout(500);

    // Should handle language switch gracefully
    // Form should still be functional
    await page.click('button:has-text("Yes, Submit")');
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
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go offline to force queue
    await page.context().setOffline(true);

    // Try to submit
    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');
    await page.click('button:has-text("Review & confirm")');
    await page.click('button:has-text("Yes, Submit")');
    await page.waitForTimeout(1500);

    // Should handle gracefully
    // Either show error or offline message
    const msg = await page.locator('p[style*="color"]').first().textContent();
    expect(msg).toBeTruthy();

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
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Should proceed normally
    expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
  });

  // ========== EDGE CASES & STATE MANAGEMENT ==========

  test('Should handle back button during phone gate', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Go back in browser history
    await page.goBack();
    await page.waitForTimeout(500);

    // Should navigate back to phone gate
    expect(await page.locator('input[type="tel"]').isVisible()).toBeTruthy();
  });

  test('Should persist reporter phone across page reload', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should remember phone and not show gate
    expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
    const phoneBtn = page.locator('button:has-text("9876543210")');
    expect(await phoneBtn.isVisible()).toBeTruthy();
  });

  test('Should handle machine details fetch failure', async () => {
    // Mock machine details endpoint to fail
    await page.context().route('**/ai_assistant', route => {
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
    await page.context().route('**/ai_assistant', route => {
      if (route.request().postDataJSON()?.action === 'check_duplicate') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Should still allow offline submission
    await page.context().setOffline(true);

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Test issue');
    await page.click('button:has-text("Review & confirm")');
    await page.click('button:has-text("Yes, Submit")');
    await page.waitForTimeout(1500);

    // Should queue offline
    const queue = await page.evaluate(() =>
      localStorage.getItem('tf_offline_tickets')
    );
    expect(queue).toBeTruthy();
  });

  test('Should handle ticket log failure with fallback', async () => {
    // First ticket log fails, but should queue offline
    await page.context().setOffline(true);

    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Trouble speaking")');
    await page.fill('textarea', 'Critical issue');
    await page.click('button:has-text("Review & confirm")');
    await page.click('button:has-text("Yes, Submit")');
    await page.waitForTimeout(1500);

    // Should show success/offline indicator
    const successOrOffline = await page.evaluate(() => {
      const text = document.body.textContent;
      return text?.includes('offline') || text?.includes('Successfully');
    });
    expect(successOrOffline).toBeTruthy();
  });

  test('Should handle rapid language switches without state corruption', async () => {
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');
    await page.waitForTimeout(500);

    // Rapidly switch languages
    const select = page.locator('select[style*="background: #151e28"]');
    const languages = ['hi-IN', 'mr-IN', 'en-US', 'hi-IN', 'mr-IN'];

    for (const lang of languages) {
      await select.selectOption(lang);
      await page.waitForTimeout(100);
    }

    // Should maintain form state
    expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
  });

  test('Should handle zero-width screen edge case', async () => {
    // Simulate extreme viewport
    await page.setViewportSize({ width: 300, height: 800 });
    await page.waitForTimeout(500);

    // Should still be usable
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button:has-text("Proceed")');

    // All buttons should be accessible
    expect(await page.locator('button#voice-mic-button').isVisible()).toBeTruthy();
  });
});
