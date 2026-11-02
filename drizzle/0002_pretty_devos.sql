DROP INDEX "officer_email_idx";--> statement-breakpoint
ALTER TABLE "officer" ADD CONSTRAINT "officer_email_unique" UNIQUE("email");