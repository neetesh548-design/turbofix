import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from '../utils/retry.js';

describe('Retry Utility - Worst Case Scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('handles 100% network failure rate gracefully without crashing the main thread', async () => {
    // Create an operation that ALWAYS fails
    let attempts = 0;
    const failingOperation = async () => {
      attempts++;
      throw new Error('Network offline');
    };

    // Run with 50 retries (extreme limit)
    let caughtError;
    const retryPromise = retryWithBackoff(failingOperation, { maxRetries: 50, initialDelay: 10 }).catch(e => caughtError = e);
    
    // Fast-forward time to simulate the entire exponential backoff cycle
    for (let i = 0; i < 50; i++) {
      await vi.runAllTimersAsync();
    }
    
    await retryPromise;
    expect(caughtError.message).toBe('Network offline');
    expect(attempts).toBe(51); // 1 initial + 50 retries
  });

  it('recovers successfully on the very last extreme attempt (edge case)', async () => {
    let attempts = 0;
    const flakeyOperation = async () => {
      attempts++;
      if (attempts < 5) throw new Error('Still failing...');
      return 'finally success';
    };

    const promise = retryWithBackoff(flakeyOperation, { maxRetries: 5, initialDelay: 10 });
    
    for (let i = 0; i < 5; i++) {
      await vi.runAllTimersAsync();
    }
    
    const result = await promise;
    expect(result).toBe('finally success');
    expect(attempts).toBe(5);
  });
});
