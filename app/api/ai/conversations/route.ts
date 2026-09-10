import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiConversation, aiProvider } from '@/lib/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET() {
  if (!(await requireSession())) return unauthorized();
  const rows = await db
    .select({
      id: aiConversation.id,
      title: aiConversation.title,
      providerId: aiConversation.providerId,
      providerName: aiProvider.name,
      createdAt: aiConversation.createdAt,
      updatedAt: aiConversation.updatedAt,
      preview: sql<string | null>`(
        select content from ai_message
        where conversation_id = ${aiConversation.id}
        order by created_at desc
        limit 1
      )`,
    })
    .from(aiConversation)
    .leftJoin(aiProvider, eq(aiConversation.providerId, aiProvider.id))
    .orderBy(desc(aiConversation.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const providerId = body.provider_id ?? null;

  const [row] = await db
    .insert(aiConversation)
    .values({
      title: 'Neuer Chat',
      providerId,
    })
    .returning({ id: aiConversation.id });

  return NextResponse.json({ id: row.id });
}
