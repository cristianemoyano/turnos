import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-9 px-2.5 py-1.5 text-sm text-text bg-surface border caret-accent",
        error ? "border-accent-600" : "border-divider hover:border-text/45",
        "focus-visible:border-accent focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full min-h-[90px] px-2.5 py-1.5 text-sm text-text bg-surface border resize-y",
      error ? "border-accent-600" : "border-divider hover:border-text/45",
      "focus-visible:border-accent focus-visible:outline-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
