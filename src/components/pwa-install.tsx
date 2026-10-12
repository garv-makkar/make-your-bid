'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (installed || dismissed || (!prompt && !ios)) return null;

  async function install() {
    if (showIosHelp) { setDismissed(true); return; }
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome === 'accepted') setDismissed(true);
    } else setShowIosHelp(true);
  }

  return <div className="pwa-install" role="note">
    <div><strong>Take your auctions with you</strong><span>{showIosHelp ? 'Tap Share in Safari, then Add to Home Screen.' : 'Install the app for local auctions on your phone.'}</span></div>
    <button type="button" onClick={install}>{showIosHelp ? 'Got it' : 'Install app'}</button>
    <button type="button" className="pwa-dismiss" aria-label="Dismiss install prompt" onClick={() => setDismissed(true)}>×</button>
  </div>;
}
