import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { saveDraft } from '@/lib/mail/send';

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const body = await req.json() as {
    mailbox_id?: string;
    draft_id?: string | null;
    to?: string;
    cc?: string;
    subject?: string;
    text?: string;
    in_reply_to?: string | null;
    references?: string | null;
  };
  if (!body.mailbox_id) {
    return NextResponse.json({ error: 'Postfach fehlt' }, { status: 400 });
  }
  const to = (body.to ?? '').split(/[,;]/).map(s => s.trim()).filter(Boolean).map(address => ({ address }));
  const cc = (body.cc ?? '').split(/[,;]/).map(s => s.trim()).filter(Boolean).map(address => ({ address }));
  try {
    const row = await saveDraft({
      mailboxId: body.mailbox_id,
      userId: session.user.id,
      draftId: body.draft_id,
      to,
      cc,
      subject: body.subject ?? '',
      text: body.text ?? '',
      inReplyTo: body.in_reply_to,
      references: body.references,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Entwurf fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
