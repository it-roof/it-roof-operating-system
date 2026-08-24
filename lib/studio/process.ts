import { db } from '@/lib/db';
import { studioAsset, studioJob } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import { STUDIO_KIND_META, type StudioJobKind } from './kinds';
import { parseJobOptions, studioConfig, studioReady } from './config';
import {
  createVideoTask,
  downloadUrl,
  extensionFor,
  generateImage,
  getVideoTask,
  isVideoSuccess,
  isVideoTerminal,
  videoUrlFromTask,
} from './byteplus';
import { reachableMediaUrl, saveBuffer, storageKey } from './storage';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let active = 0;
const waiters: Array<() => void> = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (active >= studioConfig.maxConcurrent) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiters.shift()?.();
  }
}

export async function processQueuedJobs(limit = studioConfig.maxConcurrent) {
  const queued = await db
    .select({ id: studioJob.id })
    .from(studioJob)
    .where(eq(studioJob.status, 'queued'))
    .limit(limit);

  await Promise.all(queued.map((row) => processJob(row.id)));
}

export async function processJob(id: string) {
  return withSlot(() => processJobInner(id));
}

async function processJobInner(id: string) {
  const [claimed] = await db
    .update(studioJob)
    .set({ status: 'running', updatedAt: new Date().toISOString(), error: null })
    .where(and(eq(studioJob.id, id), eq(studioJob.status, 'queued')))
    .returning();

  if (!claimed) return;

  await db.delete(studioAsset).where(eq(studioAsset.jobId, id));

  try {
    if (!studioReady()) {
      throw new Error('BYTEPLUS_API_KEY fehlt.');
    }

    const kind = claimed.kind as StudioJobKind;
    const media = STUDIO_KIND_META[kind].media;
    const variants = Math.min(8, Math.max(1, claimed.variantCount));
    const options = parseJobOptions(claimed.providerState);
    const referenceUrl = await referenceUrlFor(claimed.parentAssetId);

    if (kind === 'video_final' && claimed.parentAssetId && !referenceUrl) {
      throw new Error('Keine öffentlich erreichbare URL für das Referenzvideo. STUDIO_PUBLIC_BASE_URL setzen.');
    }

    for (let i = 0; i < variants; i++) {
      const seed = claimed.seed + i;
      if (kind === 'image') {
        await runImageVariant(claimed.id, kind, claimed.prompt, seed, i, referenceUrl, options.size);
      } else {
        await runVideoVariant(claimed.id, kind, claimed.prompt, seed, i, referenceUrl);
      }
    }

    await db
      .update(studioJob)
      .set({
        status: 'succeeded',
        actualCents: claimed.estimatedCents,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(studioJob.id, id));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    await db
      .update(studioJob)
      .set({ status: 'failed', error: message, updatedAt: new Date().toISOString() })
      .where(eq(studioJob.id, id));
  }
}

async function referenceUrlFor(parentAssetId: string | null) {
  if (!parentAssetId) return undefined;
  const [asset] = await db.select().from(studioAsset).where(eq(studioAsset.id, parentAssetId));
  if (!asset) return undefined;
  if (asset.storageKey) {
    const pub = reachableMediaUrl(asset.storageKey);
    if (pub) return pub;
  }
  return asset.originalUrl || undefined;
}

async function persistAsset(opts: {
  jobId: string;
  kind: StudioJobKind;
  variantIndex: number;
  seed: number;
  url: string;
}) {
  const { buf, mime } = await downloadUrl(opts.url);
  const ext = extensionFor(opts.kind, mime);
  const key = storageKey(opts.jobId, opts.variantIndex, ext);
  await saveBuffer(key, buf);
  await db.insert(studioAsset).values({
    jobId: opts.jobId,
    variantIndex: opts.variantIndex,
    seed: opts.seed,
    media: STUDIO_KIND_META[opts.kind].media,
    storageKey: key,
    originalUrl: opts.url,
    mime: mime || (STUDIO_KIND_META[opts.kind].media === 'video' ? 'video/mp4' : 'image/jpeg'),
  });
}

async function runImageVariant(
  jobId: string,
  kind: StudioJobKind,
  prompt: string,
  seed: number,
  index: number,
  referenceUrl?: string,
  size?: string,
) {
  const result = await generateImage({ prompt, seed, image: referenceUrl, size });
  await persistAsset({ jobId, kind, variantIndex: index, seed: result.seed, url: result.url });
}

async function runVideoVariant(
  jobId: string,
  kind: 'video_draft' | 'video_final',
  prompt: string,
  seed: number,
  index: number,
  referenceUrl?: string,
) {
  const taskId = await createVideoTask({ kind, prompt, seed, referenceUrl });
  const started = Date.now();
  while (Date.now() - started < 15 * 60 * 1000) {
    const task = await getVideoTask(taskId);
    if (isVideoSuccess(task.status)) {
      const url = videoUrlFromTask(task);
      if (!url) throw new Error('Video fertig, aber ohne Datei-URL.');
      await persistAsset({ jobId, kind, variantIndex: index, seed, url });
      return;
    }
    if (isVideoTerminal(task.status)) {
      throw new Error(task.error?.message || `Video-Task: ${task.status}`);
    }
    await sleep(8000);
  }
  throw new Error('Video-Task hat das Zeitlimit überschritten.');
}
