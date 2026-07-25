import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiBase, apiFetch } from '../lib/api';

describe('src/lib/api', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApiBase', () => {
    it('should return configured default API base URL', () => {
      const url = getApiBase();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe('apiFetch', () => {
    it('should inject Authorization header when tf_token is present in localStorage', async () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation((key) => key === 'tf_token' ? 'test-token-123' : null);

      const mockResponse = { status: 200, json: async () => ({ success: true }) };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const res = await apiFetch('/api/v1/test');
      expect(res).toBe(mockResponse);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
      getItemSpy.mockRestore();
    });

    it('should not inject Authorization header when tf_token is missing', async () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
      const mockResponse = { status: 200, json: async () => ({ success: true }) };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await apiFetch('/api/v1/test');

      const calledHeaders = global.fetch.mock.calls[0][1].headers;
      expect(calledHeaders['Authorization']).toBeUndefined();
      getItemSpy.mockRestore();
    });

    it('should handle 401 Unauthorized by clearing storage and dispatching authChanged event', async () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation((key) => key === 'tf_token' ? 'expired-token' : 'user-data');
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem');

      const mock401Response = { status: 401 };
      global.fetch = vi.fn().mockResolvedValue(mock401Response);

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      // Mock window.location
      delete window.location;
      window.location = { href: '' };

      await expect(apiFetch('/api/v1/protected')).rejects.toThrow('Session expired');

      expect(removeItemSpy).toHaveBeenCalledWith('tf_token');
      expect(removeItemSpy).toHaveBeenCalledWith('tf_user');
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
      getItemSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });
});
