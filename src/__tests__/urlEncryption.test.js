import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptUrlParams,
  decryptUrlParams,
  getAdminUrlSecret,
  setAdminUrlSecret,
  getAdminEncryptionConfig,
  setAdminEncryptionConfig,
  resetAdminEncryptionMemory,
  generateMachineQRUrl
} from '../utils/urlEncryption';

describe('TurboFix Admin URL Encryption Engine', () => {
  beforeEach(() => {
    resetAdminEncryptionMemory();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('should encrypt and decrypt machine parameters correctly', () => {
    const params = {
      id: 'MCH-PRE-102',
      name: 'Hydraulic Press 500T',
      loc: 'Shop Floor - Bay A',
      factory_id: 'APEX_PRECISION_01'
    };

    const queryStr = encryptUrlParams(params);
    expect(queryStr).toContain('eqr=');
    expect(queryStr).toContain('&sig=');

    const result = decryptUrlParams(`?${queryStr}`);
    expect(result.isValid).toBe(true);
    expect(result.isEncrypted).toBe(true);
    expect(result.id).toBe('MCH-PRE-102');
    expect(result.name).toBe('Hydraulic Press 500T');
    expect(result.loc).toBe('Shop Floor - Bay A');
    expect(result.error).toBeNull();
  });

  it('should reject tampered URL signatures', () => {
    const params = { id: 'MCH-102', name: 'Laser Cutter' };
    const queryStr = encryptUrlParams(params);

    // Tamper with signature
    const tamperedQuery = queryStr.replace(/sig=[^&]+/, 'sig=TAMPEREDSIG123');
    const result = decryptUrlParams(`?${tamperedQuery}`);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('URL Signature Validation Failed');
  });

  it('should handle admin secret key rotation', () => {
    const newAdminSecret = 'NEW-TURBOFIX-ADMIN-MASTER-KEY-2026';
    setAdminUrlSecret(newAdminSecret);
    expect(getAdminUrlSecret()).toBe(newAdminSecret);

    // Encrypt with new key
    const queryStr = encryptUrlParams({ id: 'MCH-ROTATED' });
    const result = decryptUrlParams(`?${queryStr}`);
    expect(result.isValid).toBe(true);
    expect(result.id).toBe('MCH-ROTATED');
  });

  it('should enforce encrypted links if admin config disables legacy plain URLs', () => {
    setAdminEncryptionConfig({ enforceEncryptedUrls: true, allowLegacyPlainUrls: false });

    // Plain URL attempt
    const plainResult = decryptUrlParams('?id=MCH-PLAIN&name=Unencrypted');
    expect(plainResult.isValid).toBe(false);
    expect(plainResult.error).toContain('Unencrypted URL Rejected');
  });

  it('should generate complete encrypted QR Gateway URLs', () => {
    const machine = {
      machine_id: 'MCH-CNC-99',
      machine_name: 'VMC CNC Milling Machine',
      location: 'Tool Room - Deck 2'
    };

    const qrUrl = generateMachineQRUrl(machine, 'https://turbofix.co.in', true);
    expect(qrUrl).toContain('https://turbofix.co.in/qr-gateway.html?eqr=');
    expect(qrUrl).toContain('&sig=');
  });
});
