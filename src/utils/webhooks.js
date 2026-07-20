import crypto from 'crypto';

export class WebhookManager {
  constructor() {
    this.webhooks = this.loadWebhooks();
    this.eventQueue = [];
  }

  loadWebhooks() {
    const saved = localStorage.getItem('webhooks');
    return saved ? JSON.parse(saved) : [];
  }

  saveWebhooks() {
    localStorage.setItem('webhooks', JSON.stringify(this.webhooks));
  }

  registerWebhook(config) {
    const webhook = {
      id: this.generateId(),
      url: config.url,
      events: config.events,
      secret: config.secret || this.generateSecret(),
      active: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      failureCount: 0,
      successCount: 0
    };

    this.webhooks.push(webhook);
    this.saveWebhooks();
    return webhook;
  }

  unregisterWebhook(id) {
    this.webhooks = this.webhooks.filter(w => w.id !== id);
    this.saveWebhooks();
  }

  async triggerEvent(event, data) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      id: this.generateId()
    };

    const matchingWebhooks = this.webhooks.filter(w =>
      w.active && w.events.includes(event)
    );

    for (const webhook of matchingWebhooks) {
      await this.deliverWebhook(webhook, payload);
    }
  }

  async deliverWebhook(webhook, payload) {
    const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Timestamp': payload.timestamp
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        webhook.successCount++;
        webhook.lastTriggered = new Date().toISOString();
        webhook.failureCount = 0;
      } else {
        webhook.failureCount++;
      }
    } catch (error) {
      webhook.failureCount++;
      console.error(`Webhook delivery failed for ${webhook.id}:`, error);
    }

    this.saveWebhooks();
  }

  generateSignature(payload, secret) {
    // Note: In production, use crypto.subtle.sign() or a backend service
    return `sha256_${Buffer.from(payload).toString('base64').slice(0, 32)}`;
  }

  generateSecret() {
    return `whsec_${Math.random().toString(36).substr(2, 24)}`;
  }

  generateId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getWebhooks() {
    return [...this.webhooks];
  }

  getWebhookDetails(id) {
    return this.webhooks.find(w => w.id === id);
  }

  updateWebhook(id, updates) {
    const webhook = this.webhooks.find(w => w.id === id);
    if (webhook) {
      Object.assign(webhook, updates);
      this.saveWebhooks();
    }
    return webhook;
  }

  testWebhook(id) {
    const webhook = this.webhooks.find(w => w.id === id);
    if (!webhook) return false;

    const testPayload = {
      event: 'test.event',
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook payload' },
      id: this.generateId()
    };

    return this.deliverWebhook(webhook, testPayload);
  }

  getWebhookStats(id) {
    const webhook = this.webhooks.find(w => w.id === id);
    if (!webhook) return null;

    return {
      id: webhook.id,
      url: webhook.url,
      active: webhook.active,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      successRate: webhook.successCount + webhook.failureCount > 0
        ? ((webhook.successCount / (webhook.successCount + webhook.failureCount)) * 100).toFixed(2)
        : 'N/A',
      lastTriggered: webhook.lastTriggered,
      createdAt: webhook.createdAt
    };
  }
}

export const webhookManager = new WebhookManager();
