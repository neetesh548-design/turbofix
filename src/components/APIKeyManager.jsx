import { useState, useCallback } from 'react';
import { Copy, Eye, EyeOff, Trash2, Plus, CheckCircle } from 'lucide-react';

export function APIKeyManager() {
  const [keys, setKeys] = useState(() => {
    const saved = localStorage.getItem('api-keys');
    return saved ? JSON.parse(saved) : [];
  });
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState(null);

  const createKey = useCallback(() => {
    const newKey = {
      id: `key_${Date.now()}`,
      name: `API Key ${keys.length + 1}`,
      key: generateApiKey(),
      secret: generateSecret(),
      createdAt: new Date().toISOString(),
      lastUsed: null,
      permissions: ['read', 'write'],
      active: true,
      requestCount: 0
    };

    const updated = [...keys, newKey];
    setKeys(updated);
    localStorage.setItem('api-keys', JSON.stringify(updated));
    setShowNew(false);
    return newKey;
  }, [keys]);

  const deleteKey = useCallback((id) => {
    const updated = keys.filter(k => k.id !== id);
    setKeys(updated);
    localStorage.setItem('api-keys', JSON.stringify(updated));
  }, [keys]);

  const toggleKey = useCallback((id) => {
    const updated = keys.map(k =>
      k.id === id ? { ...k, active: !k.active } : k
    );
    setKeys(updated);
    localStorage.setItem('api-keys', JSON.stringify(updated));
  }, [keys]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="api-key-manager">
      <div className="manager-header">
        <h2>API Keys</h2>
        <button
          className="btn-primary"
          onClick={() => setShowNew(!showNew)}
        >
          <Plus size={16} />
          New Key
        </button>
      </div>

      {showNew && <NewKeyForm onClose={() => setShowNew(false)} onCreate={createKey} />}

      <div className="keys-list">
        {keys.length > 0 ? (
          keys.map(key => (
            <APIKeyItem
              key={key.id}
              keyData={key}
              onDelete={() => deleteKey(key.id)}
              onToggle={() => toggleKey(key.id)}
              onCopy={(text) => copyToClipboard(text, key.id)}
              isCopied={copied === key.id}
            />
          ))
        ) : (
          <div className="keys-empty">
            <p>No API keys yet</p>
            <small>Create your first API key to start building</small>
          </div>
        )}
      </div>
    </div>
  );
}

function APIKeyItem({ keyData, onDelete, onToggle, onCopy, isCopied }) {
  const [showSecret, setShowSecret] = useState(false);

  const displayKey = keyData.key.substring(0, 8) + '•'.repeat(32);
  const displaySecret = showSecret ? keyData.secret : '•'.repeat(40);

  return (
    <div className={`key-item ${keyData.active ? 'active' : 'inactive'}`}>
      <div className="key-info">
        <div className="key-header">
          <h4>{keyData.name}</h4>
          <span className={`status-badge ${keyData.active ? 'active' : 'inactive'}`}>
            {keyData.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="key-details">
          <div className="detail-row">
            <span className="detail-label">Key:</span>
            <div className="detail-value-row">
              <code>{displayKey}</code>
              <button
                className="copy-btn"
                onClick={() => onCopy(keyData.key)}
                title="Copy key"
              >
                {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">Secret:</span>
            <div className="detail-value-row">
              <code>{displaySecret}</code>
              <button
                className="toggle-btn"
                onClick={() => setShowSecret(!showSecret)}
                title="Show/hide secret"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                className="copy-btn"
                onClick={() => onCopy(keyData.secret)}
                title="Copy secret"
              >
                {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">Created:</span>
            <span>{new Date(keyData.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Usage:</span>
            <span>{keyData.requestCount} requests</span>
          </div>
        </div>
      </div>

      <div className="key-actions">
        <button
          className="action-btn toggle"
          onClick={onToggle}
          title={keyData.active ? 'Disable key' : 'Enable key'}
        >
          {keyData.active ? 'Disable' : 'Enable'}
        </button>
        <button
          className="action-btn delete"
          onClick={onDelete}
          title="Delete key"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function NewKeyForm({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState(['read', 'write']);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate({ name, permissions });
      setName('');
    }
  };

  return (
    <div className="new-key-form">
      <h3>Create New API Key</h3>

      <div className="form-group">
        <label>Key Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Production Integration"
        />
      </div>

      <div className="form-group">
        <label>Permissions</label>
        <div className="permission-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={permissions.includes('read')}
              onChange={(e) => {
                if (e.target.checked) {
                  setPermissions([...permissions, 'read']);
                } else {
                  setPermissions(permissions.filter(p => p !== 'read'));
                }
              }}
            />
            Read (GET requests)
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.includes('write')}
              onChange={(e) => {
                if (e.target.checked) {
                  setPermissions([...permissions, 'write']);
                } else {
                  setPermissions(permissions.filter(p => p !== 'write'));
                }
              }}
            />
            Write (POST, PUT, DELETE)
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.includes('admin')}
              onChange={(e) => {
                if (e.target.checked) {
                  setPermissions([...permissions, 'admin']);
                } else {
                  setPermissions(permissions.filter(p => p !== 'admin'));
                }
              }}
            />
            Admin (All operations)
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          Create Key
        </button>
      </div>
    </div>
  );
}

function generateApiKey() {
  return `key_${Date.now()}_${Math.random().toString(36).substr(2, 24)}`;
}

function generateSecret() {
  return `secret_${Math.random().toString(36).substr(2, 32)}`;
}
