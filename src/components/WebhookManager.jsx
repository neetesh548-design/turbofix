import { useState, useCallback } from 'react';
import { Plus, Trash2, Play, Settings, Copy, CheckCircle } from 'lucide-react';
import { webhookManager } from '../utils/webhooks';

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState(() => webhookManager.getWebhooks());
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState(null);

  const addWebhook = useCallback((config) => {
    const webhook = webhookManager.registerWebhook(config);
    setWebhooks(webhookManager.getWebhooks());
    setShowNew(false);
    return webhook;
  }, []);

  const deleteWebhook = useCallback((id) => {
    webhookManager.unregisterWebhook(id);
    setWebhooks(webhookManager.getWebhooks());
  }, []);

  const testWebhook = useCallback((id) => {
    webhookManager.testWebhook(id);
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="webhook-manager">
      <div className="manager-header">
        <h2>Webhooks</h2>
        <button
          className="btn-primary"
          onClick={() => setShowNew(!showNew)}
        >
          <Plus size={16} />
          New Webhook
        </button>
      </div>

      {showNew && (
        <NewWebhookForm
          onClose={() => setShowNew(false)}
          onCreate={addWebhook}
        />
      )}

      <div className="webhooks-list">
        {webhooks.length > 0 ? (
          webhooks.map(webhook => (
            <WebhookItem
              key={webhook.id}
              webhook={webhook}
              onDelete={() => deleteWebhook(webhook.id)}
              onTest={() => testWebhook(webhook.id)}
              onCopy={(text) => copyToClipboard(text, webhook.id)}
              isCopied={copied === webhook.id}
            />
          ))
        ) : (
          <div className="webhooks-empty">
            <p>No webhooks configured</p>
            <small>Create a webhook to receive real-time event notifications</small>
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookItem({ webhook, onDelete, onTest, onCopy, isCopied }) {
  const [showDetails, setShowDetails] = useState(false);
  const stats = webhookManager.getWebhookStats(webhook.id);

  return (
    <div className={`webhook-item ${webhook.active ? 'active' : 'inactive'}`}>
      <div className="webhook-header">
        <div className="webhook-info">
          <h4>{webhook.url}</h4>
          <span className={`status-badge ${webhook.active ? 'active' : 'inactive'}`}>
            {webhook.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="webhook-actions">
          <button
            className="icon-btn"
            onClick={() => setShowDetails(!showDetails)}
            title="Show details"
          >
            <Settings size={18} />
          </button>
          <button
            className="icon-btn test"
            onClick={onTest}
            title="Test webhook"
          >
            <Play size={18} />
          </button>
          <button
            className="icon-btn delete"
            onClick={onDelete}
            title="Delete webhook"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="webhook-meta">
        <span className="meta-item">
          <strong>Events:</strong> {webhook.events.join(', ')}
        </span>
        <span className="meta-item">
          <strong>Created:</strong> {new Date(webhook.createdAt).toLocaleDateString()}
        </span>
        {stats && (
          <>
            <span className="meta-item">
              <strong>Success Rate:</strong> {stats.successRate}%
            </span>
            <span className="meta-item">
              <strong>Requests:</strong> {stats.successCount + stats.failureCount}
            </span>
          </>
        )}
      </div>

      {showDetails && (
        <div className="webhook-details">
          <div className="detail-section">
            <h5>Endpoint</h5>
            <div className="code-block">
              <code>{webhook.url}</code>
              <button
                className="copy-btn"
                onClick={() => onCopy(webhook.url)}
              >
                {isCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h5>Secret</h5>
            <div className="code-block">
              <code>{webhook.secret}</code>
              <button
                className="copy-btn"
                onClick={() => onCopy(webhook.secret)}
              >
                {isCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h5>Subscribed Events</h5>
            <div className="event-list">
              {webhook.events.map(event => (
                <span key={event} className="event-tag">
                  {event}
                </span>
              ))}
            </div>
          </div>

          {stats && (
            <div className="detail-section">
              <h5>Statistics</h5>
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-label">Success</span>
                  <span className="stat-value success">{stats.successCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Failures</span>
                  <span className="stat-value error">{stats.failureCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Success Rate</span>
                  <span className="stat-value">{stats.successRate}%</span>
                </div>
                {stats.lastTriggered && (
                  <div className="stat">
                    <span className="stat-label">Last Triggered</span>
                    <span className="stat-value">
                      {new Date(stats.lastTriggered).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewWebhookForm({ onClose, onCreate }) {
  const [form, setForm] = useState({
    url: '',
    events: ['machine.created', 'ticket.created'],
    secret: ''
  });

  const handleSubmit = () => {
    if (form.url.trim() && form.events.length > 0) {
      onCreate(form);
      setForm({ url: '', events: [], secret: '' });
    }
  };

  const AVAILABLE_EVENTS = [
    'machine.created',
    'machine.updated',
    'machine.deleted',
    'ticket.created',
    'ticket.completed',
    'alert.triggered',
    'maintenance.scheduled'
  ];

  return (
    <div className="new-webhook-form">
      <h3>Create New Webhook</h3>

      <div className="form-group">
        <label>Webhook URL</label>
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://your-domain.com/webhook"
        />
      </div>

      <div className="form-group">
        <label>Events to Subscribe</label>
        <div className="event-checkboxes">
          {AVAILABLE_EVENTS.map(event => (
            <label key={event}>
              <input
                type="checkbox"
                checked={form.events.includes(event)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setForm({ ...form, events: [...form.events, event] });
                  } else {
                    setForm({
                      ...form,
                      events: form.events.filter(e => e !== event)
                    });
                  }
                }}
              />
              {event}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Secret (Optional)</label>
        <input
          type="text"
          value={form.secret}
          onChange={(e) => setForm({ ...form, secret: e.target.value })}
          placeholder="HMAC secret for validation"
        />
      </div>

      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!form.url.trim() || form.events.length === 0}
        >
          Create Webhook
        </button>
      </div>
    </div>
  );
}
