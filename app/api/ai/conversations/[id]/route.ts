import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiConversation, aiMessage, aiProvider } from '@/lib/schema';
import { asc, eq } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { writeAudit } from '@/lib/auth/audit';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const [conversation] = await db
    .select({
      id: aiConversation.id,
      title: aiConversation.title,
      providerId: aiConversation.providerId,
      providerName: aiProvider.name,
      createdAt: aiConversation.createdAt,
      updatedAt: aiConversation.updatedAt,
    })
    .from(aiConversation)
    .leftJoin(aiProvider, eq(aiConversation.providerId, aiProvider.id))
    .where(eq(aiConversation.id, id));

  if (!conversation) {
    return NextResponse.json({ error: 'Chat nicht gefunden.' }, { status: 404 });
  }

  const messages = await db
    .select({
      id: aiMessage.id,
      role: aiMessage.role,
      content: aiMessage.content,
      createdAt: aiMessage.createdAt,
    })
    .from(aiMessage)
    .where(eq(aiMessage.conversationId, id))
    .orderBy(asc(aiMessage.createdAt));

  return NextResponse.json({ ...conversation, messages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof aiConversation.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (body.title !== undefined) updates.title = String(body.title).trim() || 'Neuer Chat';
  if (body.provider_id !== undefined) updates.providerId = body.provider_id || null;

  await db.update(aiConversation).set(updates).where(eq(aiConversation.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  await db.delete(aiConversation).where(eq(aiConversation.id, id));
  await writeAudit({ action: 'ai_conversation.delete', resource: 'ai_conversation', resourceId: id });
  return NextResponse.json({ ok: true });
}
