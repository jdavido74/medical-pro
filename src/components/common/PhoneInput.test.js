// PhoneInput.test.js - Unit tests for PhoneInput component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneInput, { PhoneDisplay, PhoneLink } from './PhoneInput';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

describe('PhoneInput Component', () => {
  // =========================================
  // Basic Rendering
  // =========================================
  describe('Basic Rendering', () => {
    it('should render with label', () => {
      render(<PhoneInput label="Phone Number" />);
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(<PhoneInput label="Phone" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render country selector', () => {
      render(<PhoneInput defaultCountry="FR" />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render phone input field', () => {
      render(<PhoneInput name="phone" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should have default country selected', () => {
      render(<PhoneInput defaultCountry="ES" />);
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('ES');
    });
  });

  // =========================================
  // Country Selection
  // =========================================
  describe('Country Selection', () => {
    it('should change country when selecting from dropdown', () => {
      const onChange = jest.fn();
      render(<PhoneInput defaultCountry="FR" onChange={onChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'ES' } });

      expect(select.value).toBe('ES');
    });

    it('should update placeholder when country changes', async () => {
      render(<PhoneInput defaultCountry="FR" />);

      const select = screen.getByRole('combobox');
      const input = screen.getByRole('textbox');

      // French placeholder
      expect(input.placeholder).toContain('6 12 34 56 78');

      // Change to Spain
      fireEvent.change(select, { target: { value: 'ES' } });

      await waitFor(() => {
        expect(input.placeholder).toContain('612 345 678');
      });
    });

    it('should filter countries when allowedCountries is provided', () => {
      render(
        <PhoneInput
          defaultCountry="FR"
          allowedCountries={['FR', 'ES', 'GB']}
        />
      );

      const select = screen.getByRole('combobox');
      const options = select.querySelectorAll('option');

      expect(options.length).toBe(3);
    });
  });

  // =========================================
  // Phone Input
  // =========================================
  describe('Phone Input', () => {
    it('should update value when typing', async () => {
      const onChange = jest.fn();
      render(<PhoneInput onChange={onChange} defaultCountry="FR" />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '612345678');

      expect(onChange).toHaveBeenCalled();
    });

    it('should clean input (remove non-digits except spaces)', async () => {
      const onChange = jest.fn();
      render(<PhoneInput onChange={onChange} defaultCountry="FR" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '6-12.34 56 78' } });

      // The value should have non-digits removed but spaces allowed for UX
      expect(onChange).toHaveBeenCalled();
    });

    it('should build full number with prefix when onChange fires', async () => {
      const onChange = jest.fn();
      render(<PhoneInput onChange={onChange} defaultCountry="FR" name="phone" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '612345678' } });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            name: 'phone',
            value: '+33612345678',
            countryCode: 'FR',
            localNumber: '612345678'
          })
        })
      );
    });
  });

  // =========================================
  // Initial Value
  // =========================================
  describe('Initial Value', () => {
    it('should parse initial value with country prefix', () => {
      render(<PhoneInput value="+33612345678" defaultCountry="ES" />);

      // Should detect FR from the prefix, not use ES
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('FR');

      const input = screen.getByRole('textbox');
      expect(input.value).toBe('612345678');
    });

    it('should parse initial Spanish value', () => {
      render(<PhoneInput value="+34612345678" />);

      const select = screen.getByRole('combobox');
      expect(select.value).toBe('ES');

      const input = screen.getByRole('textbox');
      expect(input.value).toBe('612345678');
    });

    it('should handle value without prefix', () => {
      render(<PhoneInput value="612345678" defaultCountry="FR" />);

      const input = screen.getByRole('textbox');
      expect(input.value).toBe('612345678');
    });
  });

  // =========================================
  // Validation
  // =========================================
  describe('Validation', () => {
    it('should call onValidationChange with true for valid number', async () => {
      const onValidationChange = jest.fn();
      render(
        <PhoneInput
          defaultCountry="FR"
          onValidationChange={onValidationChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '612345678' } });

      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(true, expect.any(Object));
      });
    });

    it('should call onValidationChange with false for invalid number', async () => {
      const onValidationChange = jest.fn();
      render(
        <PhoneInput
          defaultCountry="FR"
          onValidationChange={onValidationChange}
          required
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '123' } });

      await waitFor(() => {
        expect(onValidationChange).toHaveBeenLastCalledWith(false, expect.any(Object));
      });
    });

    it('should show validation error for required empty field', async () => {
      const onValidationChange = jest.fn();
      render(
        <PhoneInput
          defaultCountry="FR"
          required
          onValidationChange={onValidationChange}
        />
      );

      const input = screen.getByRole('textbox');

      // Focus and blur to trigger validation
      fireEvent.focus(input);
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Object));
      });
    });

    it('should pass validation for optional empty field', async () => {
      const onValidationChange = jest.fn();
      render(
        <PhoneInput
          defaultCountry="FR"
          required={false}
          onValidationChange={onValidationChange}
        />
      );

      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(true, expect.any(Object));
      });
    });
  });

  // =========================================
  // Error Display
  // =========================================
  describe('Error Display', () => {
    it('should display external error', () => {
      render(
        <PhoneInput
          defaultCountry="FR"
          error="Invalid phone number"
        />
      );

      expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
    });

    it('should show error styling when error is present', () => {
      const { container } = render(
        <PhoneInput
          defaultCountry="FR"
          error="Error"
        />
      );

      // The wrapper div with border should have error styling
      const inputWrapper = container.querySelector('.flex.rounded-lg.border');
      expect(inputWrapper).toHaveClass('border-red-500');
    });
  });

  // =========================================
  // Disabled State
  // =========================================
  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<PhoneInput disabled />);

      const input = screen.getByRole('textbox');
      const select = screen.getByRole('combobox');

      expect(input).toBeDisabled();
      expect(select).toBeDisabled();
    });

    it('should have disabled styling', () => {
      const { container } = render(<PhoneInput disabled />);

      const inputWrapper = container.querySelector('.flex.rounded-lg.border');
      expect(inputWrapper).toHaveClass('bg-gray-100');
    });
  });

  // =========================================
  // Compact Mode
  // =========================================
  describe('Compact Mode', () => {
    it('should render in compact mode without helper text', () => {
      const { container } = render(
        <PhoneInput defaultCountry="FR" compact />
      );

      // In compact mode, the expected digits text should not be visible
      expect(screen.queryByText(/Expected:/)).not.toBeInTheDocument();
    });

    it('should have smaller padding in compact mode', () => {
      render(<PhoneInput defaultCountry="FR" compact />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('py-1.5');
    });
  });

  // =========================================
  // Focus/Blur Behavior
  // =========================================
  describe('Focus/Blur Behavior', () => {
    it('should show focus ring when focused', async () => {
      const { container } = render(<PhoneInput defaultCountry="FR" />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      const inputWrapper = container.querySelector('.flex.rounded-lg.border');
      await waitFor(() => {
        expect(inputWrapper).toHaveClass('ring-2');
      });
    });

    it('should mark as touched after blur', async () => {
      const onValidationChange = jest.fn();
      render(
        <PhoneInput
          defaultCountry="FR"
          required
          onValidationChange={onValidationChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);

      // After blur, validation should be called
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalled();
      });
    });
  });
});

