import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('src/lib/utils - cn utility function', () => {
  describe('Normal Cases', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
    });

    it('should resolve tailwind class conflicts correctly', () => {
      expect(cn('px-2 px-4', 'bg-red-500 bg-blue-500')).toBe('px-4 bg-blue-500');
    });
  });

  describe('Edge Cases & Null Safety', () => {
    it('should handle empty inputs without crashing', () => {
      expect(cn()).toBe('');
    });

    it('should handle null, undefined, and boolean falsy values', () => {
      expect(cn('btn', null, undefined, false, 'active')).toBe('btn active');
    });

    it('should handle conditional object syntax', () => {
      expect(cn('base', { 'is-active': true, 'is-hidden': false })).toBe('base is-active');
    });

    it('should handle array inputs', () => {
      expect(cn(['flex', 'items-center'], 'justify-between')).toBe('flex items-center justify-between');
    });
  });
});
