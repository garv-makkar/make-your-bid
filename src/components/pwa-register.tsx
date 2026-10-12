'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (event: Event) => {
      event.preventDefault();
      (window as Window & { makeYourBidInstallPrompt?: Event }).makeYourBidInstallPrompt = event;
      window.dispatchEvent(new Event('make-your-bid-install-ready'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  return null;
}
