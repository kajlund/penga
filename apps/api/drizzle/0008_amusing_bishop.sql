ALTER TABLE "transactions" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reversal_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reverses_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reversal_transaction_id_transactions_id_fk" FOREIGN KEY ("reversal_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reverses_transaction_id_transactions_id_fk" FOREIGN KEY ("reverses_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_reversal_tx_id_unique" ON "transactions" USING btree ("reversal_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_reverses_tx_id_unique" ON "transactions" USING btree ("reverses_transaction_id");