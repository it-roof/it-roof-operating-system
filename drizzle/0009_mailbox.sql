CREATE TABLE IF NOT EXISTS "mailbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"imap_host" text NOT NULL,
	"imap_port" integer DEFAULT 993 NOT NULL,
	"imap_secure" boolean DEFAULT true NOT NULL,
	"smtp_host" text NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_secure" boolean DEFAULT false NOT NULL,
	"username" text NOT NULL,
	"password_encrypted" text NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mailbox_folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"imap_path" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'other' NOT NULL,
	"uid_validity" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mailbox_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"uid" bigint,
	"message_id_header" text,
	"in_reply_to" text,
	"references_header" text,
	"thread_id" text NOT NULL,
	"from_name" text,
	"from_address" text,
	"to_addresses" text,
	"cc_addresses" text,
	"subject" text,
	"date" timestamp with time zone,
	"seen" boolean DEFAULT false NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"answered" boolean DEFAULT false NOT NULL,
	"snippet" text,
	"text_body" text,
	"html_body" text,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mailbox_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"filename" text,
	"content_type" text,
	"size" integer DEFAULT 0 NOT NULL,
	"content_base64" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailbox" ADD CONSTRAINT "mailbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mailbox_folder" ADD CONSTRAINT "mailbox_folder_mailbox_id_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailbox"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mailbox_message" ADD CONSTRAINT "mailbox_message_mailbox_id_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailbox"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mailbox_message" ADD CONSTRAINT "mailbox_message_folder_id_mailbox_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."mailbox_folder"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mailbox_attachment" ADD CONSTRAINT "mailbox_attachment_message_id_mailbox_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."mailbox_message"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mailbox_user_email_unique" ON "mailbox" USING btree ("user_id","email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailbox_user" ON "mailbox" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mailbox_folder_path_unique" ON "mailbox_folder" USING btree ("mailbox_id","imap_path");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailbox_folder_mailbox" ON "mailbox_folder" USING btree ("mailbox_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mailbox_message_folder_uid_unique" ON "mailbox_message" USING btree ("folder_id","uid") WHERE "uid" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailbox_message_folder_date" ON "mailbox_message" USING btree ("folder_id","date" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailbox_message_mailbox_date" ON "mailbox_message" USING btree ("mailbox_id","date" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailbox_message_thread" ON "mailbox_message" USING btree ("thread_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailbox_attachment_message" ON "mailbox_attachment" USING btree ("message_id");
