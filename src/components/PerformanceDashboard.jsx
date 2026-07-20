import { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, Database, Gauge, TrendingUp, RefreshCw, Download } from 'lucide-react';
import { perfMonitor, storageManager } from '../utils/performance';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [memory, setMemory] = useState(null);
  const [storageSize, setStorageSize] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const refreshMetrics = () => {
      const allMetrics = perfMonitor.getAllMetrics();
      setMetrics(allMetrics);
      setMemory(perfMonitor.getMemoryUsage());
      setStorageSize(storageManager.getSize());
    };

    refreshMetrics();

    let interval = null;
    if (autoRefresh) {
      interval = setInterval(refreshMetrics, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const handleExport = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      memory,
      storageSize,
      config: {
        enabled: isMonitoring,
        threshold: perfMonitor.threshold
      }
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, memory, storageSize, isMonitoring]);

  const handleCleanup = useCallback(() => {
    const cleaned = storageManager.cleanup();
    setStorageSize(storageManager.getSize());
    alert(`Cleaned up ${cleaned} expired entries`);
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('Reset all performance metrics?')) {
      perfMonitor.reset();
      setMetrics([]);
      setMemory(null);
    }
  }, []);

  const slowMetrics = metrics.filter((m) => parseFloat(m.average) > perfMonitor.threshold);

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h2>Performance Dashboard</h2>
        <div className="dashboard-controls">
          <button
            className={`control-btn ${isMonitoring ? 'active' : ''}`}
            onClick={() => setIsMonitoring(!isMonitoring)}
            title={isMonitoring ? 'Disable monitoring' : 'Enable monitoring'}
          >
            <Activity size={16} />
            {isMonitoring ? 'Monitoring' : 'Paused'}
          </button>
          <button
            className={`control-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Toggle auto-refresh"
          >
            <RefreshCw size={16} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          <button className="control-btn" onClick={handleCleanup} title="Clean up storage">
            <Database size={16} />
            Cleanup
          </button>
          <button className="control-btn" onClick={handleExport} title="Export metrics">
            <Download size={16} />
            Export
          </button>
          <button className="control-btn" onClick={handleReset} title="Reset metrics">
            Reset
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Operations Tracked"
          value={metrics.length}
          icon={<Gauge size={24} />}
          color="blue"
        />
        <MetricCard
          title="Storage Used"
          value={`${(storageSize / 1024).toFixed(2)} KB`}
          icon={<Database size={24} />}
          color="green"
        />
        {memory && (
          <>
            <MetricCard
              title="Heap Used"
              value={`${memory.usedJSHeapSize} MB`}
              subtext={`of ${memory.jsHeapSizeLimit} MB`}
              icon={<Zap size={24} />}
              color="orange"
            />
            <MetricCard
              title="Total Heap"
              value={`${memory.totalJSHeapSize} MB`}
              icon={<Activity size={24} />}
              color="purple"
            />
          </>
        )}
      </div>

      {slowMetrics.length > 0 && (
        <div className="slow-operations">
          <div className="slow-header">
            <TrendingUp size={18} />
            <h3>Slow Operations ({slowMetrics.length})</h3>
          </div>
          <div className="slow-list">
            {slowMetrics.map((metric) => (
              <div key={metric.name} className="slow-item">
                <span className="slow-name">{metric.name}</span>
                <span className="slow-time">{metric.average}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="metrics-table">
        <h3>Performance Metrics</h3>
        {metrics.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Count</th>
                  <th>Average</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 20).map((metric) => (
                  <tr key={metric.name}>
                    <td className="metric-name">{metric.name}</td>
                    <td>{metric.count}</td>
                    <td className="metric-avg">{metric.average}ms</td>
                    <td>{metric.min}ms</td>
                    <td>{metric.max}ms</td>
                    <td>{metric.total}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="metrics-empty">
            <Activity size={32} />
            <p>No metrics recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtext, icon, color }) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-icon">
        {icon}
      </div>
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
        {subtext && <div className="metric-subtext">{subtext}</div>}
      </div>
    </div>
  );
}

export function CodeSplittingTracker() {
  const [chunks, setChunks] = useState([]);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    // Track loaded chunks from webpack/vite
    const trackChunks = () => {
      if (window.__CHUNK_MANIFEST__) {
        const chunkData = Object.entries(window.__CHUNK_MANIFEST__).map(([name, size]) => ({
          name,
          size: (size / 1024).toFixed(2),
          type: name.includes('vendor') ? 'vendor' : 'app'
        }));

        setChunks(chunkData);
        setTotalSize(chunkData.reduce((sum, c) => sum + parseFloat(c.size), 0));
      }
    };

    trackChunks();
    window.addEventListener('chunkLoaded', trackChunks);

    return () => window.removeEventListener('chunkLoaded', trackChunks);
  }, []);

  if (chunks.length === 0) {
    return (
      <div className="code-splitting-tracker">
        <h3>Code Splitting Monitor</h3>
        <div className="chunks-empty">
          <p>No chunk data available</p>
          <small>Enable webpack/vite chunk manifest for tracking</small>
        </div>
      </div>
    );
  }

  return (
    <div className="code-splitting-tracker">
      <h3>Code Splitting Monitor</h3>
      <div className="chunks-summary">
        <div className="chunks-stat">
          <span className="stat-label">Total Size</span>
          <span className="stat-value">{totalSize.toFixed(2)} KB</span>
        </div>
        <div className="chunks-stat">
          <span className="stat-label">Chunks</span>
          <span className="stat-value">{chunks.length}</span>
        </div>
      </div>

      <div className="chunks-list">
        {chunks.map((chunk) => (
          <div key={chunk.name} className={`chunk-item ${chunk.type}`}>
            <span className="chunk-name">{chunk.name}</span>
            <span className="chunk-size">{chunk.size} KB</span>
          </div>
        ))}
      </div>
    </div>
  );
}
