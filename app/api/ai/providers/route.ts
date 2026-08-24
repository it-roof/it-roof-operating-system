import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiProvider } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { maskApiKey } from '@/lib/ai';

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

export async function GET() {
  const rows = await db.select().from(aiProvider).orderBy(desc(aiProvider.createdAt));
  return NextResponse.json(rows.map(toPublic));
}

export async function POST(req: NextRequest) {
  const { name, base_url, api_key, model, enabled } = await req.json();
  if (!name?.trim() || !base_url?.trim() || !model?.trim()) {
    return NextResponse.json({ error: 'Name, Base-URL und Modell sind Pflicht.' }, { status: 400 });
  }

  const [row] = await db
    .insert(aiProvider)
    .values({
      name: name.trim(),
      baseUrl: String(base_url).replace(/\/+$/, ''),
      apiKey: (api_key ?? '').trim(),
      model: model.trim(),
      enabled: enabled ?? true,
    })
    .returning();

  return NextResponse.json(toPublic(row));
}
