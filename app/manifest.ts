import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cherry OS',
    short_name: 'Cherry OS',
    description: 'IT ROOF Operating System',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f6f2',
    theme_color: '#1a1a18',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
