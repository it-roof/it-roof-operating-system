export const CAMPAIGN_STEP_TYPES = [
  { value: 'email', label: 'E-Mail senden', shortLabel: 'Email', usesTemplate: true, usesSubject: true },
  { value: 'email_reminder', label: 'E-Mail-Reminder', shortLabel: 'Reminder', usesTemplate: true, usesSubject: true },
  { value: 'letter', label: 'Brief schicken', shortLabel: 'Brief', usesTemplate: true, usesSubject: false },
  { value: 'call', label: 'Anrufen', shortLabel: 'Anruf', usesTemplate: false, usesSubject: false },
  { value: 'linkedin', label: 'LinkedIn', shortLabel: 'LinkedIn', usesTemplate: true, usesSubject: false },
  { value: 'wait', label: 'Nur warten', shortLabel: 'Pause', usesTemplate: false, usesSubject: false },
] as const;

export type CampaignStepType = (typeof CAMPAIGN_STEP_TYPES)[number]['value'];

export const CAMPAIGN_STEP_TYPE_VALUES = CAMPAIGN_STEP_TYPES.map((t) => t.value);

export function isCampaignStepType(value: string): value is CampaignStepType {
  return (CAMPAIGN_STEP_TYPE_VALUES as readonly string[]).includes(value);
}

export function campaignStepMeta(type: string) {
  return (
    CAMPAIGN_STEP_TYPES.find((t) => t.value === type) ?? {
      value: type,
      label: type,
      shortLabel: type,
      usesTemplate: false,
      usesSubject: false,
    }
  );
}

export function campaignFlowLabel(types: string[]) {
  if (types.length === 0) return 'Noch kein Ablauf';
  if (types.length === 1) return '1 Schritt';
  return types.map((t) => campaignStepMeta(t).shortLabel).join(' → ');
}

export function normalizeCampaignStepType(type: string): CampaignStepType {
  return isCampaignStepType(type) ? type : 'email';
}

export function delayLabel(days: number) {
  if (days <= 0) return 'sofort';
  if (days === 1) return 'nach 1 Tag';
  return `nach ${days} Tagen`;
}

export function stepUsesTemplate(type: string) {
  return campaignStepMeta(type).usesTemplate;
}

export function stepUsesSubject(type: string) {
  return campaignStepMeta(type).usesSubject;
}

/** Vollständige Vorlage: E-Mail = Betreff + Text, sonst Text. */
export function stepTemplateStatus(
  type: string,
  subject: string | null | undefined,
  body: string | null | undefined,
): 'none' | 'partial' | 'complete' {
  if (!stepUsesTemplate(type)) return 'none';
  const hasSubject = !!(subject?.trim());
  const hasBody = !!(body?.trim());
  if (stepUsesSubject(type)) {
    if (hasSubject && hasBody) return 'complete';
    if (hasSubject || hasBody) return 'partial';
    return 'none';
  }
  return hasBody ? 'complete' : 'none';
}

/** Platzhalter-Hinweis fürs UI (kanonisch groß) */
export {
  TEMPLATE_PLACEHOLDER_TOKENS,
  TEMPLATE_VAR_KEYS,
  placeholderToken,
} from '@/lib/leads/template';

/** @deprecated nutze TEMPLATE_PLACEHOLDER_TOKENS */
export const TEMPLATE_PLACEHOLDERS = [
  '{{FIRMA}}',
  '{{ANREDE}}',
  '{{BRIEFANREDE}}',
  '{{VORNAME}}',
  '{{NACHNAME}}',
  '{{POSITION}}',
  '{{EMAIL}}',
  '{{TELEFON}}',
  '{{STADT}}',
].join(' ');
