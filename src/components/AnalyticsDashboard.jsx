import { useState, useEffect } from 'react';
import { Download, Share2, Filter, BarChart3 } from 'lucide-react';
import { TrendChart, LineChart, BarChart, PieChart, StatsCard } from './Charts';

export function AnalyticsDashboard({ data, title = 'Analytics' }) {
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetrics, setSelectedMetrics] = useState(['all']);

  const metrics = data?.metrics || [];
  const trends = data?.trends || [];
  const adoption = data?.adoption || [];

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="analytics-title">
          <BarChart3 size={24} />
          <h1>{title}</h1>
        </div>

        <div className="analytics-controls">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>

          <button className="export-btn" title="Export analytics">
            <Download size={18} />
            Export
          </button>

          <button className="share-btn" title="Share report">
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics.length > 0 && (
        <section className="analytics-section">
          <h2>Key Metrics</h2>
          <div className="metrics-grid">
            {metrics.map((metric, idx) => (
              <StatsCard
                key={idx}
                title={metric.title}
                value={metric.value}
                trend={metric.trend}
                icon={metric.icon}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trends & Performance */}
      {trends.length > 0 && (
        <section className="analytics-section">
          <h2>Performance Trends</h2>
          <div className="trends-grid">
            {trends.map((trend, idx) => (
              <TrendChart
                key={idx}
                data={trend.data}
                label={trend.label}
                height={250}
              />
            ))}
          </div>
        </section>
      )}

      {/* Feature Adoption */}
      {adoption.length > 0 && (
        <section className="analytics-section">
          <h2>Feature Adoption</h2>
          <div className="adoption-grid">
            {adoption.map((feature, idx) => (
              <div key={idx} className="adoption-card">
                <h3>{feature.name}</h3>
                <div className="adoption-progress">
                  <div
                    className="adoption-fill"
                    style={{ width: `${feature.adoption}%` }}
                  />
                </div>
                <div className="adoption-stats">
                  <span>{feature.adoption}%</span>
                  <span className="adoption-count">{feature.users} users</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function MetricsGrid({ metrics }) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="metrics-empty">
        <p>No metrics available</p>
      </div>
    );
  }

  return (
    <div className="metrics-grid">
      {metrics.map((metric, idx) => (
        <div key={idx} className="metric-card">
          <div className="metric-header">
            {metric.icon && <span className="metric-icon">{metric.icon}</span>}
            <h4>{metric.label}</h4>
          </div>
          <div className="metric-value">{metric.value}</div>
          {metric.change && (
            <div className={`metric-change ${metric.change > 0 ? 'positive' : 'negative'}`}>
              {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReportBuilder({ onGenerate }) {
  const [config, setConfig] = useState({
    title: 'Analytics Report',
    format: 'pdf',
    includeMetrics: true,
    includeTrends: true,
    includeAdoption: true,
    dateRange: '7d'
  });

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="report-builder">
      <h3>Generate Report</h3>

      <div className="report-form">
        <div className="form-group">
          <label>Report Title</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter report title"
          />
        </div>

        <div className="form-group">
          <label>Format</label>
          <select
            value={config.format}
            onChange={(e) => handleChange('format', e.target.value)}
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div className="form-group">
          <label>Date Range</label>
          <select
            value={config.dateRange}
            onChange={(e) => handleChange('dateRange', e.target.value)}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <div className="form-group-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={config.includeMetrics}
              onChange={(e) => handleChange('includeMetrics', e.target.checked)}
            />
            Include Metrics
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.includeTrends}
              onChange={(e) => handleChange('includeTrends', e.target.checked)}
            />
            Include Trends
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.includeAdoption}
              onChange={(e) => handleChange('includeAdoption', e.target.checked)}
            />
            Include Adoption
          </label>
        </div>

        <button
          className="btn-primary"
          onClick={() => onGenerate?.(config)}
        >
          <Download size={16} />
          Generate Report
        </button>
      </div>
    </div>
  );
}
