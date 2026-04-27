'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development, do NOT register the service worker. Next.js dev uses
    // hashed chunk URLs that change every rebuild — a cached shell would
    // reference stale chunks and break hydration. Also actively unregister
    // any SW left over from a previous prod build / earlier dev run.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration is best-effort — fail silently
    });
  }, []);

  return null;
}
