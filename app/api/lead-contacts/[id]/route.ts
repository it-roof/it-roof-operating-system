import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { leadContact } from '@/lib/leads/schema';
import { emptyToNull, nowIso } from '@/lib/leads/http';
import { eq } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { writeAudit } from '@/lib/auth/audit';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.select().from(leadContact).where(eq(leadContact.id, id));
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof leadContact.$inferInsert> = { updatedAt: nowIso() };

  if (body.lead_id !== undefined || body.leadId !== undefined) {
    updates.leadId = String(body.lead_id ?? body.leadId);
  }
  if (body.salutation !== undefined) updates.salutation = emptyToNull(body.salutation);
  if (body.first_name !== undefined || body.firstName !== undefined) {
    updates.firstName = emptyToNull(body.first_name ?? body.firstName);
  }
  if (body.last_name !== undefined || body.lastName !== undefined) {
    updates.lastName = emptyToNull(body.last_name ?? body.lastName);
  }
  if (body.position !== undefined) updates.position = emptyToNull(body.position);
  if (body.email !== undefined) updates.email = emptyToNull(body.email);
  if (body.phone !== undefined) updates.phone = emptyToNull(body.phone);

  const db = getLeadsDb();
  const [row] = await db.update(leadContact).set(updates).where(eq(leadContact.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json({ ok: true, contact: row });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.delete(leadContact).where(eq(leadContact.id, id)).returning({ id: leadContact.id });
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  await writeAudit({ action: 'lead_contact.delete', resource: 'lead_contact', resourceId: id });
  return NextResponse.json({ ok: true });
}
