CREATE TABLE "template_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_tags" (
	"template_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "template_tags_template_id_tag_id_pk" PRIMARY KEY("template_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "transaction_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"payee" text,
	"note" text,
	"icon" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_splits" ADD CONSTRAINT "template_splits_template_id_transaction_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."transaction_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_splits" ADD CONSTRAINT "template_splits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tags" ADD CONSTRAINT "template_tags_template_id_transaction_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."transaction_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tags" ADD CONSTRAINT "template_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;