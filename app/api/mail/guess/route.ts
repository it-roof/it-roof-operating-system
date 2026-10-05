import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { guessMailHosts } from '@/lib/mail/guess-host';

export async function GET(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  const email = req.nextUrl.searchParams.get('email') ?? '';
  return NextResponse.json(guessMailHosts(email));
}
