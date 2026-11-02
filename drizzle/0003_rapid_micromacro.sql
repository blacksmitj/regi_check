CREATE TABLE "sheet_sync_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"triggered_by" text NOT NULL,
	"status" text NOT NULL,
	"total_rows_found" integer DEFAULT 0 NOT NULL,
	"new_added_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "google_sheet_url" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "auto_sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "sync_interval_minutes" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "last_sync_status" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "last_sync_message" text;--> statement-breakpoint
ALTER TABLE "sheet_sync_log" ADD CONSTRAINT "sheet_sync_log_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sheet_sync_log_workspace_id_idx" ON "sheet_sync_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sheet_sync_log_created_at_idx" ON "sheet_sync_log" USING btree ("created_at");