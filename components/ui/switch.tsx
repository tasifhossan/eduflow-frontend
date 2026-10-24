import * as React from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      id,
      checked: controlledChecked,
      defaultChecked = false,
      disabled = false,
      label,
      description,
      onChange,
      className,
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : internalChecked;
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const toggle = () => {
      if (disabled) return;
      const next = !isChecked;
      if (!isControlled) {
        setInternalChecked(next);
      }
      onChange?.(next);
    };

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={isChecked}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isChecked ? 'bg-primary' : 'bg-muted-foreground/30',
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
              isChecked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
        {(label || description) && (
          <div className="text-sm leading-tight">
            {label && (
              <label
                htmlFor={switchId}
                onClick={toggle}
                className={cn(
                  'font-medium text-foreground cursor-pointer select-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
