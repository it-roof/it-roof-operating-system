import { studioConfig, buildVideoRequestBody } from './config';
import type { StudioJobKind } from './kinds';
import { STUDIO_KIND_META } from './kinds';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${studioConfig.apiKey}`,
  };
}

async function readError(res: Response) {
  const body = await res.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // keep raw
  }
  return body.slice(0, 500) || `BytePlus ${res.status}`;
}

export async function generateImage(opts: {
  prompt: string;
  seed: number;
  image?: string | string[];
  size?: string;
}) {
  const cfg = studioConfig.kinds.image;
  const body: Record<string, unknown> = {
    model: cfg.model,
    prompt: opts.prompt,
    response_format: 'url',
    size: opts.size ?? cfg.size ?? '2K',
    stream: cfg.stream ?? false,
    watermark: cfg.watermark ?? true,
  };
  if (opts.image) body.image = opts.image;

  const res = await fetch(`${studioConfig.baseUrl}${studioConfig.paths.imageGenerations}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as {
    data?: Array<{ url?: string; b64_json?: string; seed?: number }>;
    url?: string;
    id?: string;
  };
  const url = json.data?.[0]?.url || json.url;
  if (!url) throw new Error('Bild-Antwort ohne URL.');
  const seed = typeof json.data?.[0]?.seed === 'number' ? json.data[0].seed : opts.seed;
  return { url, seed };
}

export async function createVideoTask(opts: {
  kind: 'video_draft' | 'video_final';
  prompt: string;
  seed: number;
  referenceUrl?: string;
}) {
  const cfg = studioConfig.kinds[opts.kind];
  const body = buildVideoRequestBody({
    model: cfg.model,
    prompt: opts.prompt,
    seconds: cfg.seconds ?? 5,
    referenceUrl: opts.referenceUrl,
  });
  const res = await fetch(`${studioConfig.baseUrl}${studioConfig.paths.videoCreate}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error('Video-Task ohne ID.');
  return json.id;
}

export async function getVideoTask(taskId: string) {
  const res = await fetch(
    `${studioConfig.baseUrl}${studioConfig.paths.videoGet}/${taskId}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as {
    id?: string;
    status?: string;
    content?: { video_url?: string; videoUrl?: string };
    error?: { message?: string };
  };
}

export function videoUrlFromTask(task: Awaited<ReturnType<typeof getVideoTask>>) {
  return task.content?.video_url || task.content?.videoUrl || null;
}

export function isVideoTerminal(status?: string) {
  const s = (status ?? '').toLowerCase();
  return ['succeeded', 'success', 'failed', 'cancelled', 'canceled', 'expired'].includes(s);
}

export function isVideoSuccess(status?: string) {
  const s = (status ?? '').toLowerCase();
  return s === 'succeeded' || s === 'success';
}

export async function downloadUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') || '';
  return { buf, mime };
}

export function extensionFor(kind: StudioJobKind, mime: string) {
  const media = STUDIO_KIND_META[kind].media;
  if (media === 'video') return 'mp4';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}
