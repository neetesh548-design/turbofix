/**
 * Export Dialog Component
 * Advanced export options dialog with customization
 * Supports filename input and format selection
 */

import React, { useState } from 'react';
import {
  Modal, Form, Input, Checkbox, Select, Space, Button, Spin, message,
} from 'antd';
import { useI18n } from '../../utils/i18n';
import { generatePDFExport, generateCSVExport } from '../../utils/PDFGenerator';

/**
 * ExportDialog Component
 * @param {Object} props
 * @param {boolean} props.visible - Dialog visibility
 * @param {Object} props.dashboardData - Dashboard data to export
 * @param {string} props.companyName - Company name for PDF
 * @param {Function} props.onClose - Callback when dialog closes
 * @param {Function} props.onExport - Callback after successful export
 * @returns {JSX.Element}
 */
export function ExportDialog({
  visible = false,
  dashboardData,
  companyName = 'TurboFix',
  onClose,
  onExport,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleExport = async () => {
    try {
      await form.validateFields();
      setLoading(true);

      const values = form.getFieldsValue();
      const {
        filename,
        format = 'pdf',
        includeKPIs,
        includeCharts,
        includeMachines,
      } = values;

      const finalFilename = filename || `Dashboard_${new Date().toISOString().split('T')[0]}`;

      if (format === 'pdf') {
        await generatePDFExport(dashboardData, {
          filename: `${finalFilename}.pdf`,
          companyName,
          includeKPIs,
          includeCharts,
          includeMachines,
        });
      } else if (format === 'csv') {
        generateCSVExport(dashboardData, `${finalFilename}.csv`);
      }

      message.success(t('export.success'));
      if (onExport) onExport(finalFilename, format);
      form.resetFields();
      if (onClose) onClose();
    } catch (error) {
      console.error('Export failed:', error);
      message.error(t('export.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    if (onClose) onClose();
  };

  return (
    <Modal
      title={t('export.dialog_title') || 'Export Dashboard'}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel') || 'Cancel'}
        </Button>,
        <Button
          key="export"
          type="primary"
          loading={loading}
          onClick={handleExport}
        >
          {t('export.button_label') || 'Export'}
        </Button>,
      ]}
      width={500}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            filename: `Dashboard_${new Date().toISOString().split('T')[0]}`,
            format: 'pdf',
            includeKPIs: true,
            includeCharts: true,
            includeMachines: true,
          }}
        >
          <Form.Item
            label="Filename"
            name="filename"
            rules={[
              {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message: 'Only alphanumeric characters, hyphens, and underscores allowed',
              },
            ]}
            tooltip="File extension will be added automatically"
          >
            <Input placeholder="Dashboard_2026-07-25" />
          </Form.Item>

          <Form.Item
            label="Export Format"
            name="format"
            rules={[{ required: true, message: 'Please select export format' }]}
          >
            <Select
              options={[
                { label: 'PDF', value: 'pdf' },
                { label: 'CSV', value: 'csv' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Include Sections">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name="includeKPIs" valuePropName="checked" noStyle>
                <Checkbox>Key Performance Indicators (KPIs)</Checkbox>
              </Form.Item>
              <Form.Item name="includeCharts" valuePropName="checked" noStyle>
                <Checkbox>Charts and Trends</Checkbox>
              </Form.Item>
              <Form.Item name="includeMachines" valuePropName="checked" noStyle>
                <Checkbox>Machines and Equipment Status</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>

          <div style={{
            padding: '12px',
            backgroundColor: '#f6f8fb',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            marginTop: '16px',
          }}
          >
            <strong>Note:</strong>
            {' '}
            PDF exports will include all selected sections in a formatted layout suitable for printing.
            CSV exports will include data tables only.
          </div>
        </Form>
      </Spin>
    </Modal>
  );
}

export default ExportDialog;
