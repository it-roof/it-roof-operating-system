ALTER TABLE "time_entry" ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
UPDATE "time_entry" AS te SET "title" = t."title" FROM "task" t WHERE t."id" = te."task_id" AND te."title" IS NULL;
