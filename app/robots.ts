import type { MetadataRoute } from 'next';

/** Interne HQ-App — nicht crawlen / nicht indexieren. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
