import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiProvider } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { maskApiKey } from '@/lib/ai';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { writeAudit } from '@/lib/auth/audit';

function toPublic(row: typeof aiProvider.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    model: row.model,
    enabled: row.enabled,
    hasKey: Boolean(row.apiKey?.trim()),
    apiKeyHint: maskApiKey(row.apiKey ?? ''),
    createdAt: row.createdAt,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof aiProvider.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.base_url !== undefined) updates.baseUrl = String(body.base_url).replace(/\/+$/, '');
  if (body.model !== undefined) updates.model = String(body.model).trim();
  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
  if (typeof body.api_key === 'string' && body.api_key.trim()) {
    updates.apiKey = body.api_key.trim();
  }

  const [row] = await db.update(aiProvider).set(updates).where(eq(aiProvider.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'Provider nicht gefunden.' }, { status: 404 });
  return NextResponse.json(toPublic(row));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  await db.delete(aiProvider).where(eq(aiProvider.id, id));
  await writeAudit({ action: 'ai_provider.delete', resource: 'ai_provider', resourceId: id });
  return NextResponse.json({ ok: true });
}
