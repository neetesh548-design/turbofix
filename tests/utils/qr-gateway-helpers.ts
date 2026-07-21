import { Page, expect } from '@playwright/test';

/**
 * Helper utilities for QRGateway testing
 */

export class QRGatewayTestHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to QRGateway with machine parameters
   */
  async navigateToQRGateway(
    machineId: string = 'machine-001',
    machineName: string = 'CNC Lathe 1',
    location: string = 'Shop Floor A'
  ) {
    const params = new URLSearchParams({
      id: machineId,
      name: machineName,
      loc: location,
    });
    await this.page.goto(`/qr-gateway.html?${params.toString()}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Complete phone gate verification
   */
  async completePhoneGate(phone: string) {
    const phoneInput = this.page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();

    await phoneInput.fill(phone);
    const proceedBtn = this.page.locator('button:has-text("Proceed")');
    await proceedBtn.click();

    await this.page.waitForTimeout(500);
  }

  /**
   * Submit issue via voice (simulated)
   */
  async submitVoiceIssue(transcript: string, condition: string = 'running') {
    // Click voice button
    const voiceBtn = this.page.locator('button#voice-mic-button');
    await expect(voiceBtn).toBeVisible();
    await voiceBtn.click();

    // Wait for listening and listen-back confirmation
    await this.page.waitForTimeout(800);

    const sendBtn = this.page.getByRole('button', { name: /Send for transcription|transcription के लिए भेजें|ट्रांसक्रिप्शन के लिए भेजें/i });
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
      await this.page.waitForTimeout(500);
    }

    // If transcription is unavailable in the test context, use the typed fallback.
    await this.page.getByRole('button', { name: /Trouble speaking|बोलने में समस्या|लिखकर दर्ज करें/i }).click();
    await this.page.fill('textarea', transcript);

    // Select condition
    const conditionMap: Record<string, string> = {
      'running': 'Running with issue',
      'stopped': 'Stopped (Down)',
      'unsafe': 'Unsafe (Danger)',
      'not_sure': 'Not Sure',
    };

    const conditionBtn = this.page.locator(`button:has-text("${conditionMap[condition]}")`);
    if (await conditionBtn.isVisible()) {
      await conditionBtn.click();
    }
  }

  /**
   * Submit issue via text only
   */
  async submitTextIssue(text: string, condition: string = 'running') {
    // Go to text input
    await this.page.click('button:has-text("Trouble speaking")');
    await this.page.fill('textarea', text);

    // Select condition
    const conditionMap: Record<string, string> = {
      'running': 'Running with issue',
      'stopped': 'Stopped (Down)',
      'unsafe': 'Unsafe (Danger)',
      'not_sure': 'Not Sure',
    };

    const conditionBtn = this.page.locator(`button:has-text("${conditionMap[condition]}")`);
    if (await conditionBtn.isVisible()) {
      await conditionBtn.click();
    }
  }

  /**
   * Review and confirm submission
   */
  async reviewAndConfirm(editedText?: string) {
    const confirmBtn = this.page.locator('button:has-text("Review & confirm")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await this.page.waitForTimeout(500);

    if (editedText) {
      const textarea = this.page.locator('textarea[style*="background"]').first();
      await textarea.fill(editedText);
    }
  }

  /**
   * Complete form submission
   */
  async submitForm() {
    const submitBtn = this.page.locator('button:has-text("Yes, Submit")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if offline queue contains tickets
   */
  async getOfflineQueue(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const queue = localStorage.getItem('tf_offline_tickets');
      return queue ? JSON.parse(queue) : [];
    });
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue() {
    await this.page.evaluate(() => {
      localStorage.removeItem('tf_offline_tickets');
    });
  }

  /**
   * Get reporter phone from localStorage
   */
  async getReporterPhone(): Promise<string> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('tf_reporter_phone') || '';
    });
  }

  /**
   * Simulate offline mode
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Simulate online mode
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }

  /**
   * Switch language
   */
  async switchLanguage(lang: 'hi-IN' | 'mr-IN' | 'en-US') {
    const select = this.page.locator('select[style*="background: #151e28"]');
    await select.selectOption(lang);
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if error alert is visible
   */
  async hasErrorAlert(): Promise<boolean> {
    const errorAlert = this.page.locator('[style*="rgba(239,68,68,0.12)"]');
    return await errorAlert.isVisible().catch(() => false);
  }

  /**
   * Get error alert text
   */
  async getErrorMessage(): Promise<string> {
    const errorAlert = this.page.locator('[style*="rgba(239,68,68,0.12)"]');
    if (await errorAlert.isVisible()) {
      return await errorAlert.textContent() || '';
    }
    return '';
  }

  /**
   * Check if submission was successful
   */
  async isSubmissionSuccessful(): Promise<boolean> {
    const successIndicator = this.page.locator('[style*="CheckCircle"]');
    return await successIndicator.isVisible().catch(() => false);
  }

  /**
   * Get submitted ticket info
   */
  async getSubmittedTicketInfo(): Promise<Record<string, string>> {
    const workOrderElement = this.page.locator('[style*="monospace"]').first();
    const machineElement = this.page.locator('span:has-text("CNC Lathe")').first();

    const info: Record<string, string> = {};

    if (await workOrderElement.isVisible()) {
      info.workOrder = await workOrderElement.textContent() || '';
    }
    if (await machineElement.isVisible()) {
      info.machine = await machineElement.textContent() || '';
    }

    return info;
  }

  /**
   * Toggle voice feedback
   */
  async toggleVoiceFeedback(enable: boolean) {
    const feedbackBtn = this.page.locator('button[title="Toggle Voice Feedback"]');
    if (await feedbackBtn.isVisible()) {
      const isEnabled = await this.page.evaluate(() => {
        const btn = document.querySelector('button[title="Toggle Voice Feedback"]');
        const icon = btn?.querySelector('svg');
        return icon?.parentElement?.textContent?.includes('Volume2');
      });

      if (isEnabled !== enable) {
        await feedbackBtn.click();
      }
    }
  }

  /**
   * Attach photo file
   */
  async attachPhoto(fileName: string = 'test.png') {
    const fileInput = this.page.locator('input[type="file"]');

    // Create a simple test image
    const canvas = await this.page.evaluateHandle(() => {
      const c = document.createElement('canvas');
      c.width = 100;
      c.height = 100;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
      }
      return c;
    });

    // Set file
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47]), // PNG header
    });

    await this.page.waitForTimeout(500);
  }

  /**
   * Simulate offline sync and retry
   */
  async simulateOfflineSyncRetry() {
    // Queue a ticket offline
    const queue = await this.getOfflineQueue();
    expect(queue.length).toBeGreaterThan(0);

    // Go online
    await this.goOnline();

    // Trigger sync
    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Wait for sync attempt
    await this.page.waitForTimeout(2000);
  }

  /**
   * Get all active tickets from status view
   */
  async getActiveTickets(): Promise<any[]> {
    const statusBtn = this.page.locator('button:has-text("View Open Tickets")');
    await statusBtn.click();

    await this.page.waitForTimeout(500);

    return await this.page.evaluate(() => {
      const ticketElements = document.querySelectorAll('[style*="background: #151e28"]');
      const tickets: any[] = [];

      ticketElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('OPEN')) {
          tickets.push({
            date: text.split('OPEN')[0].trim(),
            issue: text.split('OPEN')[1].trim(),
          });
        }
      });

      return tickets;
    });
  }

  /**
   * Wait for success message
   */
  async waitForSuccess(timeout: number = 5000) {
    const successMsg = this.page.locator('[style*="CheckCircle"]');
    await expect(successMsg).toBeVisible({ timeout });
  }

  /**
   * Wait for error message
   */
  async waitForError(timeout: number = 5000) {
    const errorAlert = this.page.locator('[style*="rgba(239,68,68,0.12)"]');
    await expect(errorAlert).toBeVisible({ timeout });
  }

  /**
   * Simulate rapid network toggle
   */
  async simulateNetworkInstability(cycles: number = 3, delayMs: number = 500) {
    for (let i = 0; i < cycles; i++) {
      await this.goOffline();
      await this.page.waitForTimeout(delayMs);
      await this.goOnline();
      await this.page.waitForTimeout(delayMs);
    }
  }

  /**
   * Clear all form state and reset
   */
  async resetForm() {
    const resetBtn = this.page.locator('button:has-text("Report Another Issue")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await this.page.waitForTimeout(500);
    }
  }
}
