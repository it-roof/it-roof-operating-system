/**
 * Erzeugt einen Passwort-Reset-Link für eine E-Mail.
 * Usage: node --env-file=.env.local --import tsx scripts/create-password-reset.ts email@it-roof.com
 */
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { passwordResetToken, users } from '../lib/schema';
import { hashToken, newResetToken } from '../lib/auth/audit';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: … create-password-reset.ts <email>');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL fehlt');

  const db = drizzle(neon(url));
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.error('User nicht gefunden');
    process.exit(1);
  }

  const token = newResetToken();
  await db.insert(passwordResetToken).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const base = (process.env.AUTH_URL ?? 'http://127.0.0.1:3001').replace(/\/+$/, '');
  console.log(`${base}/login/reset?token=${token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
