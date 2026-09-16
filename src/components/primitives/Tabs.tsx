"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return <RadixTabs.List className={cn("flex gap-1.5", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "flex-1 text-xs py-1.5 border border-divider font-heading font-extrabold cursor-pointer",
        "data-[state=active]:bg-accent data-[state=active]:text-bg data-[state=active]:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = RadixTabs.Content;
