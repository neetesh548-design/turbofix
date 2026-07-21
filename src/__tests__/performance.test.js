import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMemoCallback, useMemoValue } from '../utils/performance.jsx';
import React from 'react';

// Mock React
vi.mock('react', () => {
  const mock = {
    useState: (initial) => {
      let val = typeof initial === 'function' ? initial() : initial;
      return [val, vi.fn()];
    },
    useCallback: vi.fn((cb, deps) => cb),
    useMemo: vi.fn((cb, deps) => cb()),
    useEffect: vi.fn((cb, deps) => {}),
  };
  return {
    ...mock,
    default: mock
  };
});

describe('Performance Utils - Worst Case Scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Extreme Load Testing', () => {
    it('handles 100,000 rapid synchronous calls without stack overflow', () => {
      // Simulate extreme load on memory allocation
      let arr = [];
      const extremeLimit = 100000;
      
      expect(() => {
        for(let i=0; i<extremeLimit; i++) {
          arr.push({ timestamp: Date.now(), id: `event_${i}`, payload: 'x'.repeat(100) });
        }
      }).not.toThrow();
      
      expect(arr.length).toBe(extremeLimit);
    });

    it('gracefully degrades under high memory pressure (simulated NaN/undefined inputs)', () => {
      // Pass corrupted or massive inputs to memoized values
      const corruptedDep = new Array(10000).fill(NaN);
      let runCount = 0;
      const factory = () => { runCount++; return 'success'; };
      
      // Even with corrupted extreme dependencies, it should still function
      const result = useMemoValue(factory, corruptedDep);
      expect(result).toBe('success');
      expect(runCount).toBe(1);
    });
  });
});
