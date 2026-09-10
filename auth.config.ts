import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-sichere Auth-Config (für proxy.ts).
 * Credentials/DB bleiben in auth.ts.
 */
export default {
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname.startsWith('/api/auth')
        || pathname === '/login'
        || pathname.startsWith('/login/')
        || pathname.startsWith('/_next')
        || pathname.startsWith('/favicon')
        || pathname === '/manifest.webmanifest'
        || pathname === '/robots.txt'
        || /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/i.test(pathname)
      ) {
        return true;
      }
      return !!auth;
    },
  },
} satisfies NextAuthConfig;
