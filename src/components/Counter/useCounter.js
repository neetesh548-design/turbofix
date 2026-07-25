import { useState, useCallback } from 'react';

/**
 * Custom hook for managing counter state
 * @param {number} initialValue - Initial counter value (default: 0)
 * @param {object} options - Configuration options
 * @param {number} options.min - Minimum counter value (default: undefined)
 * @param {number} options.max - Maximum counter value (default: undefined)
 * @param {number} options.step - Step for increment/decrement (default: 1)
 * @returns {object} Counter state and methods
 */
export function useCounter(initialValue = 0, options = {}) {
  const { min, max, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  /**
   * Increment counter by step amount
   * Respects max boundary if set
   */
  const increment = useCallback(() => {
    setCount((prevCount) => {
      const nextCount = prevCount + step;
      return max !== undefined ? Math.min(nextCount, max) : nextCount;
    });
  }, [step, max]);

  /**
   * Decrement counter by step amount
   * Respects min boundary if set
   */
  const decrement = useCallback(() => {
    setCount((prevCount) => {
      const nextCount = prevCount - step;
      return min !== undefined ? Math.max(nextCount, min) : nextCount;
    });
  }, [step, min]);

  /**
   * Reset counter to initial value
   */
  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  /**
   * Set counter to specific value
   * Respects min/max boundaries if set
   */
  const setValue = useCallback((value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return;
    }

    let newValue = value;
    if (min !== undefined) newValue = Math.max(newValue, min);
    if (max !== undefined) newValue = Math.min(newValue, max);

    setCount(newValue);
  }, [min, max]);

  /**
   * Check if counter is at minimum
   */
  const isAtMin = min !== undefined && count === min;

  /**
   * Check if counter is at maximum
   */
  const isAtMax = max !== undefined && count === max;

  return {
    count,
    increment,
    decrement,
    reset,
    setValue,
    isAtMin,
    isAtMax,
  };
}
