-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'Aktiv',
	"created_at" timestamp with time zone DEFAULT now(),
	"street" text,
	"zip" text,
	"city" text,
	"country" text DEFAULT 'DE'
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open',
	"priority" text DEFAULT 'medium',
	"planned_date" date,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"time_estimate_minutes" integer,
	"completed_at" timestamp with time zone,
	"project_id" uuid NOT NULL,
	"type" text DEFAULT 'aufgabe' NOT NULL,
	"appointment_time" time,
	CONSTRAINT "tasks_status_check" CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text])),
	CONSTRAINT "tasks_priority_check" CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
	CONSTRAINT "tasks_type_check" CHECK (type = ANY (ARRAY['task'::text, 'appointment_in_person'::text, 'appointment_remote'::text]))
);
--> statement-breakpoint
CREATE TABLE "trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"from_address" text DEFAULT 'Odinweg 2, 95448 Bayreuth' NOT NULL,
	"to_address" text NOT NULL,
	"purpose" text,
	"company_id" uuid,
	"round_trip" boolean DEFAULT false NOT NULL,
	"km" numeric(8, 2),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"role" text
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" uuid NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "projects_status_check" CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text]))
);
--> statement-breakpoint
CREATE TABLE "company_contact" (
	"company_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "company_contacts_pkey" PRIMARY KEY("company_id","contact_id")
);
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contact" ADD CONSTRAINT "company_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contact" ADD CONSTRAINT "company_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_deadline" ON "task" USING btree ("deadline" date_ops);--> statement-breakpoint
CREATE INDEX "idx_tasks_planned" ON "task" USING btree ("planned_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "task" USING btree ("priority" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "task" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_projects_company" ON "project" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "project" USING btree ("status" text_ops);
*/