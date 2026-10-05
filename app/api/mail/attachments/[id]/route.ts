import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { getAttachment } from '@/lib/mail/queries';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const att = await getAttachment(id, session.user.id);
  if (!att?.contentBase64) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const buf = Buffer.from(att.contentBase64, 'base64');
  const filename = att.filename || 'anhang';
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': att.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'Content-Length': String(buf.length),
    },
  });
}
