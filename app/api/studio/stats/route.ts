import { NextResponse } from 'next/server';
import { budgetCents, estimatedCents, studioConfig, studioMissingConfig, studioReady } from '@/lib/studio/config';
import { monthCommittedCents } from '@/lib/studio/budget';
import { STUDIO_JOB_KINDS, STUDIO_KIND_META } from '@/lib/studio/kinds';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET() {
  if (!(await requireSession())) return unauthorized();
  const spentCents = await monthCommittedCents();
  const kinds = Object.fromEntries(
    STUDIO_JOB_KINDS.map((kind) => [
      kind,
      {
        ...STUDIO_KIND_META[kind],
        estimated_cents: estimatedCents(kind, 1),
        model_set: Boolean(studioConfig.kinds[kind].model.trim()),
      },
    ]),
  );

  return NextResponse.json({
    ready: studioReady(),
    missing: studioMissingConfig(),
    spent_cents: spentCents,
    budget_cents: budgetCents(),
    public_base: Boolean(studioConfig.publicBaseUrl),
    month: new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    kinds,
  });
}
