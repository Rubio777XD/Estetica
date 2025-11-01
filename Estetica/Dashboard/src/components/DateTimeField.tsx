import { forwardRef } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { cn } from './ui/utils';

interface DateTimeFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string | null;
}

export const DateTimeField = forwardRef<HTMLInputElement, DateTimeFieldProps>(
  ({ id, label, helperText, error, className, ...props }, ref) => {
    const describedBy = props['aria-describedby'] ??
      (helperText || error ? `${id ?? props.name ?? 'datetime-field'}-hint` : undefined);

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </Label>
        <Input
          ref={ref}
          id={id}
          type="datetime-local"
          inputMode="numeric"
          className={cn(error ? 'border-red-500 focus-visible:ring-red-500' : undefined, className)}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        <div id={describedBy} className="text-xs text-gray-500 space-y-1">
          <p>Horario local: America/Tijuana</p>
          {helperText ? <p>{helperText}</p> : null}
          {error ? <p className="text-red-500">{error}</p> : null}
        </div>
      </div>
    );
  }
);

DateTimeField.displayName = 'DateTimeField';
