import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-0.5",
  {
    variants: {
      variant: {
        accent: "bg-accent-100 text-accent-800",
        accent2: "bg-accent2-100 text-accent2-800",
        neutral: "bg-neutral-100 text-neutral-800",
        outline: "border border-accent text-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
