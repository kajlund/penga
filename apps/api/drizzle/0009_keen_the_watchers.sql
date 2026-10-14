CREATE TABLE "reconciliation_entries" (
	"split_id" uuid PRIMARY KEY NOT NULL,
	"reconciliation_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"closing_date" date NOT NULL,
	"starting_balance_cents" bigint NOT NULL,
	"closing_balance_cents" bigint NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reconciliation_entries" ADD CONSTRAINT "reconciliation_entries_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_entries" ADD CONSTRAINT "reconciliation_entries_reconciliation_id_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."reconciliations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;