/**
 * Ant Design KPI Card Component
 * Replacement for custom KpiCard using Ant Design's Statistic component
 * Supports tone (danger, warning, success), onClick, and responsive layout
 */

import React from 'react';
import { Statistic, Card, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export const AntDKPICard = ({
  label,
  value,
  hint,
  tone = '',
  onClick,
  prefix,
  suffix,
  trend,
  trendValue,
}) => {
  // Color mapping for tone
  const toneColorMap = {
    danger: '#EF4444',
    warning: '#FAAD14',
    success: '#52C41A',
    ok: 'inherit',
  };

  const toneColor = toneColorMap[tone] || 'inherit';

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderColor: toneColor !== 'inherit' ? `${toneColor}33` : undefined,
        cursor: onClick ? 'pointer' : 'default',
      }}
      className={`antd-kpi-card antd-kpi-tone-${tone}`}
      bodyStyle={{ padding: '16px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <strong style={{ fontSize: '28px', color: toneColor }}>
            {prefix}
            {value}
            {suffix}
          </strong>
          {trend && (
            <span style={{ fontSize: '12px', color: trend === 'up' ? '#52C41A' : '#EF4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
              {trend === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {trendValue}
            </span>
          )}
        </div>

        {hint && (
          <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.4' }}>
            {hint}
          </div>
        )}
      </Space>
    </Card>
  );
};

export default AntDKPICard;
