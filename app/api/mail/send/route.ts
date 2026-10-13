import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { SecretDecryptError } from '@/lib/crypto/secret-box';
import { sendMail } from '@/lib/mail/send';
import { parseAddressField } from '@/lib/mail/thread';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const body = await req.json() as {
    mailbox_id?: string;
    to?: unknown;
    cc?: unknown;
    subject?: string;
    text?: string;
    is_html?: boolean;
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
      to: parseAddressField(body.to),
      cc: parseAddressField(body.cc),
      subject: body.subject?.trim() || '(Kein Betreff)',
      text: body.text ?? '',
      isHtml: body.is_html ?? false,
      inReplyTo: body.in_reply_to,
      references: body.references,
      draftId: body.draft_id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SecretDecryptError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Senden fehlgeschlagen';
    // Crypto-GCM-Rohfehler (falls woanders durchgereicht)
    if (/authenticate data|unsupported state/i.test(message)) {
      return NextResponse.json({
        error: 'Postfach-Passwort konnte nicht entschlüsselt werden. Unter Mail → Konten Passwort neu speichern.',
      }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
