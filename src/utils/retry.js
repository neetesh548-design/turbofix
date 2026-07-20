export async function retryWithBackoff(
  fn,
  { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export class OfflineQueue {
  constructor(storageKey = 'offline-queue') {
    this.storageKey = storageKey;
    this.queue = this.loadQueue();
  }

  loadQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveQueue() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }

  add(request) {
    this.queue.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...request,
    });
    this.saveQueue();
    return request.id;
  }

  async flush(processor) {
    const failed = [];

    for (const request of this.queue) {
      try {
        await processor(request);
      } catch (error) {
        failed.push(request);
      }
    }

    this.queue = failed;
    this.saveQueue();
    return failed.length === 0;
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  getQueue() {
    return [...this.queue];
  }
}
