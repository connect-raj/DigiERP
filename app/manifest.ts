import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DigiERP',
    short_name: 'DigiERP',
    description: 'Enterprise Resource Planning system for business operations',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#141313',
    theme_color: '#141313',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshot-narrow.png',
        sizes: '540x720',
        type: 'image/png',
        form_factor: 'narrow',
      },
      {
        src: '/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  };
}
