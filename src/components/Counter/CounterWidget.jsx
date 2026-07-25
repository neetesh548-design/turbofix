import { Button, Card, Row, Col, Space, Statistic, Tooltip } from 'antd';
import { PlusOutlined, MinusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useI18n } from '@/utils/i18n';
import { useCounter } from './useCounter';
import './CounterWidget.css';

/**
 * CounterWidget Component
 * A simple counter component with increment/decrement buttons
 * Supports i18n, responsive design, and min/max constraints
 *
 * @param {object} props - Component props
 * @param {number} props.initialValue - Initial counter value (default: 0)
 * @param {number} props.min - Minimum counter value
 * @param {number} props.max - Maximum counter value
 * @param {boolean} props.showReset - Show reset button (default: true)
 * @param {function} props.onChange - Callback when counter changes
 * @returns {JSX.Element} Counter widget component
 */
export function CounterWidget({
  initialValue = 0,
  min,
  max,
  showReset = true,
  onChange,
}) {
  const { t } = useI18n();
  const { count, increment, decrement, reset, isAtMin, isAtMax } = useCounter(
    initialValue,
    { min, max, step: 1 }
  );

  // Call onChange callback when count changes
  React.useEffect(() => {
    onChange?.(count);
  }, [count, onChange]);

  const handleReset = () => {
    reset();
  };

  const handleIncrement = () => {
    if (!isAtMax) {
      increment();
    }
  };

  const handleDecrement = () => {
    if (!isAtMin) {
      decrement();
    }
  };

  return (
    <Card
      className="counter-widget"
      title={t('counter.title')}
      style={{
        borderRadius: '8px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
      }}
      data-testid="counter-widget"
    >
      <div className="counter-content">
        <Row
          gutter={[24, 24]}
          justify="center"
          align="middle"
          className="counter-row"
        >
          {/* Counter Display */}
          <Col xs={24} sm={8} className="counter-display">
            <Statistic
              title={t('counter.current_value')}
              value={count}
              data-testid="counter-value"
              className="counter-statistic"
              valueStyle={{
                color: '#1890ff',
                fontSize: '2.5rem',
                fontWeight: 'bold',
              }}
            />
          </Col>

          {/* Control Buttons */}
          <Col xs={24} sm={16} className="counter-controls">
            <Space size="middle" wrap className="button-group">
              <Tooltip
                title={isAtMin ? t('counter.at_minimum') : t('counter.decrease')}
                placement="top"
              >
                <Button
                  type="primary"
                  danger
                  icon={<MinusOutlined />}
                  size="large"
                  onClick={handleDecrement}
                  disabled={isAtMin}
                  data-testid="counter-decrement-btn"
                  aria-label={t('counter.decrease')}
                  className="counter-btn-decrement"
                >
                  {t('counter.decrease')}
                </Button>
              </Tooltip>

              <Tooltip
                title={isAtMax ? t('counter.at_maximum') : t('counter.increase')}
                placement="top"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={handleIncrement}
                  disabled={isAtMax}
                  data-testid="counter-increment-btn"
                  aria-label={t('counter.increase')}
                  className="counter-btn-increment"
                >
                  {t('counter.increase')}
                </Button>
              </Tooltip>

              {showReset && (
                <Tooltip title={t('counter.reset')} placement="top">
                  <Button
                    icon={<ReloadOutlined />}
                    size="large"
                    onClick={handleReset}
                    data-testid="counter-reset-btn"
                    aria-label={t('counter.reset')}
                    className="counter-btn-reset"
                  >
                    {t('counter.reset')}
                  </Button>
                </Tooltip>
              )}
            </Space>
          </Col>
        </Row>

        {/* Min/Max Info */}
        {(min !== undefined || max !== undefined) && (
          <Row justify="center" style={{ marginTop: '16px' }}>
            <Col xs={24} className="counter-info">
              <small style={{ color: '#999' }}>
                {min !== undefined && max !== undefined
                  ? t('counter.range_info', {
                      min,
                      max,
                    })
                  : min !== undefined
                    ? t('counter.min_info', { min })
                    : t('counter.max_info', { max })}
              </small>
            </Col>
          </Row>
        )}
      </div>
    </Card>
  );
}

// Import React for useEffect
import React from 'react';

export default CounterWidget;
