"use client";

import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";

/**
 * Bottom sheet — the dominant interaction pattern in the staff app
 * (slot actions, appointment/client detail, new-appointment wizard, edit forms).
 */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-neutral-900/55 z-40" />
        <RadixDialog.Content
          className="fixed left-0 right-0 bottom-0 z-50 max-h-[88%] overflow-auto bg-bg border-t-2 border-divider shadow-[var(--shadow-lg)] px-5 pt-2 pb-6 flex flex-col gap-3.5"
          aria-describedby={undefined}
        >
          <div className="flex justify-end pt-2">
            <RadixDialog.Close className="size-9 flex items-center justify-center text-accent cursor-pointer" aria-label="Cerrar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </RadixDialog.Close>
          </div>
          <RadixDialog.Title className="sr-only">Panel</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
