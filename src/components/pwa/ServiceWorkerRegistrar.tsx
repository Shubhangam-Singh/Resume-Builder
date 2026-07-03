"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker (public/sw.js). Production only —
 * caching dev-server assets would break hot reload. Registration failure is
 * non-fatal: the app simply works online-only, as before.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // e.g. private browsing modes that block service workers
    });
  }, []);
  return null;
}
