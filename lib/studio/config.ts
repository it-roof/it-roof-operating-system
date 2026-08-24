import type { StudioJobKind } from './kinds';

/**
 * Einzige Config-Stelle. Werte aus docs/modelark-kontext.md (18.08.2026).
 * Was dort unter "Offen" steht, wird hier nicht stillschweigend ergänzt.
 *
 * Env:
 *   BYTEPLUS_API_KEY / ARK_API_KEY
 *   BYTEPLUS_BASE_URL
 *   STUDIO_OUTPUT_DIR
 *   STUDIO_PUBLIC_BASE_URL   öffentlich erreichbare Origin, sonst kein Video-Final
 *   STUDIO_MONTHLY_BUDGET_USD
 */
const USD_PER_M = {
  seedance20_480p: 7.0,
  seedance20_480p_videoIn: 4.3,
} as const;

const TOKENS_PER_SEC_480P = 9607;

function videoCents480p(seconds: number, usdPerMillion: number) {
  const tokens = TOKENS_PER_SEC_480P * seconds;
  return Math.round((tokens / 1_000_000) * usdPerMillion * 100);
}

export const studioConfig = {
  baseUrl: (process.env.BYTEPLUS_BASE_URL ?? 'https://ark.ap-southeast.bytepluses.com/api/v3').replace(/\/+$/, ''),
  apiKey: process.env.BYTEPLUS_API_KEY || process.env.ARK_API_KEY || '',
  monthlyBudgetUsd: Number(process.env.STUDIO_MONTHLY_BUDGET_USD ?? process.env.STUDIO_MONTHLY_BUDGET_EUR ?? 200),
  outputDir: process.env.STUDIO_OUTPUT_DIR ?? '',
  publicBaseUrl: (process.env.STUDIO_PUBLIC_BASE_URL ?? '').replace(/\/+$/, ''),
  maxConcurrent: 8,
  paths: {
    imageGenerations: '/images/generations',
    videoCreate: '/contents/generations',
    videoGet: '/contents/generations',
  },
  kinds: {
    image: {
      model: 'dola-seedream-5-0-pro-260628',
      estimatedCents: 5,
      size: '2K',
      watermark: true,
      stream: false,
    },
    video_draft: {
      model: 'dreamina-seedance-2-0-260128',
      estimatedCents: videoCents480p(5, USD_PER_M.seedance20_480p),
      seconds: 5,
    },
    video_final: {
      model: 'dreamina-seedance-2-0-260128',
      estimatedCents: videoCents480p(5, USD_PER_M.seedance20_480p_videoIn),
      seconds: 5,
    },
  } satisfies Record<StudioJobKind, { model: string; estimatedCents: number; seconds?: number; size?: string; watermark?: boolean; stream?: boolean }>,
};

export function kindConfig(kind: StudioJobKind) {
  return studioConfig.kinds[kind];
}

export function estimatedCents(kind: StudioJobKind, variants: number) {
  return kindConfig(kind).estimatedCents * variants;
}

export function budgetCents() {
  return Math.round(studioConfig.monthlyBudgetUsd * 100);
}

export function studioMissingConfig() {
  const missing: string[] = [];
  if (!studioConfig.apiKey.trim()) missing.push('BYTEPLUS_API_KEY');
  return missing;
}

export function studioReady() {
  return studioMissingConfig().length === 0;
}

export const STUDIO_IMAGE_SIZES = ['1K', '2K'] as const;
export type StudioImageSize = (typeof STUDIO_IMAGE_SIZES)[number];
export const DEFAULT_IMAGE_SIZE: StudioImageSize = '2K';

export function parseImageSize(value: unknown): StudioImageSize {
  return STUDIO_IMAGE_SIZES.includes(value as StudioImageSize)
    ? (value as StudioImageSize)
    : DEFAULT_IMAGE_SIZE;
}

type JobOptions = {
  size?: StudioImageSize;
};

export function parseJobOptions(raw: string | null | undefined): JobOptions {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const size = 'size' in parsed ? parseImageSize((parsed as JobOptions).size) : undefined;
    return size ? { size } : {};
  } catch {
    return {};
  }
}

/**
 * Video-Body. Endpunkte bestätigt; Feldnamen für Auflösung/Dauer/Seed/Referenz
 * stehen in der Doku unter Offen. Prompt-Suffix und Referenz-Item hier anpassen.
 */
export function buildVideoRequestBody(opts: {
  model: string;
  prompt: string;
  seconds: number;
  referenceUrl?: string;
}) {
  const text = `${opts.prompt.trim()}\n--resolution 480p --duration ${opts.seconds}`;
  const content: Record<string, unknown>[] = [{ type: 'text', text }];
  if (opts.referenceUrl) {
    content.push({ type: 'video_url', video_url: opts.referenceUrl });
  }
  return { model: opts.model, content };
}
