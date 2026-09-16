import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="field flex flex-col gap-1">
      <label htmlFor={htmlFor} className="block text-xs text-text/70">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-text/50">{hint}</span>}
      {error && <span className="text-xs text-accent-700">{error}</span>}
    </div>
  );
}
