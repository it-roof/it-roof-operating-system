export type TemplateLead = {
  companyName: string;
  city: string | null;
  phone: string | null;
};

export type TemplateContact = {
  salutation: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
} | null;

export const TEMPLATE_VAR_KEYS = [
  'firma',
  'anrede',
  'briefanrede',
  'vorname',
  'nachname',
  'position',
  'email',
  'telefon',
  'stadt',
] as const;

export type TemplateVarKey = (typeof TEMPLATE_VAR_KEYS)[number];

/** Kanonische Schreibweise in Vorlagen: {{FIRMA}} */
export function placeholderToken(key: string) {
  return `{{${key.toUpperCase()}}}`;
}

export const TEMPLATE_PLACEHOLDER_TOKENS = TEMPLATE_VAR_KEYS.map(placeholderToken);

function val(v: string | null | undefined) {
  return (v ?? '').trim();
}

/** Frau / Herr → formelle Briefanrede; sonst neutraler Fallback. */
export function buildBriefanrede(salutation: string | null | undefined) {
  const s = val(salutation).toLowerCase();
  if (
    s === 'frau'
    || s === 'fr.'
    || s === 'fr'
    || s === 'mrs'
    || s === 'mrs.'
    || s === 'ms'
    || s === 'ms.'
  ) {
    return 'Sehr geehrte Frau';
  }
  if (
    s === 'herr'
    || s === 'hr.'
    || s === 'hr'
    || s === 'herrn'
    || s === 'mr'
    || s === 'mr.'
  ) {
    return 'Sehr geehrter Herr';
  }
  return 'Sehr geehrte Damen und Herren';
}

export function buildTemplateVars(lead: TemplateLead, contact: TemplateContact) {
  const anrede = val(contact?.salutation);
  return {
    firma: val(lead.companyName),
    anrede,
    briefanrede: buildBriefanrede(anrede),
    vorname: val(contact?.firstName),
    nachname: val(contact?.lastName),
    position: val(contact?.position),
    email: val(contact?.email),
    telefon: val(contact?.phone) || val(lead.phone),
    stadt: val(lead.city),
  };
}

/** Ersetzt {{FIRMA}} / {{firma}} / {{Firma}} — case-insensitive. */
export function renderTemplate(
  template: string | null | undefined,
  vars: Record<string, string>,
) {
  if (!template) return '';
  const lowerVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    lowerVars[k.toLowerCase()] = v;
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const k = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(lowerVars, k) ? lowerVars[k]! : '';
  });
}

export function renderStepTemplates(
  subjectTemplate: string | null | undefined,
  bodyTemplate: string | null | undefined,
  lead: TemplateLead,
  contact: TemplateContact,
) {
  const vars = buildTemplateVars(lead, contact);
  return {
    subject: renderTemplate(subjectTemplate, vars),
    body: renderTemplate(bodyTemplate, vars),
    vars,
  };
}
