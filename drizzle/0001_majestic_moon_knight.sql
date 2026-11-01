ALTER TABLE "officer" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "officer" ADD COLUMN "requested_workspace_id" text;--> statement-breakpoint
ALTER TABLE "officer" ADD COLUMN "requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "import_headers" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "officer_status_idx" ON "officer" USING btree ("status");