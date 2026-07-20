import { useMemo } from 'react';

export function LineChart({ data, label, height = 200 }) {
  const { points, maxValue, minValue } = useMemo(() => {
    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = ((max - d.value) / (max - min)) * 100;
      return { x, y, ...d };
    });

    return { points, maxValue: max, minValue: min };
  }, [data]);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>{label}</h4>
        <span className="chart-range">{minValue} - {maxValue}</span>
      </div>
      <svg viewBox="0 0 100 100" className="chart-svg" preserveAspectRatio="none">
        <path d={pathD} className="chart-line" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.5"
            className="chart-point"
          />
        ))}
      </svg>
      <style>{`
        .chart-svg { height: ${height}px; }
      `}</style>
    </div>
  );
}

export function BarChart({ data, label, height = 200 }) {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>{label}</h4>
        <span className="chart-max">Max: {maxValue}</span>
      </div>
      <div className="bar-chart" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="bar-item"
            style={{
              width: `${barWidth}%`,
              '--bar-height': `${(d.value / maxValue) * 100}%`
            }}
            title={`${d.label}: ${d.value}`}
          >
            <div className="bar" />
            <span className="bar-label">{d.label}</span>
            <span className="bar-value">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieChart({ data, label, size = 200 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90;

  const segments = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 360;
    const startAngle = currentAngle * (Math.PI / 180);
    const endAngle = (currentAngle + sliceAngle) * (Math.PI / 180);

    const x1 = 50 + 45 * Math.cos(startAngle);
    const y1 = 50 + 45 * Math.sin(startAngle);
    const x2 = 50 + 45 * Math.cos(endAngle);
    const y2 = 50 + 45 * Math.sin(endAngle);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathD = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const midAngle = (currentAngle + sliceAngle / 2) * (Math.PI / 180);
    const labelX = 50 + 28 * Math.cos(midAngle);
    const labelY = 50 + 28 * Math.sin(midAngle);
    const percentage = ((d.value / total) * 100).toFixed(1);

    currentAngle += sliceAngle;

    return { pathD, labelX, labelY, percentage, ...d };
  });

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>{label}</h4>
        <span className="chart-total">Total: {total}</span>
      </div>
      <svg viewBox="0 0 100 100" className="pie-chart">
        {segments.map((segment, i) => (
          <g key={i}>
            <path d={segment.pathD} className={`pie-segment pie-${i}`} />
            <text
              x={segment.labelX}
              y={segment.labelY}
              className="pie-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {segment.percentage}%
            </text>
          </g>
        ))}
      </svg>
      <div className="pie-legend">
        {segments.map((segment, i) => (
          <div key={i} className="legend-item">
            <span className={`legend-color pie-${i}`} />
            <span className="legend-label">{segment.label}</span>
            <span className="legend-value">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsCard({ title, value, trend, icon }) {
  const isPositive = trend >= 0;

  return (
    <div className="stats-card">
      <div className="stats-header">
        <h4>{title}</h4>
        {icon && <span className="stats-icon">{icon}</span>}
      </div>
      <div className="stats-value">{value}</div>
      {trend !== undefined && (
        <div className={`stats-trend ${isPositive ? 'positive' : 'negative'}`}>
          <span className="trend-arrow">{isPositive ? '↑' : '↓'}</span>
          <span className="trend-text">{Math.abs(trend)}% from last period</span>
        </div>
      )}
    </div>
  );
}

export function TrendChart({ data, label, height = 150 }) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = ((maxValue - d.value) / range) * 100;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const fillPath = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>{label}</h4>
        <div className="trend-stats">
          <span>High: {maxValue}</span>
          <span>Low: {minValue}</span>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="trend-chart" preserveAspectRatio="none">
        <path d={fillPath} className="trend-fill" />
        <path d={pathD} className="trend-line" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.5"
            className="trend-point"
          />
        ))}
      </svg>
      <style>{`
        .trend-chart { height: ${height}px; }
      `}</style>
    </div>
  );
}
