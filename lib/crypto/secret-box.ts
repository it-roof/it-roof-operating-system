import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'v1';

function resolveKey(): Buffer {
  const explicit = process.env.MAIL_ENCRYPTION_KEY?.trim();
  if (explicit) {
    // base64 32 bytes, oder Rohstring → SHA-256
    try {
      const buf = Buffer.from(explicit, 'base64');
      if (buf.length === 32) return buf;
    } catch {
      // fall through
    }
    return createHash('sha256').update(`mail-key:${explicit}`).digest();
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      'MAIL_ENCRYPTION_KEY oder AUTH_SECRET (min. 16 Zeichen) für SMTP-Verschlüsselung erforderlich',
    );
  }
  return createHash('sha256').update(`mail-smtp-v1:${secret}`).digest();
}

/**
 * AES-256-GCM. Format: `v1.<iv_b64>.<tag_b64>.<ciphertext_b64>`
 */
export function encryptSecret(plaintext: string): string {
  const key = resolveKey();
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

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Ungültiges Secret-Format');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = resolveKey();
  const iv = Buffer.from(ivB64!, 'base64url');
  const tag = Buffer.from(tagB64!, 'base64url');
  const data = Buffer.from(dataB64!, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
