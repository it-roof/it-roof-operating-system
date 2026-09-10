import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import authConfig from '@/auth.config';

const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = !!request.auth;

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isLogin = pathname === '/login' || pathname.startsWith('/login/');
  const isAsset =
    pathname.startsWith('/_next')
    || pathname.startsWith('/favicon')
    || pathname === '/manifest.webmanifest'
    || pathname === '/robots.txt'
    || /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/i.test(pathname);

  if (isAsset) {
    return NextResponse.next();
  }

  if (isLogin) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    const next = `${pathname}${request.nextUrl.search}`;
    if (next && next !== '/') login.searchParams.set('next', next);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
