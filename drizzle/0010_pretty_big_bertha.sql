CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "ai_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'Neuer Chat' NOT NULL,
	"provider_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ai_message_role_check" CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text]))
);
--> statement-breakpoint
CREATE TABLE "ai_provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text DEFAULT '' NOT NULL,
	"model" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"user_email" text,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"meta" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_account" (
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
CREATE TABLE "mailbox" (
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
	"signature_html" text,
	"last_sync_at" timestamp with time zone,
	"last_sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"filename" text,
	"content_type" text,
	"size" integer DEFAULT 0 NOT NULL,
	"content_base64" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"imap_path" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'other' NOT NULL,
	"uid_validity" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_message" (
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
CREATE TABLE "password_reset_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"variant_index" integer DEFAULT 0 NOT NULL,
	"seed" integer NOT NULL,
	"media" text NOT NULL,
	"storage_key" text,
	"original_url" text,
	"mime" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "studio_asset_media_check" CHECK (media = ANY (ARRAY['image'::text, 'video'::text]))
);
--> statement-breakpoint
CREATE TABLE "studio_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"prompt" text NOT NULL,
	"seed" integer NOT NULL,
	"variant_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"estimated_cents" integer DEFAULT 0 NOT NULL,
	"actual_cents" integer DEFAULT 0 NOT NULL,
	"error" text,
	"provider_state" text,
	"parent_job_id" uuid,
	"parent_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "studio_job_kind_check" CHECK (kind = ANY (ARRAY['image'::text, 'video_draft'::text, 'video_final'::text])),
	CONSTRAINT "studio_job_status_check" CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "time_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"started_at" timestamp with time zone NOT NULL,
	"stopped_at" timestamp with time zone,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "type" SET DEFAULT 'task';--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox" ADD CONSTRAINT "mailbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_attachment" ADD CONSTRAINT "mailbox_attachment_message_id_mailbox_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."mailbox_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_folder" ADD CONSTRAINT "mailbox_folder_mailbox_id_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_message" ADD CONSTRAINT "mailbox_message_mailbox_id_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_message" ADD CONSTRAINT "mailbox_message_folder_id_mailbox_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."mailbox_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_asset" ADD CONSTRAINT "studio_asset_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."studio_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_updated" ON "ai_conversation" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_ai_message_conversation" ON "ai_message" USING btree ("conversation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_log_created" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_log_action" ON "audit_log" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "idx_login_attempt_key_time" ON "login_attempt" USING btree ("key" text_ops,"attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_mail_account_active" ON "mail_account" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_user_email_unique" ON "mailbox" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "idx_mailbox_user" ON "mailbox" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_mailbox_attachment_message" ON "mailbox_attachment" USING btree ("message_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_folder_path_unique" ON "mailbox_folder" USING btree ("mailbox_id","imap_path");--> statement-breakpoint
CREATE INDEX "idx_mailbox_folder_mailbox" ON "mailbox_folder" USING btree ("mailbox_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_message_folder_uid_unique" ON "mailbox_message" USING btree ("folder_id","uid") WHERE "mailbox_message"."uid" is not null;--> statement-breakpoint
CREATE INDEX "idx_mailbox_message_folder_date" ON "mailbox_message" USING btree ("folder_id" uuid_ops,"date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_mailbox_message_mailbox_date" ON "mailbox_message" USING btree ("mailbox_id" uuid_ops,"date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_mailbox_message_thread" ON "mailbox_message" USING btree ("thread_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_password_reset_token_hash" ON "password_reset_token" USING btree ("token_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_password_reset_user" ON "password_reset_token" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_studio_asset_job" ON "studio_asset" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_studio_job_created" ON "studio_job" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_studio_job_status" ON "studio_job" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_time_entry_task" ON "time_entry" USING btree ("task_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_time_entry_started" ON "time_entry" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_time_entry_user" ON "time_entry" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_time_entry_running" ON "time_entry" USING btree ("user_id") WHERE "time_entry"."stopped_at" IS NULL;