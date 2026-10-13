import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { SecretDecryptError } from '@/lib/crypto/secret-box';
import { sendMail } from '@/lib/mail/send';
import { getMailboxForUser } from '@/lib/mail/mailbox';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Programmatische HTML-Mail-API für Automationen
 * 
 * POST /api/mail/send-html
 * Body: {
 *   account_email: string  // E-Mail-Adresse des Kontos, von dem gesendet werden soll
 *   to: string | string[]  // Empfänger (E-Mail-Adresse oder Array)
 *   cc?: string | string[] // CC-Empfänger (optional)
 *   subject: string        // Betreff
 *   html: string           // HTML-Body (Signatur wird automatisch angehängt)
 * }
 * 
 * Authentifizierung: Session-Cookie (gleich wie normale App)
 */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  
  const body = await req.json() as {
    account_email?: string;
    to?: string | string[];
    cc?: string | string[];
    subject?: string;
    html?: string;
  };

  if (!body.account_email || !body.to || !body.subject || !body.html) {
    return NextResponse.json({ 
      error: 'account_email, to, subject und html sind erforderlich' 
    }, { status: 400 });
  }

  // Finde das Mailbox-Konto
  const { db } = await import('@/lib/db');
  const { mailbox } = await import('@/lib/schema');
  const { and, eq } = await import('drizzle-orm');
  
  const [box] = await db
    .select()
    .from(mailbox)
    .where(and(
      eq(mailbox.email, body.account_email.trim().toLowerCase()),
      eq(mailbox.userId, session.user.id)
    ))
    .limit(1);

  if (!box) {
    return NextResponse.json({ 
      error: `Konto ${body.account_email} nicht gefunden oder nicht autorisiert` 
    }, { status: 404 });
  }

  // Parse Empfänger
  const toAddrs = (Array.isArray(body.to) ? body.to : [body.to]).map(email => ({
    address: email.trim(),
    name: null,
  }));

  const ccAddrs = body.cc 
    ? (Array.isArray(body.cc) ? body.cc : [body.cc]).map(email => ({
        address: email.trim(),
        name: null,
      }))
    : [];

  try {
    const result = await sendMail({
      mailboxId: box.id,
      userId: session.user.id,
      to: toAddrs,
      cc: ccAddrs.length > 0 ? ccAddrs : undefined,
      subject: body.subject.trim(),
      text: body.html,
      isHtml: true,
      inReplyTo: null,
      references: null,
      draftId: null,
    });
    
    return NextResponse.json({ 
      ok: true, 
      message_id: result.messageId,
      sent_from: box.email,
      sent_to: toAddrs.map(a => a.address),
      sent_cc: ccAddrs.map(a => a.address),
    });
  } catch (err) {
    if (err instanceof SecretDecryptError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Senden fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
