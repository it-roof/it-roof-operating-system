import { asc, eq } from 'drizzle-orm';
import { decryptSecret } from '@/lib/crypto/secret-box';
import { db } from '@/lib/db';
import { mailAccount } from '@/lib/schema';

export type MailAccountPublic = {
  id: string;
  email: string;
  displayName: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  dailyCap: number;
  active: boolean;
};

export type MailAccountCredentials = MailAccountPublic & {
  smtpPassword: string;
};

export async function listActiveMailAccounts(): Promise<MailAccountPublic[]> {
  const rows = await db
    .select({
      id: mailAccount.id,
      email: mailAccount.email,
      displayName: mailAccount.displayName,
      smtpHost: mailAccount.smtpHost,
      smtpPort: mailAccount.smtpPort,
      smtpUser: mailAccount.smtpUser,
      dailyCap: mailAccount.dailyCap,
      active: mailAccount.active,
    })
    .from(mailAccount)
    .where(eq(mailAccount.active, true))
    .orderBy(asc(mailAccount.email));

  return rows;
}

export async function getMailAccountCredentials(
  email: string,
): Promise<MailAccountCredentials | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(mailAccount)
    .where(eq(mailAccount.email, normalized))
    .limit(1);

  if (!row || !row.active) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    dailyCap: row.dailyCap,
    active: row.active,
    smtpPassword: decryptSecret(row.smtpPasswordEncrypted),
  };
}
