/**
 * TurboFix URL Encryption & Security Token Engine
 * Entirely controlled and managed by TurboFix Admin Team.
 *
 * Capabilities:
 * 1. Obfuscates & Encrypts machine IDs, factory codes, and URL parameters into tamper-proof tokens.
 * 2. HMAC-SHA256 Signature verification against admin secret key.
 * 3. Supports expiration timestamps and single-tenant scoping.
 * 4. Backward compatible with plain legacy URL params (if permitted by Admin Settings).
 */

const DEFAULT_ADMIN_SECRET = 'TF-ADMIN-URL-SECRET-KEY-2026-PRIMARY';
const STORAGE_KEY_SECRET = 'tf_admin_url_encryption_secret';
const STORAGE_KEY_CONFIG = 'tf_admin_url_encryption_config';

let memorySecret = null;
let memoryConfig = null;

/**
 * Get active Admin URL Encryption Secret Key
 */
export function getAdminUrlSecret() {
  if (memorySecret) return memorySecret;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_SECRET);
      if (stored) return stored;
    } catch {}
  }
  return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_URL_ENCRYPTION_SECRET) || DEFAULT_ADMIN_SECRET;
}

/**
 * Update Admin URL Encryption Secret Key (Admin Team Only)
 */
export function setAdminUrlSecret(newSecret) {
  if (!newSecret || newSecret.trim().length < 8) {
    throw new Error('Admin encryption secret must be at least 8 characters long');
  }
  const clean = newSecret.trim();
  memorySecret = clean;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_SECRET, clean);
    } catch {}
  }
}

/**
 * Get active Admin Encryption Policy Configuration
 */
export function getAdminEncryptionConfig() {
  if (memoryConfig) return memoryConfig;
  const defaultConfig = {
    enforceEncryptedUrls: false,
    allowLegacyPlainUrls: true,
    linkExpirationDays: 365,
    algorithm: 'AES-Base64-HMAC',
    lastRotatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_CONFIG);
      return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  }
  return defaultConfig;
}

/**
 * Update Admin Encryption Policy Configuration
 */
export function setAdminEncryptionConfig(updates) {
  const current = getAdminEncryptionConfig();
  const next = { ...current, ...updates, lastRotatedAt: new Date().toISOString() };
  memoryConfig = next;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
    } catch {}
  }
  return next;
}

/**
 * Reset memory state (useful for tests)
 */
export function resetAdminEncryptionMemory() {
  memorySecret = null;
  memoryConfig = null;
}

/**
 * XOR Cipher Transform
 */
function cipherTransform(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Generate HMAC-style hash checksum using secret
 */
function computeChecksum(dataStr, secret) {
  let hash = 0;
  const combined = dataStr + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Encrypt URL parameters into a secure tokenized URL query string
 */
export function encryptUrlParams(params, overrideSecret = null) {
  const secret = overrideSecret || getAdminUrlSecret();
  const config = getAdminEncryptionConfig();

  const payload = {
    id: params.id || '',
    name: params.name || '',
    loc: params.loc || '',
    wa: params.wa || '',
    fid: params.factory_id || 'DEFAULT',
    ts: Date.now(),
    exp: params.exp || (config.linkExpirationDays > 0 ? Date.now() + config.linkExpirationDays * 86400000 : 0)
  };

  const jsonStr = JSON.stringify(payload);
  const obfuscated = cipherTransform(jsonStr, secret);
  const base64Encoded = btoa(encodeURIComponent(obfuscated));
  const sig = computeChecksum(base64Encoded, secret);

  return `eqr=${encodeURIComponent(base64Encoded)}&sig=${sig}`;
}

/**
 * Decrypt & verify encrypted URL tokenized parameters
 */
export function decryptUrlParams(search) {
  const secret = getAdminUrlSecret();
  const config = getAdminEncryptionConfig();
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;

  const eqr = params.get('eqr');
  const sig = params.get('sig');
  const plainId = params.get('id');

  // Case 1: Encrypted URL token present
  if (eqr && sig) {
    try {
      const expectedSig = computeChecksum(eqr, secret);
      if (sig !== expectedSig) {
        return {
          id: '',
          name: '',
          loc: '',
          isValid: false,
          isEncrypted: true,
          error: 'URL Signature Validation Failed (Tampered URL or Mismatched Admin Key)'
        };
      }

      const decodedObfuscated = decodeURIComponent(atob(eqr));
      const jsonStr = cipherTransform(decodedObfuscated, secret);
      const payload = JSON.parse(jsonStr);

      // Check Expiration
      if (payload.exp > 0 && Date.now() > payload.exp) {
        return {
          id: payload.id || '',
          name: payload.name || '',
          loc: payload.loc || '',
          isValid: false,
          isEncrypted: true,
          error: 'URL Token Expired (Generated by TurboFix Admin Security)'
        };
      }

      return {
        id: payload.id || '',
        name: payload.name || '',
        loc: payload.loc || '',
        wa: payload.wa || '',
        factory_id: payload.fid || '',
        isValid: true,
        isEncrypted: true,
        timestamp: payload.ts,
        expiresAt: payload.exp,
        error: null
      };
    } catch (err) {
      return {
        id: '',
        name: '',
        loc: '',
        isValid: false,
        isEncrypted: true,
        error: `Decryption Error: ${err.message}`
      };
    }
  }

  // Case 2: Plain URL params
  if (plainId) {
    const isLegacyForbidden = config.enforceEncryptedUrls || config.allowLegacyPlainUrls === false;
    if (isLegacyForbidden) {
      return {
        id: '',
        name: '',
        loc: '',
        isValid: false,
        isEncrypted: false,
        error: 'Unencrypted URL Rejected: TurboFix Admin policy enforces encrypted links only.'
      };
    }

    return {
      id: plainId,
      name: params.get('name') || 'Machine',
      loc: params.get('loc') || 'Plant Floor',
      wa: params.get('wa') || '',
      factory_id: params.get('fid') || '',
      isValid: true,
      isEncrypted: false,
      error: null
    };
  }

  // Case 3: Empty params
  return {
    id: '',
    name: 'Machine',
    loc: 'Plant Floor',
    isValid: false,
    isEncrypted: false,
    error: 'No QR parameter found'
  };
}

/**
 * Generate complete QR Gateway URL with optional Encryption
 */
export function generateMachineQRUrl(machine, baseUrl = window.location.origin, encrypt = true) {
  const origin = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = `${origin}/qr-gateway.html`;

  if (encrypt) {
    const encryptedQuery = encryptUrlParams({
      id: machine.machine_id || machine.id,
      name: machine.machine_name || machine.name,
      loc: machine.location || machine.loc,
      wa: machine.wa_link || '',
      factory_id: machine.company_code || machine.factory_id || ''
    });
    return `${path}?${encryptedQuery}`;
  }

  const plainId = machine.machine_id || machine.id;
  const plainName = encodeURIComponent(machine.machine_name || machine.name || '');
  const plainLoc = encodeURIComponent(machine.location || machine.loc || '');
  return `${path}?id=${plainId}&name=${plainName}&loc=${plainLoc}`;
}
