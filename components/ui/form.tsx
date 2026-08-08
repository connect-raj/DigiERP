import { cn } from '@/lib/utils';

const controlBase =
  'bg-surface-container-low border-border text-on-surface placeholder:text-on-surface-variant w-full rounded-lg border text-sm transition-colors focus:border-ring focus:outline-none aria-invalid:border-status-error aria-invalid:focus:border-status-error';

export function FieldLabel({
  children,
  required,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-on-surface-variant mb-1.5 block text-xs font-medium', className)}
    >
      {children}
      {required && <span className="text-status-error"> *</span>}
    </label>
  );
}

export function TextInput({
  className,
  invalid,
  ...props
}: React.ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-9 px-3', className)}
      {...props}
    />
  );
}

export function TextArea({
  className,
  invalid,
  ...props
}: React.ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'min-h-20 px-3 py-2', className)}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  invalid,
  ...props
}: React.ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-9 cursor-pointer px-3', className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-status-error mt-1 text-xs">{children}</p>;
}

/** Label + control + error, in the standard vertical layout. */
export function FormField({
  label,
  required,
  error,
  htmlFor,
  className,
  children,
}: {
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <FieldLabel required={required} htmlFor={htmlFor}>
          {label}
        </FieldLabel>
      )}
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Standard banner for a form-level submit error. */
export function SubmitError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="border-status-error/30 bg-status-error/10 text-status-error flex items-start gap-3 rounded-lg border p-3">
      <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
      <p className="text-sm">{children}</p>
    </div>
  );
}
