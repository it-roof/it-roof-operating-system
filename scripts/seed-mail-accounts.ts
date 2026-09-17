/**
 * SMTP-Postfächer upserten (Passwort wird AES-GCM verschlüsselt).
 *
 * Credentials NUR über Env — nie ins Repo committen:
 *
 *   node --env-file=.env.local --import tsx scripts/seed-mail-accounts.ts
 *
 * Erwartete Env (pro Account, Index 1..n):
 *   MAIL_SEED_1_EMAIL=
 *   MAIL_SEED_1_USER=
 *   MAIL_SEED_1_PASS=
 *   MAIL_SEED_1_HOST=w….kasserver.com
 *   MAIL_SEED_1_NAME=   (optional)
 *   MAIL_SEED_1_PORT=587 (optional)
 *   MAIL_SEED_1_CAP=20   (optional)
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { encryptSecret } from '../lib/crypto/secret-box';
import { mailAccount } from '../lib/schema';

type SeedRow = {
  email: string;
  smtpUser: string;
  smtpPass: string;
  smtpHost: string;
  displayName: string | null;
  smtpPort: number;
  dailyCap: number;
};

function readSeeds(): SeedRow[] {
  const rows: SeedRow[] = [];
  for (let i = 1; i <= 10; i++) {
    const email = process.env[`MAIL_SEED_${i}_EMAIL`]?.trim();
    const smtpUser = process.env[`MAIL_SEED_${i}_USER`]?.trim();
    const smtpPass = process.env[`MAIL_SEED_${i}_PASS`];
    const smtpHost = process.env[`MAIL_SEED_${i}_HOST`]?.trim();
    if (!email && !smtpUser && !smtpPass && !smtpHost) continue;
    if (!email || !smtpUser || !smtpPass || !smtpHost) {
      throw new Error(`MAIL_SEED_${i}_* unvollständig (EMAIL, USER, PASS, HOST)`);
    }
    rows.push({
      email: email.toLowerCase(),
      smtpUser,
      smtpPass,
      smtpHost,
      displayName: process.env[`MAIL_SEED_${i}_NAME`]?.trim() || null,
      smtpPort: Number(process.env[`MAIL_SEED_${i}_PORT`] ?? 587) || 587,
      dailyCap: Number(process.env[`MAIL_SEED_${i}_CAP`] ?? 20) || 20,
    });
  }
  return rows;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL fehlt');

  const seeds = readSeeds();
  if (seeds.length === 0) {
    throw new Error('Keine MAIL_SEED_n_* Variablen gesetzt');
  }

  const db = drizzle(neon(url));
  const now = new Date();

  for (const s of seeds) {
    const encrypted = encryptSecret(s.smtpPass);
    const [existing] = await db
      .select({ id: mailAccount.id, email: mailAccount.email })
      .from(mailAccount)
      .where(eq(mailAccount.email, s.email))
      .limit(1);

    if (existing) {
      await db
        .update(mailAccount)
        .set({
          displayName: s.displayName,
          smtpHost: s.smtpHost,
          smtpPort: s.smtpPort,
          smtpUser: s.smtpUser,
          smtpPasswordEncrypted: encrypted,
          dailyCap: s.dailyCap,
          active: true,
          updatedAt: now,
        })
        .where(eq(mailAccount.id, existing.id));
      console.log(`updated ${s.email}`);
    } else {
      await db.insert(mailAccount).values({
        email: s.email,
        displayName: s.displayName,
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        smtpUser: s.smtpUser,
        smtpPasswordEncrypted: encrypted,
        dailyCap: s.dailyCap,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`created ${s.email}`);
    }
  }

  console.log(`ok — ${seeds.length} account(s), passwords encrypted`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
