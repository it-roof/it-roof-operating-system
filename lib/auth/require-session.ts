import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export function unauthorized() {
  return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
}

/** Defense-in-Depth: Session-Check in API-Routen (zusätzlich zu proxy.ts). */
export async function requireSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}
