/**
 * Notification component tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Notification } from '../components/Notification';

describe('Notification', () => {
  describe('rendering', () => {
    it('renders the message', () => {
      render(<Notification message="Saved successfully" />);
      expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    });

    it('renders an optional title', () => {
      render(<Notification title="Heads up" message="Disk almost full" />);
      expect(screen.getByTestId('notification-title')).toHaveTextContent('Heads up');
    });

    it('renders without a title', () => {
      render(<Notification message="Body only" />);
      expect(screen.queryByTestId('notification-title')).not.toBeInTheDocument();
    });

    it('renders an icon for every type', () => {
      render(<Notification type="success" message="ok" />);
      expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
    });
  });

  describe('types', () => {
    it.each([
      ['success'],
      ['error'],
      ['warning'],
      ['info'],
    ])('exposes the %s type via a data attribute', (type) => {
      render(<Notification type={type} message="msg" />);
      expect(screen.getByTestId('notification-icon').parentElement)
        .toHaveAttribute('data-type', type);
    });

    it('defaults to info', () => {
      render(<Notification message="msg" />);
      expect(screen.getByRole('status')).toHaveAttribute('data-type', 'info');
    });

    it('falls back to info styling for an unknown type', () => {
      render(<Notification type="nonsense" message="msg" />);
      expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
    });

    it('uses the semantic warning token', () => {
      render(<Notification type="warning" message="msg" />);
      expect(screen.getByRole('alert').className).toContain('border-warning');
    });

    it('uses the semantic danger token for errors', () => {
      render(<Notification type="error" message="msg" />);
      expect(screen.getByRole('alert').className).toContain('border-danger');
    });
  });

  describe('accessibility', () => {
    it('announces errors assertively', () => {
      render(<Notification type="error" message="Boom" />);
      const el = screen.getByRole('alert');
      expect(el).toHaveAttribute('aria-live', 'assertive');
    });

    it('announces warnings assertively', () => {
      render(<Notification type="warning" message="Careful" />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('announces success politely', () => {
      render(<Notification type="success" message="Done" />);
      const el = screen.getByRole('status');
      expect(el).toHaveAttribute('aria-live', 'polite');
    });

    it('gives the close button an accessible name', () => {
      render(<Notification message="msg" onClose={() => {}} />);
      expect(screen.getByRole('button', { name: 'Close notification' })).toBeInTheDocument();
    });

    it('allows the close label to be translated', () => {
      render(<Notification message="msg" onClose={() => {}} closeLabel="Cerrar" />);
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('is hidden when no onClose is supplied', () => {
      render(<Notification message="msg" />);
      expect(screen.queryByTestId('notification-close')).not.toBeInTheDocument();
    });

    it('calls onClose when clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Notification message="msg" onClose={onClose} duration={0} />);

      await user.click(screen.getByTestId('notification-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls onClose after the default duration', () => {
      const onClose = vi.fn();
      render(<Notification message="msg" onClose={onClose} />);

      expect(onClose).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(5000); });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('honours a custom duration', () => {
      const onClose = vi.fn();
      render(<Notification message="msg" onClose={onClose} duration={1000} />);

      act(() => { vi.advanceTimersByTime(999); });
      expect(onClose).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1); });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not auto-dismiss when duration is 0', () => {
      const onClose = vi.fn();
      render(<Notification message="msg" onClose={onClose} duration={0} />);

      act(() => { vi.advanceTimersByTime(60000); });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not auto-dismiss when duration is null', () => {
      const onClose = vi.fn();
      render(<Notification message="msg" onClose={onClose} duration={null} />);

      act(() => { vi.advanceTimersByTime(60000); });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('clears the timer on unmount', () => {
      const onClose = vi.fn();
      const { unmount } = render(<Notification message="msg" onClose={onClose} />);

      unmount();
      act(() => { vi.advanceTimersByTime(10000); });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not restart the timer when an inline onClose changes identity', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <Notification message="msg" onClose={() => onClose()} duration={1000} />
      );

      act(() => { vi.advanceTimersByTime(600); });
      // A new inline arrow on re-render must not reset the countdown.
      rerender(<Notification message="msg" onClose={() => onClose()} duration={1000} />);
      act(() => { vi.advanceTimersByTime(400); });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling hooks', () => {
    it('forwards a custom className', () => {
      render(<Notification message="msg" className="custom-toast" />);
      expect(screen.getByRole('status')).toHaveClass('custom-toast');
    });

    it('sets a stacking context so toasts render above page content', () => {
      render(<Notification message="msg" />);
      expect(screen.getByRole('status').className).toContain('z-50');
    });
  });
});
