import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'make your bid',
    short_name: 'make your bid',
    description: 'Run local auctions on your device or host an online bidding room.',
    start_url: '/local',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f7f1',
    theme_color: '#214b39',
    icons: [
      { src: '/pwa/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
