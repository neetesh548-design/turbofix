/**
 * FormInput component tests
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormInput } from '../components/FormInput';

describe('FormInput', () => {
  describe('label association', () => {
    it('associates the label with the control', () => {
      render(<FormInput label="Company Name" />);
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    });

    it('uses an explicit id when provided', () => {
      render(<FormInput id="company" label="Company Name" />);
      expect(screen.getByLabelText(/company name/i)).toHaveAttribute('id', 'company');
    });

    it('generates unique ids for multiple instances', () => {
      render(
        <>
          <FormInput label="First" />
          <FormInput label="Second" />
        </>
      );
      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');
      expect(first.id).not.toBe(second.id);
    });

    it('renders without a label', () => {
      render(<FormInput placeholder="No label here" />);
      expect(screen.getByPlaceholderText('No label here')).toBeInTheDocument();
    });
  });

  describe('types', () => {
    it.each([
      ['text'],
      ['email'],
      ['password'],
      ['number'],
      ['tel'],
    ])('renders a %s input', (type) => {
      render(<FormInput type={type} label="Field" />);
      const control = document.querySelector('[data-slot="input"]');
      expect(control).toHaveAttribute('type', type);
    });

    it('renders a textarea when type is textarea', () => {
      render(<FormInput type="textarea" label="Notes" />);
      const control = screen.getByLabelText('Notes');
      expect(control.tagName).toBe('TEXTAREA');
    });

    it('applies the rows prop to a textarea', () => {
      render(<FormInput type="textarea" label="Notes" rows={8} />);
      expect(screen.getByLabelText('Notes')).toHaveAttribute('rows', '8');
    });
  });

  describe('controlled value', () => {
    it('renders the provided value', () => {
      render(<FormInput label="Field" value="hello" onChange={() => {}} />);
      expect(screen.getByLabelText('Field')).toHaveValue('hello');
    });

    it('calls onChange as the user types', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FormInput label="Field" value="" onChange={onChange} />);

      await user.type(screen.getByLabelText('Field'), 'abc');
      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('error state', () => {
    it('renders the error message', () => {
      render(<FormInput label="Email" error="Email is invalid" />);
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
    });

    it('sets aria-invalid', () => {
      render(<FormInput label="Email" error="Email is invalid" />);
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    });

    it('links the error message via aria-describedby', () => {
      render(<FormInput label="Email" error="Email is invalid" />);
      const input = screen.getByLabelText('Email');
      const message = screen.getByTestId('form-input-message');
      expect(input).toHaveAttribute('aria-describedby', message.id);
    });

    it('exposes the error message to assistive tech via role=alert', () => {
      render(<FormInput label="Email" error="Email is invalid" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Email is invalid');
    });

    it('does not set aria-invalid when there is no error', () => {
      render(<FormInput label="Email" />);
      expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('success state', () => {
    it('renders the success message', () => {
      render(<FormInput label="Email" success="Looks good" />);
      expect(screen.getByText('Looks good')).toBeInTheDocument();
    });

    it('renders a success icon', () => {
      render(<FormInput label="Email" success="Looks good" />);
      expect(screen.getByTestId('form-input-success-icon')).toBeInTheDocument();
    });

    it('does not use role=alert for success', () => {
      render(<FormInput label="Email" success="Looks good" />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('lets an error take precedence over success', () => {
      render(<FormInput label="Email" error="Bad" success="Good" />);
      expect(screen.getByText('Bad')).toBeInTheDocument();
      expect(screen.queryByText('Good')).not.toBeInTheDocument();
    });
  });

  describe('helper text', () => {
    it('renders helper text when there is no error or success', () => {
      render(<FormInput label="Password" helperText="At least 8 characters" />);
      expect(screen.getByTestId('form-input-helper')).toHaveTextContent('At least 8 characters');
    });

    it('hides helper text when an error is present', () => {
      render(<FormInput label="Password" helperText="At least 8 characters" error="Too short" />);
      expect(screen.queryByTestId('form-input-helper')).not.toBeInTheDocument();
      expect(screen.getByText('Too short')).toBeInTheDocument();
    });

    it('hides helper text when a success message is present', () => {
      render(<FormInput label="Password" helperText="At least 8 characters" success="Strong" />);
      expect(screen.queryByTestId('form-input-helper')).not.toBeInTheDocument();
    });
  });

  describe('required and disabled', () => {
    it('marks the control required', () => {
      render(<FormInput label="Email" required />);
      expect(screen.getByLabelText(/email/i)).toBeRequired();
    });

    it('renders a required indicator hidden from assistive tech', () => {
      const { container } = render(<FormInput label="Email" required />);
      const star = container.querySelector('[aria-hidden="true"]');
      expect(star).toHaveTextContent('*');
    });

    it('disables the control', () => {
      render(<FormInput label="Email" disabled />);
      expect(screen.getByLabelText('Email')).toBeDisabled();
    });

    it('does not fire onChange while disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FormInput label="Email" disabled value="" onChange={onChange} />);

      await user.type(screen.getByLabelText('Email'), 'abc');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('styling hooks', () => {
    it('forwards a custom className to the control', () => {
      render(<FormInput label="Email" className="custom-class" />);
      expect(screen.getByLabelText('Email')).toHaveClass('custom-class');
    });

    it('uses semantic destructive token for the error border', () => {
      render(<FormInput label="Email" error="Bad" />);
      expect(screen.getByLabelText('Email').className).toContain('border-destructive');
    });

    it('uses semantic success token for the success border', () => {
      render(<FormInput label="Email" success="Good" />);
      expect(screen.getByLabelText('Email').className).toContain('border-success');
    });

    it('forwards arbitrary props such as placeholder and maxLength', () => {
      render(<FormInput label="Email" placeholder="you@example.com" maxLength={20} />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('placeholder', 'you@example.com');
      expect(input).toHaveAttribute('maxLength', '20');
    });
  });
});
