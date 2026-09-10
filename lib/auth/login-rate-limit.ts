import { and, eq, gte, lt, or, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { loginAttempt } from '@/lib/schema';

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_IP_MAX_FAILURES = 20;

export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  return (h.get('x-real-ip') ?? 'unknown').slice(0, 128);
}

function attemptKey(ip: string, email: string) {
  return `${ip}|${email.toLowerCase()}`;
}

function ipKey(ip: string) {
  return `ip|${ip}`;
}

async function countAttempts(key: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempt)
    .where(and(eq(loginAttempt.key, key), gte(loginAttempt.attemptedAt, since)));
  return row?.count ?? 0;
}

export async function isLoginLocked(ip: string, email: string) {
  return (await countAttempts(attemptKey(ip, email))) >= LOGIN_MAX_FAILURES;
}

export async function isIpLocked(ip: string) {
  return (await countAttempts(ipKey(ip))) >= LOGIN_IP_MAX_FAILURES;
}

export async function recordLoginFailure(ip: string, email: string) {
  const key = attemptKey(ip, email);
  const ipOnly = ipKey(ip);
  await db.insert(loginAttempt).values([{ key }, { key: ipOnly }]);
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MS * 2);
  await db
    .delete(loginAttempt)
    .where(
      and(
        or(eq(loginAttempt.key, key), eq(loginAttempt.key, ipOnly)),
        lt(loginAttempt.attemptedAt, cutoff),
      ),
    );
}

export async function clearLoginFailures(ip: string, email: string) {
  const key = attemptKey(ip, email);
  await db.delete(loginAttempt).where(eq(loginAttempt.key, key));
}
