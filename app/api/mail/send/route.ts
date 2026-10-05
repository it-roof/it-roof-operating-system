import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { sendMail } from '@/lib/mail/send';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Addr = { name?: string | null; address: string };

function parseAddrs(raw: unknown): Addr[] {
  if (typeof raw === 'string') {
    return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean).map(address => ({ address }));
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map(a => {
      if (typeof a === 'string') return { address: a.trim() };
      if (a && typeof a === 'object' && typeof (a as Addr).address === 'string') {
        return { name: (a as Addr).name ?? null, address: (a as Addr).address.trim() };
      }
      return null;
    })
    .filter((a): a is Addr => Boolean(a?.address));
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const body = await req.json() as {
    mailbox_id?: string;
    to?: unknown;
    cc?: unknown;
    subject?: string;
    text?: string;
    in_reply_to?: string | null;
    references?: string | null;
    draft_id?: string | null;
  };
  if (!body.mailbox_id) {
    return NextResponse.json({ error: 'Postfach fehlt' }, { status: 400 });
  }
  try {
    const result = await sendMail({
      mailboxId: body.mailbox_id,
      userId: session.user.id,
      to: parseAddrs(body.to),
      cc: parseAddrs(body.cc),
      subject: body.subject?.trim() || '(Kein Betreff)',
      text: body.text ?? '',
      inReplyTo: body.in_reply_to,
      references: body.references,
      draftId: body.draft_id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Senden fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
