CREATE TABLE IF NOT EXISTS "login_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_login_attempt_key_time" ON "login_attempt" USING btree ("key" text_ops,"attempted_at" DESC NULLS LAST);
