/**
 * Einmaliger SMTP-Test. Usage:
 *   node --env-file=.env.local --import tsx scripts/send-smtp-test.ts
 */
import nodemailer from 'nodemailer';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { decryptSecret } from '../lib/crypto/secret-box';
import { mailAccount } from '../lib/schema';

async function main() {
  const to = process.env.MAIL_TEST_TO?.trim() || 'hello@it-roof.com';
  const from = (process.env.MAIL_TEST_FROM?.trim() || 'jason.kleuster@it-roof.de').toLowerCase();

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL fehlt');

  const db = drizzle(neon(url));
  const [row] = await db.select().from(mailAccount).where(eq(mailAccount.email, from)).limit(1);
  if (!row) throw new Error(`mail_account fehlt: ${from}`);

  const pass = decryptSecret(row.smtpPasswordEncrypted);
  const transporter = nodemailer.createTransport({
    host: row.smtpHost,
    port: row.smtpPort || 587,
    secure: row.smtpPort === 465,
    auth: { user: row.smtpUser, pass },
    requireTLS: row.smtpPort !== 465,
  });

  await transporter.verify();
  console.log('smtp verify ok', row.email, row.smtpHost);

  const info = await transporter.sendMail({
    from: `"${row.displayName ?? row.email}" <${row.email}>`,
    to,
    subject: 'Pinguine OS — SMTP-Test',
    text: [
      'Hallo,',
      '',
      'das ist ein automatischer SMTP-Test aus dem IT-Roof Operating System.',
      `Absender: ${row.email}`,
      `Host: ${row.smtpHost}`,
      `Zeit: ${new Date().toISOString()}`,
      '',
      'Wenn du diese Mail siehst, funktioniert der verschlüsselte Account-Versand.',
    ].join('\n'),
  });

  console.log('sent to', to);
  console.log('messageId', info.messageId || '(none)');
  console.log('response', info.response || '(none)');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
