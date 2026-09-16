import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  elevated,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 bg-surface",
        elevated && "shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardKicker({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] tracking-[0.1em] uppercase text-accent">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="font-heading font-extrabold text-[17px] leading-tight">{children}</div>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[13px] opacity-80 flex-1">{children}</p>;
}
