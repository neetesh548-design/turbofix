import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KPICard } from '@/components/KPICard';

describe('KPICard', () => {
  it('renders label and value', () => {
    render(
      <KPICard
        label="Machines Down"
        value="6"
      />,
    );
    expect(screen.getByText('Machines Down')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders with prefix and suffix', () => {
    render(
      <KPICard
        label="Downtime Cost"
        value="5,81,87,794"
        prefix="₹"
      />,
    );
    expect(screen.getByText(/₹.*5,81,87,794/)).toBeInTheDocument();
  });

  it('renders hint text', () => {
    render(
      <KPICard
        label="MTTR"
        value="10.3"
        suffix="h"
        hint="Maintenance takes time"
      />,
    );
    expect(screen.getByText('Maintenance takes time')).toBeInTheDocument();
  });

  it('renders trend indicator with up direction', () => {
    render(
      <KPICard
        label="Urgent Issues"
        value="110"
        trend="up"
        trendValue="↑ 20/wk"
      />,
    );
    expect(screen.getByText('↑ 20/wk')).toBeInTheDocument();
  });

  it('renders trend indicator with down direction', () => {
    render(
      <KPICard
        label="Plant Health"
        value="91%"
        trend="down"
        trendValue="↓ 2%"
      />,
    );
    expect(screen.getByText('↓ 2%')).toBeInTheDocument();
  });

  it('applies tone styles', () => {
    const { container } = render(
      <KPICard
        label="Success Metric"
        value="100"
        tone="success"
      />,
    );
    expect(container.querySelector('[class*="bg-success"]')).toBeInTheDocument();
  });

  it('handles destructive tone', () => {
    const { container } = render(
      <KPICard
        label="Failures"
        value="12"
        tone="destructive"
      />,
    );
    expect(container.querySelector('[class*="bg-destructive"]')).toBeInTheDocument();
  });

  it('handles warning tone', () => {
    const { container } = render(
      <KPICard
        label="At Risk"
        value="8"
        tone="warning"
      />,
    );
    expect(container.querySelector('[class*="bg-warning"]')).toBeInTheDocument();
  });

  it('handles info tone', () => {
    const { container } = render(
      <KPICard
        label="Information"
        value="42"
        tone="info"
      />,
    );
    expect(container.querySelector('[class*="bg-info"]')).toBeInTheDocument();
  });

  it('handles neutral tone', () => {
    const { container } = render(
      <KPICard
        label="Neutral Metric"
        value="50"
        tone="neutral"
      />,
    );
    expect(container.querySelector('[class*="bg-slate"]')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <KPICard
        label="Clickable"
        value="99"
        onClick={handleClick}
      />,
    );

    await user.click(container.firstChild);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders all content together', () => {
    render(
      <KPICard
        label="Open Backlog"
        value="221"
        tone="warning"
        trend="up"
        trendValue="↑ 5/wk"
        hint="Issues waiting for resolution"
        suffix=" tickets"
      />,
    );

    expect(screen.getByText('Open Backlog')).toBeInTheDocument();
    expect(screen.getByText(/221.*tickets/)).toBeInTheDocument();
    expect(screen.getByText('↑ 5/wk')).toBeInTheDocument();
    expect(screen.getByText('Issues waiting for resolution')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <KPICard
        label="Custom"
        value="10"
        className="custom-class"
      />,
    );

    expect(container.querySelector('[class*="custom-class"]')).toBeInTheDocument();
  });

  it('applies hover styling when clickable', () => {
    const { container } = render(
      <KPICard
        label="Hover Test"
        value="75"
        onClick={() => {}}
      />,
    );

    const card = container.firstChild;
    expect(card).toHaveClass('cursor-pointer');
  });
});
