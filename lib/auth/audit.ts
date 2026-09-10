import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/schema';
import { auth } from '@/auth';
import { getClientIp } from '@/lib/auth/login-rate-limit';

export async function writeAudit(opts: {
  action: string;
  resource?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  userId?: string | null;
  userEmail?: string | null;
}) {
  try {
    let userId = opts.userId ?? null;
    let userEmail = opts.userEmail ?? null;
    if (userId == null || userEmail == null) {
      const session = await auth();
      userId = userId ?? session?.user?.id ?? null;
      userEmail = userEmail ?? session?.user?.email ?? null;
    }
    const ip = await getClientIp().catch(() => 'unknown');
    await db.insert(auditLog).values({
      userId,
      userEmail,
      action: opts.action,
      resource: opts.resource ?? null,
      resourceId: opts.resourceId ?? null,
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
      ip,
    });
  } catch (err) {
    console.error('[audit]', err);
  }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function newResetToken() {
  return randomBytes(32).toString('base64url');
}