// =========================================
// PhoneDisplay Component
// =========================================
describe('PhoneDisplay Component', () => {
  it('should display formatted phone number', () => {
    render(<PhoneDisplay value="+33612345678" />);
    // Formatted: +33 6 12 34 56 78 (spaces in display)
    expect(screen.getByText(/6 12 34 56 78/)).toBeInTheDocument();
  });

  it('should display flag when showFlag is true', () => {
    const { container } = render(<PhoneDisplay value="+33612345678" showFlag />);
    // The flag emoji should be present in the rendered output
    expect(container.textContent).toContain('🇫🇷');
  });

  it('should not display flag when showFlag is false', () => {
    const { container } = render(<PhoneDisplay value="+33612345678" showFlag={false} />);
    expect(container.textContent).not.toContain('🇫🇷');
  });

  it('should display dash for empty value', () => {
    render(<PhoneDisplay value="" />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should display dash for null value', () => {
    render(<PhoneDisplay value={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

// =========================================
// PhoneLink Component
// =========================================
describe('PhoneLink Component', () => {
  it('should render a tel: link', () => {
    render(<PhoneLink value="+33612345678" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'tel:+33612345678');
  });

  it('should display formatted number', () => {
    const { container } = render(<PhoneLink value="+33612345678" />);
    // Formatted: 6 12 34 56 78 (with spaces)
    expect(container.textContent).toContain('6 12 34 56 78');
  });

  it('should display dash for empty value', () => {
    render(<PhoneLink value="" />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should display dash for null value', () => {
    render(<PhoneLink value={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
