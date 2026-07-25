import * as React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

/**
 * FormInput — labelled form control with validation states.
 *
 * Wraps the existing `ui/input.jsx` primitive rather than restyling an input
 * from scratch, so focus rings, disabled styling and dark mode stay consistent
 * with the rest of the design system.
 *
 * Props:
 * - type (string): text | email | password | number | tel | url | textarea
 * - label (node): visible label, associated to the control via htmlFor/id
 * - value, onChange: standard controlled-input props
 * - error (string | boolean): renders the error message and sets aria-invalid
 * - success (string | boolean): renders the success message with a check icon
 * - helperText (node): hint shown when there is no error or success message
 * - id (string): optional; auto-generated when omitted
 * - rows (number): textarea only, defaults to 4
 *
 * All user-facing text arrives via props, so callers pass already-translated
 * strings and this component stays i18n-agnostic.
 *
 * `error` takes precedence over `success`, which takes precedence over
 * `helperText` — only one message renders at a time.
 */
export function FormInput({
  type = 'text',
  label,
  error,
  success,
  helperText,
  id,
  className,
  containerClassName,
  required,
  disabled,
  rows = 4,
  ...props
}) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;

  const hasError = Boolean(error);
  // An error always wins, so success styling never coexists with an error.
  const hasSuccess = Boolean(success) && !hasError;

  const message = hasError
    ? (typeof error === 'string' ? error : null)
    : hasSuccess
      ? (typeof success === 'string' ? success : null)
      : null;

  const describedBy = (message || helperText) ? messageId : undefined;

  const stateRing = hasError
    ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40'
    : hasSuccess
      ? 'border-success focus-visible:border-success focus-visible:ring-success/40'
      : undefined;

  const isTextarea = type === 'textarea';

  const controlProps = {
    id: inputId,
    'aria-invalid': hasError || undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    required,
    disabled,
    ...props,
  };

  return (
    <div className={cn('flex w-full flex-col gap-xs', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-body font-medium text-foreground',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {isTextarea ? (
          <textarea
            data-slot="input"
            rows={rows}
            className={cn(
              'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs',
              'transition-[color,box-shadow] outline-none placeholder:text-muted-foreground',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              'md:text-sm dark:bg-input/30',
              stateRing,
              hasSuccess && 'pr-9',
              className
            )}
            {...controlProps}
          />
        ) : (
          <Input
            type={type}
            className={cn(stateRing, hasSuccess && 'pr-9', className)}
            {...controlProps}
          />
        )}

        {hasSuccess && !isTextarea && (
          <CheckCircle2
            aria-hidden="true"
            data-testid="form-input-success-icon"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-success"
          />
        )}
      </div>

      {message ? (
        <p
          id={messageId}
          data-testid="form-input-message"
          role={hasError ? 'alert' : undefined}
          className={cn(
            'flex items-center gap-xs text-sm-body',
            hasError ? 'text-destructive' : 'text-success'
          )}
        >
          {hasError
            ? <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
            : <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />}
          {message}
        </p>
      ) : helperText ? (
        <p
          id={messageId}
          data-testid="form-input-helper"
          className="text-sm-body text-muted-foreground"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default FormInput;
