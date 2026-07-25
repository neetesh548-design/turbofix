/**
 * Export Button Component
 * Reusable button to trigger PDF/CSV export of dashboard data
 * Supports multiple export formats with loading and error states
 */

import React, { useState } from 'react';
import { Button, Dropdown, message, Spin } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useI18n } from '../../utils/i18n';
import { generatePDFExport, generateCSVExport } from '../../utils/PDFGenerator';

/**
 * ExportButton Component
 * @param {Object} props
 * @param {Object} props.dashboardData - Dashboard data to export
 * @param {string} props.companyName - Company name for PDF header
 * @param {boolean} props.showLabel - Show button text (default: true)
 * @param {string} props.className - Additional CSS class
 * @param {Function} props.onExportStart - Callback when export starts
 * @param {Function} props.onExportComplete - Callback when export completes
 * @returns {JSX.Element}
 */
export function ExportButton({
  dashboardData,
  companyName = 'TurboFix',
  showLabel = true,
  className = '',
  onExportStart,
  onExportComplete,
}) {
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleExport = async (exportFormat) => {
    try {
      setLoading(true);
      if (onExportStart) onExportStart();

      const date = new Date().toISOString().split('T')[0];
      const filename = `Dashboard_${date}`;

      if (exportFormat === 'pdf') {
        await generatePDFExport(dashboardData, {
          filename: `${filename}.pdf`,
          companyName,
          includeKPIs: true,
          includeCharts: true,
          includeMachines: true,
        });
        message.success(t('export.success') || 'PDF exported successfully');
      } else if (exportFormat === 'csv') {
        generateCSVExport(dashboardData, `${filename}.csv`);
        message.success(t('export.success') || 'CSV exported successfully');
      }

      if (onExportComplete) onExportComplete('success');
    } catch (error) {
      console.error('Export failed:', error);
      message.error(t('export.error') || 'Failed to export');
      if (onExportComplete) onExportComplete('error', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'PDF',
      onClick: () => handleExport('pdf'),
    },
    {
      key: 'csv',
      icon: <FileExcelOutlined />,
      label: 'CSV',
      onClick: () => handleExport('csv'),
    },
  ];

  return (
    <Spin spinning={loading} size="small">
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          disabled={loading}
          className={className}
        >
          {showLabel && (t('export.button_label') || 'Export')}
        </Button>
      </Dropdown>
    </Spin>
  );
}

export default ExportButton;
