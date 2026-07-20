// Advanced performance monitoring and optimization utilities

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.traces = [];
    this.threshold = 3000; // 3 second threshold for slow operations
    this.enabled = true;
  }

  // Mark the start of a trace
  markStart(name) {
    if (!this.enabled) return;
    performance.mark(`${name}-start`);
  }

  // Mark the end of a trace and record metrics
  markEnd(name) {
    if (!this.enabled) return;
    performance.mark(`${name}-end`);

    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name)[0];

      if (measure) {
        this.recordMetric(name, measure.duration);

        if (measure.duration > this.threshold) {
          console.warn(`Slow operation detected: ${name} took ${measure.duration.toFixed(2)}ms`);
        }
      }
    } catch (err) {
      console.error('Performance measurement error:', err);
    }
  }

  recordMetric(name, duration) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { count: 0, total: 0, min: Infinity, max: 0 });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
  }

  getMetrics(name) {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    return {
      name,
      count: metric.count,
      total: metric.total.toFixed(2),
      average: (metric.total / metric.count).toFixed(2),
      min: metric.min.toFixed(2),
      max: metric.max.toFixed(2)
    };
  }

  getAllMetrics() {
    const results = [];
    this.metrics.forEach((_, name) => {
      results.push(this.getMetrics(name));
    });
    return results;
  }

  // Monitor component render times
  measureRender(componentName, renderFn) {
    this.markStart(`render-${componentName}`);
    const result = renderFn();
    this.markEnd(`render-${componentName}`);
    return result;
  }

  // Measure async operation
  async measureAsync(name, asyncFn) {
    this.markStart(name);
    try {
      const result = await asyncFn();
      this.markEnd(name);
      return result;
    } catch (err) {
      this.markEnd(name);
      throw err;
    }
  }

  // Get memory usage (if available)
  getMemoryUsage() {
    if (!performance.memory) return null;

    return {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
    };
  }

  // Clear old measurements
  clearOldMeasures(olderThanMs = 300000) {
    const now = performance.now();
    performance.getEntriesByType('measure').forEach((entry) => {
      if (now - entry.startTime > olderThanMs) {
        performance.clearMeasures(entry.name);
      }
    });
  }

  reset() {
    this.metrics.clear();
    this.traces = [];
    performance.clearMarks();
    performance.clearMeasures();
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }
}

export const perfMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformance(componentName) {
  React.useEffect(() => {
    perfMonitor.markStart(`mount-${componentName}`);

    return () => {
      perfMonitor.markEnd(`mount-${componentName}`);
    };
  }, [componentName]);

  return perfMonitor;
}

// localStorage cleanup and optimization
class StorageManager {
  constructor(maxSize = 5242880) { // 5MB default
    this.maxSize = maxSize;
  }

  set(key, value, ttl = null) {
    const data = {
      value,
      timestamp: Date.now(),
      ttl
    };

    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      this.checkAndCleanup();
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryErr) {
          console.error('Storage full even after cleanup:', retryErr);
        }
      }
    }
  }

  get(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (!data) return null;

      // Check TTL
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (err) {
      return null;
    }
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    const toDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const data = JSON.parse(localStorage.getItem(key));

        // Remove expired entries
        if (data.ttl && now - data.timestamp > data.ttl) {
          toDelete.push(key);
        }
      } catch {
        // Skip malformed entries
      }
    }

    toDelete.forEach((key) => localStorage.removeItem(key));

    return toDelete.length;
  }

  // Cleanup old entries if size exceeds threshold
  checkAndCleanup() {
    const totalSize = Object.keys(localStorage).reduce((sum, key) => {
      return sum + localStorage.getItem(key).length;
    }, 0);

    if (totalSize > this.maxSize) {
      // Remove oldest timestamp entries first
      const entries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          const data = JSON.parse(localStorage.getItem(key));
          entries.push({ key, timestamp: data.timestamp || 0 });
        } catch {
          // Skip malformed
        }
      }

      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove 20% of oldest entries
      const toRemove = Math.ceil(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(entries[i].key);
      }
    }
  }

  getSize() {
    return Object.keys(localStorage).reduce((sum, key) => {
      return sum + localStorage.getItem(key).length;
    }, 0);
  }

  clear() {
    localStorage.clear();
  }
}

export const storageManager = new StorageManager();

// Lazy loading utilities
export const lazyLoadComponent = (importFn, fallback = null) => {
  return React.lazy(() =>
    importFn().catch((err) => {
      console.error('Failed to load component:', err);
      return { default: fallback || (() => <div>Failed to load component</div>) };
    })
  );
};

// Memoization helper for expensive computations
export function useMemoCallback(callback, dependencies = []) {
  return React.useCallback(callback, dependencies);
}

export function useMemoValue(factory, dependencies = []) {
  return React.useMemo(factory, dependencies);
}

// Debounce hook
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook
export function useThrottle(value, interval = 500) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRanRef = React.useRef(Date.now());

  React.useEffect(() => {
    const now = Date.now();
    if (now >= lastRanRef.current + interval) {
      lastRanRef.current = now;
      setThrottledValue(value);
    } else {
      const timeout = setTimeout(() => {
        lastRanRef.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(timeout);
    }
  }, [value, interval]);

  return throttledValue;
}

// Intersection Observer for lazy loading elements
export function useIntersectionObserver(ref, options = {}) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, options]);

  return isVisible;
}

// Image optimization
export function optimizeImage(url, width = 800, quality = 80) {
  if (!url) return url;

  // For local images, return as is (optimize via build process)
  if (!url.startsWith('http')) return url;

  // Example: add query params for CDN image optimization
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&q=${quality}`;
}

// Batch updates for better performance
export function useBatchedUpdates() {
  const [queue, setQueue] = React.useState([]);

  const batch = React.useCallback((updates) => {
    setQueue((prev) => [...prev, ...updates]);
  }, []);

  React.useEffect(() => {
    if (queue.length === 0) return;

    const timer = setTimeout(() => {
      // Process batched updates
      const combined = queue.reduce((acc, update) => ({ ...acc, ...update }), {});
      queue.length = 0; // Clear queue
    }, 16); // One frame

    return () => clearTimeout(timer);
  }, [queue]);

  return batch;
}
