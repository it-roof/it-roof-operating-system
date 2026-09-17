ALTER TABLE "time_entry" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
UPDATE "time_entry" SET "user_id" = COALESCE(
  (SELECT "id" FROM "user" WHERE lower("email") = 'jason.kleuster@it-roof.com' LIMIT 1),
  (SELECT "id" FROM "user" LIMIT 1)
) WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "time_entry" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_time_entry_running";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_time_entry_running" ON "time_entry" ("user_id") WHERE "stopped_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_entry_user" ON "time_entry" USING btree ("user_id" text_ops);
