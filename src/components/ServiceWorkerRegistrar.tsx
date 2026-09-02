'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' &&
                navigator.serviceWorker.controller) {
              newSW.postMessage('skipWaiting');
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  return null;
}
