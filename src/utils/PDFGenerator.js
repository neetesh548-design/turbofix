/**
 * PDF Generator Utility
 * Generates and downloads PDF from dashboard data
 * Supports multiple export formats and customizations
 */

import html2pdf from 'html2pdf.js';

/**
 * Format currency value for PDF display
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'INR') {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  return formatter.format(value || 0);
}

/**
 * Format date for PDF display
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale string (default: en-IN)
 * @returns {string} Formatted date string
 */
export function formatDate(date, locale = 'en-IN') {
  try {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return new Date().toLocaleDateString(locale);
  }
}

/**
 * Create HTML template for PDF export
 * @param {Object} dashboardData - Dashboard data to include in PDF
 * @param {string} companyName - Company name for header
 * @param {Object} options - Export options
 * @returns {HTMLElement} HTML element ready for PDF conversion
 */
export function createPDFTemplate(dashboardData, companyName = 'TurboFix', options = {}) {
  const {
    includeKPIs = true,
    includeCharts = true,
    includeMachines = true,
    exportedAt = new Date(),
  } = options;

  const container = document.createElement('div');
  container.id = 'pdf-export-container';
  container.style.cssText = `
    font-family: Arial, sans-serif;
    padding: 40px;
    background: white;
    color: #333;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    border-bottom: 3px solid #1890ff;
    padding-bottom: 20px;
    margin-bottom: 30px;
    text-align: center;
  `;

  const title = document.createElement('h1');
  title.textContent = `${companyName} Dashboard Report`;
  title.style.cssText = `
    margin: 0 0 10px 0;
    color: #1890ff;
    font-size: 28px;
    font-weight: bold;
  `;

  const exportDate = document.createElement('p');
  exportDate.textContent = `Exported on ${formatDate(exportedAt)}`;
  exportDate.style.cssText = `
    margin: 0;
    color: #999;
    font-size: 12px;
  `;

  header.appendChild(title);
  header.appendChild(exportDate);
  container.appendChild(header);

  // KPIs Section
  if (includeKPIs && dashboardData.kpis) {
    const kpiSection = document.createElement('div');
    kpiSection.style.cssText = `
      margin-bottom: 30px;
      page-break-inside: avoid;
    `;

    const kpiTitle = document.createElement('h2');
    kpiTitle.textContent = 'Key Performance Indicators';
    kpiTitle.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 15px 0;
      color: #1890ff;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    `;

    kpiSection.appendChild(kpiTitle);

    const kpiGrid = document.createElement('div');
    kpiGrid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    `;

    const kpis = [
      { label: 'Machines Down', value: dashboardData.kpis.machines_down || 0 },
      { label: 'Urgent Open', value: dashboardData.kpis.urgent_open || 0 },
      { label: 'Open Tickets', value: dashboardData.kpis.open_tickets || 0 },
      { label: 'Plant Health %', value: `${dashboardData.kpis.plant_health_pct || 0}%` },
      { label: 'Avg Hours to Fix', value: `${(dashboardData.kpis.avg_hours_to_fix || 0).toFixed(1)}h` },
      { label: 'PM Compliance %', value: `${dashboardData.kpis.pm_compliance_pct || 0}%` },
    ];

    kpis.forEach(({ label, value }) => {
      const card = document.createElement('div');
      card.style.cssText = `
        border: 1px solid #f0f0f0;
        border-radius: 4px;
        padding: 12px;
        background: #fafafa;
      `;

      const cardLabel = document.createElement('div');
      cardLabel.textContent = label;
      cardLabel.style.cssText = `
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        margin-bottom: 5px;
        font-weight: 500;
      `;

      const cardValue = document.createElement('div');
      cardValue.textContent = value;
      cardValue.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: #1890ff;
      `;

      card.appendChild(cardLabel);
      card.appendChild(cardValue);
      kpiGrid.appendChild(card);
    });

    kpiSection.appendChild(kpiGrid);
    container.appendChild(kpiSection);
  }

  // Overview Section
  if (dashboardData.dashboard_overview) {
    const overviewSection = document.createElement('div');
    overviewSection.style.cssText = `
      margin-bottom: 30px;
      page-break-inside: avoid;
    `;

    const overviewTitle = document.createElement('h2');
    overviewTitle.textContent = 'Dashboard Overview';
    overviewTitle.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 15px 0;
      color: #1890ff;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    `;

    overviewSection.appendChild(overviewTitle);

    const overview = dashboardData.dashboard_overview;
    const summaryStats = [
      { label: 'Total Cost', value: formatCurrency(overview.total_cost) },
      { label: 'Avg Cost per Ticket', value: formatCurrency(overview.avg_cost) },
      { label: 'Total Maintenance Count', value: overview.maintenance_count || 0 },
      { label: 'Scheduled %', value: `${overview.scheduled_pct || 0}%` },
    ];

    const statsList = document.createElement('div');
    statsList.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    `;

    summaryStats.forEach(({ label, value }) => {
      const stat = document.createElement('div');
      stat.style.cssText = `
        padding: 10px;
        background: #f5f5f5;
        border-radius: 4px;
      `;

      const statLabel = document.createElement('div');
      statLabel.textContent = label;
      statLabel.style.cssText = `
        font-size: 11px;
        color: #999;
        margin-bottom: 5px;
      `;

      const statValue = document.createElement('div');
      statValue.textContent = value;
      statValue.style.cssText = `
        font-size: 14px;
        font-weight: bold;
        color: #333;
      `;

      stat.appendChild(statLabel);
      stat.appendChild(statValue);
      statsList.appendChild(stat);
    });

    overviewSection.appendChild(statsList);
    container.appendChild(overviewSection);
  }

  // Machines Section
  if (includeMachines && dashboardData.drilldown?.machines_down) {
    const machinesSection = document.createElement('div');
    machinesSection.style.cssText = `
      margin-bottom: 30px;
      page-break-inside: avoid;
    `;

    const machinesTitle = document.createElement('h2');
    machinesTitle.textContent = 'Machines Down';
    machinesTitle.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 15px 0;
      color: #1890ff;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    `;

    machinesSection.appendChild(machinesTitle);

    const machinesList = document.createElement('ul');
    machinesList.style.cssText = `
      list-style: none;
      padding: 0;
      margin: 0;
    `;

    dashboardData.drilldown.machines_down.slice(0, 10).forEach((machine) => {
      const item = document.createElement('li');
      item.style.cssText = `
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
      `;
      item.textContent = `${machine.machine_name} - Location: ${machine.location} (${machine.open_count} open tickets)`;
      machinesList.appendChild(item);
    });

    machinesSection.appendChild(machinesList);
    container.appendChild(machinesSection);
  }

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
    text-align: center;
    font-size: 11px;
    color: #999;
  `;
  footer.textContent = `TurboFix Dashboard Report | Confidential | Generated automatically`;

  container.appendChild(footer);

  return container;
}

/**
 * Generate and download PDF from dashboard data
 * @param {Object} dashboardData - Dashboard data to export
 * @param {Object} options - Export options
 * @param {string} options.filename - PDF filename (default: Dashboard_YYYY-MM-DD.pdf)
 * @param {string} options.companyName - Company name for header
 * @param {boolean} options.includeKPIs - Include KPIs section (default: true)
 * @param {boolean} options.includeCharts - Include charts (default: true)
 * @param {boolean} options.includeMachines - Include machines section (default: true)
 * @returns {Promise<void>} Resolves when PDF is downloaded
 */
export async function generatePDFExport(dashboardData, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const {
        filename = `Dashboard_${new Date().toISOString().split('T')[0]}.pdf`,
        companyName = 'TurboFix',
        ...htmlOptions
      } = options;

      // Create PDF template
      const pdfElement = createPDFTemplate(dashboardData, companyName, htmlOptions);

      // Add to DOM temporarily
      document.body.appendChild(pdfElement);

      // Configure html2pdf options
      const pdfOptions = {
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      // Generate PDF
      html2pdf().set(pdfOptions).from(pdfElement).save().then(() => {
        // Clean up
        document.body.removeChild(pdfElement);
        resolve();
      }).catch((error) => {
        // Clean up on error
        if (document.body.contains(pdfElement)) {
          document.body.removeChild(pdfElement);
        }
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export dashboard data as CSV
 * @param {Object} dashboardData - Dashboard data to export
 * @param {string} filename - CSV filename
 * @returns {void}
 */
export function generateCSVExport(dashboardData, filename = 'Dashboard.csv') {
  try {
    const rows = [];

    // Header
    rows.push(['TurboFix Dashboard Report', `Exported: ${new Date().toLocaleString()}`]);
    rows.push([]);

    // KPIs
    if (dashboardData.kpis) {
      rows.push(['Key Performance Indicators']);
      Object.entries(dashboardData.kpis).forEach(([key, value]) => {
        rows.push([key.replace(/_/g, ' '), value]);
      });
      rows.push([]);
    }

    // Overview
    if (dashboardData.dashboard_overview) {
      rows.push(['Dashboard Overview']);
      Object.entries(dashboardData.dashboard_overview).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          rows.push([key.replace(/_/g, ' '), value]);
        }
      });
      rows.push([]);
    }

    // Convert to CSV
    const csv = rows.map((row) => row.map((cell) => {
      const str = String(cell || '');
      return str.includes(',') ? `"${str}"` : str;
    }).join(',')).join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    // Cleanup
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
}

/**
 * Validate dashboard data before export
 * @param {Object} dashboardData - Dashboard data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateDashboardData(dashboardData) {
  const errors = [];

  if (!dashboardData) {
    errors.push('Dashboard data is required');
  } else {
    if (!dashboardData.kpis) {
      errors.push('KPI data is missing');
    }
    if (!dashboardData.dashboard_overview) {
      errors.push('Overview data is missing');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  formatCurrency,
  formatDate,
  createPDFTemplate,
  generatePDFExport,
  generateCSVExport,
  validateDashboardData,
};
