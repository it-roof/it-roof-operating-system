CREATE TABLE IF NOT EXISTS "mail_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"smtp_host" text NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_user" text NOT NULL,
	"smtp_password_encrypted" text NOT NULL,
	"daily_cap" integer DEFAULT 20 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_account_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mail_account_active" ON "mail_account" USING btree ("active");
