/**
 * Closed-Loop Control Card
 * Displays loop gaps and work assignment status using Ant Design
 * Shows when there are open work items or technician assignment issues
 */

import React from 'react';
import { Alert, Badge, Button, Space, Tag } from 'antd';
import { AlertOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';

export const ClosedLoopControlCard = ({
  openWorkCount = 0,
  loopGapCount = 0,
  loopGaps = [],
  onTakeAction,
}) => {
  if (loopGapCount === 0 || !openWorkCount) {
    return null;
  }

  const gapDescriptions = {
    'open work': 'Open tickets without work assignments',
    'technician owner': 'Work assignments missing technician owner',
  };

  return (
    <Alert
      type="error"
      showIcon
      icon={<AlertOutlined />}
      message={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div>
            <strong>CLOSED-LOOP NEXT ACTION</strong>
            <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
              Control open work
            </div>
          </div>
          <Badge count={openWorkCount} color="#EF4444" />
        </div>
      }
      description={
        <div style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '12px', fontSize: '13px' }}>
            {loopGapCount} loop gap{loopGapCount === 1 ? '' : 's'} detected:
          </div>
          <Space direction="vertical" style={{ width: '100%' }}>
            {loopGaps.map((gap, index) => (
              <Tag
                key={index}
                icon={gap === 'open work' ? <AlertOutlined /> : <TeamOutlined />}
                color={gap === 'open work' ? 'purple' : 'orange'}
              >
                {gapDescriptions[gap] || gap}
              </Tag>
            ))}
            <Button
              type="primary"
              danger
              onClick={onTakeAction}
              size="large"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Take action →
            </Button>
          </Space>
        </div>
      }
      style={{
        marginBottom: '24px',
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
      }}
    />
  );
};

export default ClosedLoopControlCard;
