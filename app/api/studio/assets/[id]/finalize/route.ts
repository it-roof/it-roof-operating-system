import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { studioAsset, studioJob } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { finalKindFor, type StudioJobKind } from '@/lib/studio/kinds';
import { estimatedCents, studioReady, studioMissingConfig, budgetCents } from '@/lib/studio/config';
import { monthCommittedCents } from '@/lib/studio/budget';
import { processJob } from '@/lib/studio/process';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = await db.query.studioAsset.findFirst({
    where: eq(studioAsset.id, id),
  });
  if (!asset) return NextResponse.json({ error: 'Ergebnis nicht gefunden.' }, { status: 404 });

  const [job] = await db.select().from(studioJob).where(eq(studioJob.id, asset.jobId));
  if (!job) return NextResponse.json({ error: 'Auftrag nicht gefunden.' }, { status: 404 });

  const nextKind = finalKindFor(job.kind as StudioJobKind);
  if (!nextKind) {
    return NextResponse.json({ error: 'Nur Video-Entwürfe können als Final nachgerendert werden.' }, { status: 400 });
  }
  if (!studioReady()) {
    return NextResponse.json(
      { error: 'Studio ist noch nicht angebunden.', missing: studioMissingConfig() },
      { status: 400 },
    );
  }

  const estimate = estimatedCents(nextKind, 1);
  const spent = await monthCommittedCents();
  if (estimate > 0 && spent + estimate > budgetCents()) {
    return NextResponse.json({ error: 'Budgetgrenze erreicht. Auftrag wurde nicht gestartet.' }, { status: 402 });
  }

  const [row] = await db
    .insert(studioJob)
    .values({
      kind: nextKind,
      prompt: job.prompt,
      seed: asset.seed,
      variantCount: 1,
      status: 'queued',
      estimatedCents: estimate,
      parentJobId: job.id,
      parentAssetId: asset.id,
    })
    .returning({ id: studioJob.id });

  after(() => processJob(row.id));
  return NextResponse.json({ id: row.id, seed: asset.seed, estimated_cents: estimate });
}
