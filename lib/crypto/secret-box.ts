import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'v1';

export class SecretDecryptError extends Error {
  constructor(message = 'Passwort konnte nicht entschlüsselt werden — bitte unter Konten neu speichern') {
    super(message);
    this.name = 'SecretDecryptError';
  }
}

function keyFromMailEncryptionKey(explicit: string): Buffer {
  try {
    const buf = Buffer.from(explicit, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    // fall through
  }
  return createHash('sha256').update(`mail-key:${explicit}`).digest();
}

function keyFromAuthSecret(secret: string): Buffer {
  return createHash('sha256').update(`mail-smtp-v1:${secret}`).digest();
}

/** Aktueller Primärschlüssel (zum Verschlüsseln). */
function resolvePrimaryKey(): Buffer {
  const explicit = process.env.MAIL_ENCRYPTION_KEY?.trim();
  if (explicit) return keyFromMailEncryptionKey(explicit);

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      'MAIL_ENCRYPTION_KEY oder AUTH_SECRET (min. 16 Zeichen) für SMTP-Verschlüsselung erforderlich',
    );
  }
  return keyFromAuthSecret(secret);
}

/**
 * Kandidaten zum Entschlüsseln — falls MAIL_ENCRYPTION_KEY neu gesetzt wurde,
 * aber Bestände noch mit AUTH_SECRET verschlüsselt sind (und umgekehrt).
 */
function resolveDecryptKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const seen = new Set<string>();
  const push = (k: Buffer) => {
    const id = k.toString('base64');
    if (seen.has(id)) return;
    seen.add(id);
    keys.push(k);
  };

  const explicit = process.env.MAIL_ENCRYPTION_KEY?.trim();
  if (explicit) push(keyFromMailEncryptionKey(explicit));

  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 16) push(keyFromAuthSecret(secret));

  if (!keys.length) {
    throw new Error(
      'MAIL_ENCRYPTION_KEY oder AUTH_SECRET (min. 16 Zeichen) für SMTP-Verschlüsselung erforderlich',
    );
  }
  return keys;
}

/**
 * AES-256-GCM. Format: `v1.<iv_b64>.<tag_b64>.<ciphertext_b64>`
 */
export function encryptSecret(plaintext: string): string {
  const key = resolvePrimaryKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    enc.toString('base64url'),
  ].join('.');
}

function decryptWithKey(payload: string, key: Buffer): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new SecretDecryptError('Ungültiges Secret-Format');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64!, 'base64url');
  const tag = Buffer.from(tagB64!, 'base64url');
  const data = Buffer.from(dataB64!, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function decryptSecret(payload: string): string {
  const keys = resolveDecryptKeys();
  let lastErr: unknown;
  for (const key of keys) {
    try {
      return decryptWithKey(payload, key);
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof SecretDecryptError) throw lastErr;
  throw new SecretDecryptError();
}
