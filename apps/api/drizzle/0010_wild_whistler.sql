CREATE TABLE "budget_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"tracking_start_date" date
);
--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "target_amount_cents" DROP NOT NULL;