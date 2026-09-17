CREATE TABLE IF NOT EXISTS "time_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"stopped_at" timestamp with time zone,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "time_entry_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_entry_task" ON "time_entry" USING btree ("task_id" uuid_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_entry_started" ON "time_entry" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_time_entry_running" ON "time_entry" ((1)) WHERE "stopped_at" IS NULL;
