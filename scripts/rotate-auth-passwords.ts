/**
 * Rotiert Passwörter für die IT-Roof-User und gibt neue Temp-Passwörter aus.
 * Usage: node --env-file=.env.local --import tsx scripts/rotate-auth-passwords.ts
 */
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../lib/schema';
import { hashPassword } from '../lib/auth/password';

const EMAILS = [
  'jason.kleuster@it-roof.com',
  'elizabeth@it-roof.com',
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL fehlt');
  const db = drizzle(neon(url));

  console.log('\nNeue Passwörter (einmalig notieren):\n');
  for (const email of EMAILS) {
    const password = randomBytes(12).toString('base64url');
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      console.log(`  ${email}: FEHLT`);
      continue;
    }
    await db
      .update(users)
      .set({
        password: await hashPassword(password),
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    console.log(`  ${email}`);
    console.log(`    Passwort: ${password}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
