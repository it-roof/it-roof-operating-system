import { Secret, TOTP } from 'otpauth';

const ISSUER = 'Pinguine OS';

export function generateTotpSecret() {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

export function totpUri(email: string, secretBase32: string) {
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}

export function verifyTotp(secretBase32: string, token: string) {
  const code = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
