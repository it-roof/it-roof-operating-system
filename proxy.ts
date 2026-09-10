import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import authConfig from '@/auth.config';

const { auth } = NextAuth(authConfig);

const NO_INDEX =
  'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate';

function withNoIndex(response: NextResponse) {
  response.headers.set('X-Robots-Tag', NO_INDEX);
  return response;
}

function nextWithNoIndex() {
  return withNoIndex(NextResponse.next());
}

export const proxy = auth((request: NextRequest & { auth: unknown }) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = !!request.auth;

  if (pathname.startsWith('/api/auth')) {
    return nextWithNoIndex();
  }

  const isLogin = pathname === '/login' || pathname.startsWith('/login/');
  const isAsset =
    pathname.startsWith('/_next')
    || pathname.startsWith('/favicon')
    || pathname === '/manifest.webmanifest'
    || pathname === '/robots.txt'
    || /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/i.test(pathname);

  if (isAsset) {
    return nextWithNoIndex();
  }

  if (isLogin) {
    if (isLoggedIn) {
      return withNoIndex(NextResponse.redirect(new URL('/', request.url)));
    }
    return nextWithNoIndex();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return withNoIndex(
        NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 }),
      );
    }
    const login = new URL('/login', request.url);
    const next = `${pathname}${request.nextUrl.search}`;
    if (next && next !== '/') login.searchParams.set('next', next);
    return withNoIndex(NextResponse.redirect(login));
  }

  return nextWithNoIndex();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
