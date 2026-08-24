import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { studioJob } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { STUDIO_JOB_KINDS, randomSeed, type StudioJobKind } from '@/lib/studio/kinds';
import {
  budgetCents,
  estimatedCents,
  parseImageSize,
  studioMissingConfig,
  studioReady,
} from '@/lib/studio/config';
import { monthCommittedCents } from '@/lib/studio/budget';
import { processJob, processQueuedJobs } from '@/lib/studio/process';

export async function GET() {
  const rows = await db.query.studioJob.findMany({
    orderBy: [desc(studioJob.createdAt)],
    limit: 80,
    with: { assets: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const kind = body.kind as StudioJobKind;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const variantCount = Math.min(8, Math.max(1, Number(body.variant_count) || 1));
  const seedInput = body.seed;
  const seed =
    seedInput === '' || seedInput === null || seedInput === undefined || Number.isNaN(Number(seedInput))
      ? randomSeed()
      : Math.trunc(Number(seedInput));

  if (!STUDIO_JOB_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Ungültige Auftragsart.' }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt fehlt.' }, { status: 400 });
  }

  const estimate = estimatedCents(kind, variantCount);
  const spent = await monthCommittedCents();
  const budget = budgetCents();
  if (estimate > 0 && spent + estimate > budget) {
    return NextResponse.json(
      { error: 'Budgetgrenze erreicht. Auftrag wurde nicht gestartet.' },
      { status: 402 },
    );
  }

  if (!studioReady()) {
    return NextResponse.json(
      { error: 'Studio ist noch nicht angebunden.', missing: studioMissingConfig() },
      { status: 400 },
    );
  }

  const size = kind === 'image' ? parseImageSize(body.size) : undefined;

  const [row] = await db
    .insert(studioJob)
    .values({
      kind,
      prompt,
      seed,
      variantCount,
      status: 'queued',
      estimatedCents: estimate,
      parentJobId: body.parent_job_id ?? null,
      parentAssetId: body.parent_asset_id ?? null,
      providerState: size ? JSON.stringify({ size }) : null,
    })
    .returning({ id: studioJob.id });

  after(() => processJob(row.id).then(() => processQueuedJobs()));

  return NextResponse.json({ id: row.id, seed, estimated_cents: estimate });
}
