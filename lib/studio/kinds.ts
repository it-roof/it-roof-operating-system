export const STUDIO_JOB_KINDS = ['image', 'video_draft', 'video_final'] as const;

export type StudioJobKind = (typeof STUDIO_JOB_KINDS)[number];

export const STUDIO_KIND_META: Record<
  StudioJobKind,
  { label: string; media: 'image' | 'video'; tier: 'draft' | 'final' | 'single' }
> = {
  image: { label: 'Bild', media: 'image', tier: 'single' },
  video_draft: { label: 'Video-Entwurf', media: 'video', tier: 'draft' },
  video_final: { label: 'Video-Final', media: 'video', tier: 'final' },
};

export function finalKindFor(kind: StudioJobKind): StudioJobKind | null {
  if (kind === 'video_draft') return 'video_final';
  return null;
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function randomSeed() {
  return Math.floor(Math.random() * 2_147_483_647);
}
