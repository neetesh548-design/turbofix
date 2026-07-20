import { useEffect, useState } from 'react';

export function usePerformanceMonitor(showMetrics = false) {
  const [metrics, setMetrics] = useState({
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  });

  useEffect(() => {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({
            ...prev,
            fcp: Math.round(entry.startTime)
          }));
        }
      });
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({
        ...prev,
        lcp: Math.round(lastEntry.renderTime || lastEntry.loadTime)
      }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    let clsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
          setMetrics(prev => ({
            ...prev,
            cls: parseFloat((clsScore * 100).toFixed(2))
          }));
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte
    const navigationTiming = performance.getEntriesByType('navigation')[0];
    if (navigationTiming) {
      setMetrics(prev => ({
        ...prev,
        ttfb: Math.round(navigationTiming.responseStart - navigationTiming.fetchStart)
      }));
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (showMetrics && metrics.fcp) {
      const metricsEl = document.getElementById('perf-metrics');
      if (metricsEl) {
        metricsEl.classList.add('visible');
      }
    }
  }, [showMetrics, metrics]);

  return metrics;
}

export function PerformanceMetrics({ show = false }) {
  const metrics = usePerformanceMonitor(show);

  if (!show) return null;

  const getStatus = (value, good, bad) => {
    if (!value) return 'unknown';
    return value <= good ? 'good' : value <= bad ? 'needs-improvement' : 'poor';
  };

  return (
    <div id="perf-metrics" className="perf-metrics">
      <div className="web-vitals">
        <div className="web-vitals-item">
          <div className={`web-vitals-dot ${getStatus(metrics.fcp, 1800, 3000)}`}></div>
          <span>FCP: {metrics.fcp || '-'}ms</span>
        </div>
        <div className="web-vitals-item">
          <div className={`web-vitals-dot ${getStatus(metrics.lcp, 2500, 4000)}`}></div>
          <span>LCP: {metrics.lcp || '-'}ms</span>
        </div>
        <div className="web-vitals-item">
          <div className={`web-vitals-dot ${getStatus(metrics.cls, 0.1, 0.25)}`}></div>
          <span>CLS: {metrics.cls || '-'}</span>
        </div>
      </div>
    </div>
  );
}
