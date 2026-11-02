CREATE TABLE "appscript_sync_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"status" text NOT NULL,
	"total_rows_sent" integer DEFAULT 0 NOT NULL,
	"sheet_name" text,
	"ip_address" text,
	"user_agent" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "appscript_api_key" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "appscript_sheet_name" text DEFAULT 'Data Peserta';--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "appscript_lock_sheet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "appscript_sync_log" ADD CONSTRAINT "appscript_sync_log_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appscript_sync_log_workspace_id_idx" ON "appscript_sync_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "appscript_sync_log_created_at_idx" ON "appscript_sync_log" USING btree ("created_at");