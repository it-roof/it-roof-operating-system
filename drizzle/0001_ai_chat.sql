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
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_ai_conversation_updated" ON "ai_conversation" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX "idx_ai_message_conversation" ON "ai_message" USING btree ("conversation_id" uuid_ops);
