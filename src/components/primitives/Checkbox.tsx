"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { cn } from "@/lib/cn";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm cursor-pointer", className)}>
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className={cn(
          "size-4 flex-none border",
          checked ? "bg-accent border-accent" : "border-divider",
        )}
      >
        <RadixCheckbox.Indicator className="flex items-center justify-center text-bg">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label}
    </label>
  );
}
