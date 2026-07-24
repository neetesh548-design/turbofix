/**
 * Ant Design Dashboard Components
 * High-level dashboard building blocks using Ant Design
 * Includes: ChartCard, DetailList, StatusBadge, EmptyState
 */

import React from 'react';
import { Card, Badge, Empty, List, Progress, Space, Tag } from 'antd';
import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

/**
 * ChartCard — Wraps a chart with header, caption, and consistent styling
 */
export const AntDChartCard = ({
  title,
  subtitle,
  caption,
  children,
  actions,
  fullHeight = false,
}) => {
  return (
    <Card
      style={{ height: fullHeight ? '100%' : 'auto' }}
      bodyStyle={{ padding: '16px' }}
      className="antd-chart-card"
    >
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {subtitle}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {title}
          </h3>
          {actions && <div>{actions}</div>}
        </div>
        {caption && <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{caption}</div>}
      </div>
      {children}
    </Card>
  );
};

/**
 * DetailList — Renders a list of key-value items with optional click handler
 * Used for top machines, loss-making items, issues, etc.
 */
export const AntDDetailList = ({
  items = [],
  renderItem,
  emptyMessage = 'No data available',
}) => {
  if (!items.length) {
    return <Empty description={emptyMessage} />;
  }

  return (
    <List
      dataSource={items}
      renderItem={(item, index) => (
        <List.Item
          key={item.id || index}
          onClick={item.onClick}
          style={{ cursor: item.onClick ? 'pointer' : 'default', padding: '12px 0' }}
          className="antd-detail-list-item"
        >
          {renderItem ? renderItem(item, index) : (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space direction="vertical" size={0}>
                <strong>{item.label || item.name}</strong>
                <span style={{ fontSize: '12px', color: '#999' }}>{item.description}</span>
              </Space>
              <strong style={{ color: item.tone === 'danger' ? '#EF4444' : '#999' }}>
                {item.value}
              </strong>
            </div>
          )}
        </List.Item>
      )}
      split
    />
  );
};

/**
 * StatusBadge — Ant Design Badge wrapper for consistent status display
 */
export const AntDStatusBadge = ({ status, count, color }) => {
  const colorMap = {
    open: '#EF4444',
    closed: '#52C41A',
    resolved: '#52C41A',
    warning: '#FAAD14',
    critical: '#FF4D4F',
    success: '#52C41A',
    pending: '#1890FF',
    default: '#D9D9D9',
  };

  const displayColor = color || colorMap[status] || colorMap.default;

  return (
    <Badge
      count={count}
      style={{ backgroundColor: displayColor }}
      title={status}
    />
  );
};

/**
 * EmptyState — Consistent empty state display
 */
export const AntDEmptyState = ({ message, type = 'default', icon = null }) => {
  const iconMap = {
    alert: <AlertOutlined style={{ fontSize: '48px', color: '#FAAD14' }} />,
    success: <CheckCircleOutlined style={{ fontSize: '48px', color: '#52C41A' }} />,
    pending: <ClockCircleOutlined style={{ fontSize: '48px', color: '#1890FF' }} />,
    default: null,
  };

  return (
    <Empty
      image={type === 'default' ? Empty.PRESENTED_IMAGE_SIMPLE : undefined}
      description={message}
      style={{ padding: '40px 0' }}
    >
      {icon && <div style={{ marginTop: '16px' }}>{icon}</div>}
    </Empty>
  );
};

/**
 * MachineListItem — Render a machine with status and metrics
 */
export const AntDMachineListItem = ({
  machineId,
  machineName,
  location,
  status,
  issueCount,
  downtime,
  onClick,
}) => {
  const statusColor = status === 'Online' ? '#52C41A' : status === 'Maintenance' ? '#FAAD14' : '#D9D9D9';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        border: '1px solid #E8E8E8',
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      className="antd-machine-item"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {machineName}
            <Tag color={statusColor} style={{ marginLeft: '8px' }}>
              {status}
            </Tag>
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
            {location}
          </div>
          {issueCount !== undefined && (
            <Space size="small">
              <Tag color="red">{issueCount} issue{issueCount === 1 ? '' : 's'}</Tag>
              {downtime !== undefined && <Tag>{downtime}h downtime</Tag>}
            </Space>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * HealthRing — Circular progress indicator for health percentages
 */
export const AntDHealthRing = ({
  percent = 0,
  label,
  size = 120,
  strokeWidth = 4,
  color = '#52C41A',
}) => {
  const getColor = (value) => {
    if (value >= 75) return '#52C41A';
    if (value >= 50) return '#FAAD14';
    if (value >= 25) return '#FF7A45';
    return '#EF4444';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <Progress
        type="circle"
        percent={percent}
        width={size}
        strokeColor={getColor(percent)}
        format={(pct) => `${pct}%`}
      />
      {label && <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

export default {
  AntDChartCard,
  AntDDetailList,
  AntDStatusBadge,
  AntDEmptyState,
  AntDMachineListItem,
  AntDHealthRing,
};
