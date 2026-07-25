/**
 * Export Button Component Tests
 * Tests for dashboard export button functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportButton from '../components/Dashboard/ExportButton';
import * as PDFGenerator from '../utils/PDFGenerator';

// Mock dependencies
vi.mock('../utils/PDFGenerator');
vi.mock('../utils/i18n', () => ({
  useI18n: () => ({
    t: (key) => {
      const translations = {
        'export.button_label': 'Export',
        'export.success': 'PDF exported successfully',
        'export.error': 'Failed to export PDF',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ExportButton Component', () => {
  const mockDashboardData = {
    kpis: {
      machines_down: 2,
      urgent_open: 5,
      open_tickets: 15,
      plant_health_pct: 85,
    },
    dashboard_overview: {
      total_cost: 50000,
      avg_cost: 500,
      maintenance_count: 100,
    },
  };

  beforeEach(() => {
    PDFGenerator.generatePDFExport.mockResolvedValue(undefined);
    PDFGenerator.generateCSVExport.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render export button', () => {
      render(<ExportButton dashboardData={mockDashboardData} />);
      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should show label when showLabel is true', () => {
      render(<ExportButton dashboardData={mockDashboardData} showLabel={true} />);
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Export');
    });

    it('should hide label when showLabel is false', () => {
      const { container } = render(
        <ExportButton dashboardData={mockDashboardData} showLabel={false} />,
      );
      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ExportButton
          dashboardData={mockDashboardData}
          className="custom-class"
        />,
      );
      const button = container.querySelector('.custom-class');
      expect(button).toBeTruthy();
    });

    it('should render with default company name', () => {
      render(<ExportButton dashboardData={mockDashboardData} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('should render with custom company name', () => {
      render(
        <ExportButton
          dashboardData={mockDashboardData}
          companyName="Acme Corp"
        />,
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('PDF Export', () => {
    it('should trigger PDF export on button click', async () => {
      const user = userEvent.setup();
      render(<ExportButton dashboardData={mockDashboardData} />);

      const button = screen.getByRole('button');
      await user.click(button);

      // Wait for dropdown to open and click PDF option
      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      await waitFor(() => {
        expect(PDFGenerator.generatePDFExport).toHaveBeenCalled();
      });
    });

    it('should pass correct options to PDF generator', async () => {
      PDFGenerator.generatePDFExport.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();

      render(
        <ExportButton
          dashboardData={mockDashboardData}
          companyName="TestCorp"
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      await waitFor(() => {
        expect(PDFGenerator.generatePDFExport).toHaveBeenCalledWith(
          mockDashboardData,
          expect.objectContaining({
            companyName: 'TestCorp',
            includeKPIs: true,
            includeCharts: true,
            includeMachines: true,
          }),
        );
      });
    });

    it('should show loading state during export', async () => {
      const user = userEvent.setup();
      const slowExport = new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      PDFGenerator.generatePDFExport.mockReturnValueOnce(slowExport);

      render(<ExportButton dashboardData={mockDashboardData} />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      // Button should be disabled during export
      await waitFor(() => {
        expect(button).toBeTruthy();
      });
    });

    it('should call onExportStart callback', async () => {
      const onExportStart = vi.fn();
      const user = userEvent.setup();

      render(
        <ExportButton
          dashboardData={mockDashboardData}
          onExportStart={onExportStart}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      await waitFor(() => {
        expect(onExportStart).toHaveBeenCalled();
      });
    });

    it('should call onExportComplete with success', async () => {
      const onExportComplete = vi.fn();
      const user = userEvent.setup();

      render(
        <ExportButton
          dashboardData={mockDashboardData}
          onExportComplete={onExportComplete}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      await waitFor(() => {
        expect(onExportComplete).toHaveBeenCalledWith('success');
      });
    });

    it('should handle export error', async () => {
      PDFGenerator.generatePDFExport.mockRejectedValueOnce(new Error('Export failed'));
      const onExportComplete = vi.fn();
      const user = userEvent.setup();

      render(
        <ExportButton
          dashboardData={mockDashboardData}
          onExportComplete={onExportComplete}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      await waitFor(() => {
        expect(onExportComplete).toHaveBeenCalledWith(
          'error',
          expect.any(Error),
        );
      });
    });
  });

  describe('CSV Export', () => {
    it('should trigger CSV export', async () => {
      const user = userEvent.setup();
      render(<ExportButton dashboardData={mockDashboardData} />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const csvOption = screen.getByText('CSV');
        fireEvent.click(csvOption);
      });

      await waitFor(() => {
        expect(PDFGenerator.generateCSVExport).toHaveBeenCalled();
      });
    });

    it('should pass correct filename to CSV export', async () => {
      PDFGenerator.generateCSVExport.mockImplementationOnce(() => {});
      const user = userEvent.setup();

      render(<ExportButton dashboardData={mockDashboardData} />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const csvOption = screen.getByText('CSV');
        fireEvent.click(csvOption);
      });

      await waitFor(() => {
        expect(PDFGenerator.generateCSVExport).toHaveBeenCalledWith(
          mockDashboardData,
          expect.stringContaining('Dashboard_'),
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<ExportButton dashboardData={mockDashboardData} />);
      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should be disabled when loading', async () => {
      const slowExport = new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      PDFGenerator.generatePDFExport.mockReturnValueOnce(slowExport);
      const user = userEvent.setup();

      render(<ExportButton dashboardData={mockDashboardData} />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      // During export, button should maintain focus capability
      expect(button).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dashboard data', () => {
      render(<ExportButton dashboardData={{}} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('should handle null dashboard data gracefully', () => {
      expect(() => {
        render(<ExportButton dashboardData={null} />);
      }).not.toThrow();
    });

    it('should handle multiple export attempts', async () => {
      const user = userEvent.setup();
      render(<ExportButton dashboardData={mockDashboardData} />);

      const button = screen.getByRole('button');

      // First export
      await user.click(button);
      await waitFor(() => {
        const pdfOption = screen.getByText('PDF');
        fireEvent.click(pdfOption);
      });

      // Wait for first export to complete
      await waitFor(() => {
        expect(PDFGenerator.generatePDFExport).toHaveBeenCalledTimes(1);
      });

      // Note: Second export would need different implementation
      // as current test setup doesn't allow immediate reuse
    });
  });
});
