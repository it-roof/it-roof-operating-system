/**
 * Seed Auth-Users in der Haupt-DB (DATABASE_URL).
 * Usage: node --env-file=.env.local --import tsx scripts/seed-auth-users.ts
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../lib/schema';

const SEED_USERS = [
  { name: 'Jason Kleuster', email: 'jason.kleuster@it-roof.com' },
  { name: 'Elizabeth Onyshko', email: 'elizabeth@it-roof.com' },
] as const;

function tempPassword() {
  return randomBytes(9).toString('base64url');
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL fehlt');

  const db = drizzle(neon(url));
  const created: { email: string; password: string; status: string }[] = [];

  for (const u of SEED_USERS) {
    const email = u.email.toLowerCase();
    const [existing] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      created.push({ email, password: '(unverändert)', status: 'existiert bereits' });
      continue;
    }

    const password = tempPassword();
    const hash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      name: u.name,
      email,
      password: hash,
      emailVerified: new Date(),
    });
    created.push({ email, password, status: 'neu' });
  }

  console.log('\nAuth-Users (Haupt-DB):\n');
  for (const row of created) {
    console.log(`  ${row.email}`);
    console.log(`    Status:   ${row.status}`);
    console.log(`    Passwort: ${row.password}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
