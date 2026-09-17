"use client";

import { useEffect } from "react";

/** Registers `/sw.js` for Web Push. Renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore — push is optional */
    });
  }, []);
  return null;
}
