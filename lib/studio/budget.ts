import { db } from '@/lib/db';
import { studioJob } from '@/lib/schema';
import { and, gte, inArray, sql } from 'drizzle-orm';

export function monthStartIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString();
}

export async function monthCommittedCents() {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(
        case when ${studioJob.status} = 'succeeded' then ${studioJob.actualCents} else ${studioJob.estimatedCents} end
      ), 0)::int`,
    })
    .from(studioJob)
    .where(and(
      gte(studioJob.createdAt, monthStartIso()),
      inArray(studioJob.status, ['queued', 'running', 'succeeded']),
    ));
  return Number(row?.total ?? 0);
}
