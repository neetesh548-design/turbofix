import * as React from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Notification — a single presentational notification / toast.
 *
 * Deliberately *not* a provider. `NotificationCenter.jsx` already owns the
 * queue (`NotificationProvider` / `useNotification`); this component supplies
 * the token-styled markup for one notification, including the `warning` type
 * that the existing centre has no icon for. Use it standalone for inline
 * banners, or as the row renderer inside the existing centre.
 *
 * Props:
 * - type: 'success' | 'error' | 'warning' | 'info' (default 'info')
 * - title (node): optional bold heading
 * - message (node): body text
 * - onClose (fn): when provided, renders a dismiss button
 * - duration (number): ms before auto-dismiss; 0 or null disables (default 5000)
 * - closeLabel (string): accessible label for the dismiss button, for i18n
 *
 * Errors and warnings announce assertively via role="alert"; success and info
 * announce politely via role="status", so routine confirmations do not
 * interrupt a screen-reader user mid-sentence.
 */

const TYPE_STYLES = {
  success: {
    Icon: CheckCircle2,
    container: 'border-success/40 bg-success/10',
    icon: 'text-success',
  },
  error: {
    Icon: AlertCircle,
    container: 'border-danger/40 bg-danger/10',
    icon: 'text-danger',
  },
  warning: {
    Icon: AlertTriangle,
    container: 'border-warning/40 bg-warning/10',
    icon: 'text-warning',
  },
  info: {
    Icon: Info,
    container: 'border-info/40 bg-info/10',
    icon: 'text-info',
  },
};

export function Notification({
  type = 'info',
  title,
  message,
  onClose,
  duration = 5000,
  closeLabel = 'Close notification',
  className,
  ...props
}) {
  const styles = TYPE_STYLES[type] || TYPE_STYLES.info;
  const { Icon } = styles;

  // Keep the latest onClose without restarting the dismiss timer on each
  // render, which would otherwise keep a notification alive indefinitely when
  // the parent passes an inline arrow function.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!duration || duration <= 0) return undefined;
    if (!onCloseRef.current) return undefined;

    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const isUrgent = type === 'error' || type === 'warning';

  return (
    <div
      data-slot="notification"
      data-type={type}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto relative z-50 flex w-full max-w-sm items-start gap-md',
        'rounded-lg border p-lg shadow-lg backdrop-blur-sm',
        'text-body text-foreground',
        styles.container,
        className
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        data-testid="notification-icon"
        className={cn('mt-0.5 size-5 shrink-0', styles.icon)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        {title && (
          <p data-testid="notification-title" className="font-semibold">
            {title}
          </p>
        )}
        {message && (
          <p data-testid="notification-message" className="break-words">
            {message}
          </p>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          data-testid="notification-close"
          className={cn(
            'shrink-0 rounded-md p-1 text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}

export default Notification;
