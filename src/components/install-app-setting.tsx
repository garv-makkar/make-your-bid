'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppSetting() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setPrompt(((window as Window & { makeYourBidInstallPrompt?: InstallEvent }).makeYourBidInstallPrompt) || null);
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onReady = () => setPrompt(((window as Window & { makeYourBidInstallPrompt?: InstallEvent }).makeYourBidInstallPrompt) || null);
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('make-your-bid-install-ready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('make-your-bid-install-ready', onReady); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  async function install() {
    if (!prompt) { setShowHelp(true); return; }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    (window as Window & { makeYourBidInstallPrompt?: InstallEvent }).makeYourBidInstallPrompt = undefined;
    setPrompt(null);
  }

  return <section className="panel install-setting">
    <div><p className="eyebrow">INSTALL THE APP</p><h2>Use make your bid on your phone</h2><p>Add the website to your Home Screen for an app-like view. Local auctions saved on this device remain available offline after your first online visit. Sign-in, saved account events, and bidding rooms need internet.</p></div>
    {installed ? <span className="install-state">Installed on this device</span> : <button type="button" onClick={install}>{prompt ? 'Install app ↗' : 'How to install ↗'}</button>}
    {showHelp && !installed && <p className="install-help">{ios ? 'In Safari, tap Share, then Add to Home Screen.' : 'Open your browser menu and choose Install app or Add to Home screen. If the option is missing, visit this page over HTTPS and try again.'}</p>}
  </section>;
}
