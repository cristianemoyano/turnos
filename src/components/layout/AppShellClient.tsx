"use client";

import type { ReactNode } from "react";
import { NotificationsProvider } from "./NotificationsContext";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

/** Client shell for authenticated app: notifications SSE + service worker. */
export function AppShellClient({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <ServiceWorkerRegister />
      {children}
    </NotificationsProvider>
  );
}
