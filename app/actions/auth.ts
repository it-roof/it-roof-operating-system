'use server';

import { AuthError } from 'next-auth';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { signIn, signOut, auth } from '@/auth';
import { db } from '@/lib/db';
import { passwordResetToken, users } from '@/lib/schema';
import {
  getClientIp,
  isLoginLocked,
  isIpLocked,
  recordLoginFailure,
} from '@/lib/auth/login-rate-limit';

import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from '@/lib/auth/password';
import { hashToken, newResetToken, writeAudit } from '@/lib/auth/audit';
import { generateTotpSecret, totpUri, verifyTotp } from '@/lib/auth/totp';
import QRCode from 'qrcode';

export type LoginState = {
  needs2fa?: boolean;
};

async function loginDelay() {
  await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 200)));
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const totp = String(formData.get('totp') ?? '').trim();
  const next = String(formData.get('next') ?? '/').trim() || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  await loginDelay();

  if (!email || !password) {
    return {};
  }

  const ip = await getClientIp();
  if ((await isIpLocked(ip)) || (await isLoginLocked(ip, email))) {
    return {};
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.password || !(await verifyPassword(password, user.password))) {
    await recordLoginFailure(ip, email);
    return {};
  }

  if (user.totpEnabled && user.totpSecret && !totp) {
    return { needs2fa: true };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      totp,
      redirectTo: safeNext,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      await recordLoginFailure(ip, email);
      return user.totpEnabled ? { needs2fa: true } : {};
    }
    throw error;
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}

export type FormMsg = { error?: string; success?: string; resetLink?: string };

export async function changePasswordAction(
  _prev: FormMsg,
  formData: FormData,
): Promise<FormMsg> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Nicht angemeldet.' };

  const current = String(formData.get('currentPassword') ?? '');
  const next = String(formData.get('newPassword') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  const pwdErr = validatePassword(next);
  if (pwdErr) return { error: pwdErr };
  if (next !== confirm) return { error: 'Passwörter stimmen nicht überein.' };

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user?.password || !(await verifyPassword(current, user.password))) {
    return { error: 'Aktuelles Passwort ist falsch.' };
  }

  await db
    .update(users)
    .set({ password: await hashPassword(next), passwordChangedAt: new Date() })
    .where(eq(users.id, user.id));

  await writeAudit({
    action: 'password.change',
    resource: 'user',
    resourceId: user.id,
  });

  return { success: 'Passwort aktualisiert.' };
}

export async function requestPasswordResetAction(
  _prev: FormMsg,
  _formData: FormData,
): Promise<FormMsg> {
  // Öffentlicher Web-Reset deaktiviert — nur Ops-Skript / E-Mail-Flow intern
  await new Promise((r) => setTimeout(r, 400));
  return { success: 'OK' };
}

export async function resetPasswordAction(
  _prev: FormMsg,
  formData: FormData,
): Promise<FormMsg> {
  const token = String(formData.get('token') ?? '').trim();
  const next = String(formData.get('newPassword') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (!token) return { error: 'Ungültig.' };
  const pwdErr = validatePassword(next);
  if (pwdErr) return { error: pwdErr };
  if (next !== confirm) return { error: 'Ungültig.' };

  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetToken)
    .where(
      and(
        eq(passwordResetToken.tokenHash, tokenHash),
        isNull(passwordResetToken.usedAt),
        gt(passwordResetToken.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return { error: 'Ungültig.' };

  await db
    .update(users)
    .set({ password: await hashPassword(next), passwordChangedAt: new Date() })
    .where(eq(users.id, row.userId));

  await db
    .update(passwordResetToken)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetToken.id, row.id));

  await writeAudit({
    action: 'password.reset_complete',
    resource: 'user',
    resourceId: row.userId,
    userId: row.userId,
  });

  return { success: 'OK' };
}

export type TotpSetupState = FormMsg & {
  secret?: string;
  qrDataUrl?: string;
};

export async function startTotpSetupAction(): Promise<TotpSetupState> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: 'Nicht angemeldet.' };

  const secret = generateTotpSecret();
  const uri = totpUri(session.user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri);

  // Secret vorübergehend speichern, noch nicht enabled
  await db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: false })
    .where(eq(users.id, session.user.id));

  return { secret, qrDataUrl, success: 'App scannen und Code bestätigen.' };
}

export async function confirmTotpSetupAction(
  _prev: TotpSetupState,
  formData: FormData,
): Promise<TotpSetupState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Nicht angemeldet.' };

  const code = String(formData.get('totp') ?? '').trim();
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user?.totpSecret) return { error: 'Kein Setup gestartet.' };
  if (!verifyTotp(user.totpSecret, code)) return { error: 'Code ungültig.' };

  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, user.id));
  await writeAudit({
    action: 'totp.enable',
    resource: 'user',
    resourceId: user.id,
  });

  return { success: '2FA ist aktiv.' };
}

export async function disableTotpAction(
  _prev: FormMsg,
  formData: FormData,
): Promise<FormMsg> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Nicht angemeldet.' };

  const password = String(formData.get('password') ?? '');
  const totp = String(formData.get('totp') ?? '').trim();

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user?.password) return { error: 'Benutzer nicht gefunden.' };
  if (!(await verifyPassword(password, user.password))) {
    return { error: 'Passwort falsch.' };
  }
  if (user.totpEnabled && user.totpSecret && !verifyTotp(user.totpSecret, totp)) {
    return { error: '2FA-Code falsch.' };
  }

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null })
    .where(eq(users.id, user.id));

  await writeAudit({
    action: 'totp.disable',
    resource: 'user',
    resourceId: user.id,
  });

  return { success: '2FA deaktiviert.' };
}
