ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "value_mode" varchar(20) DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "icon" varchar(50);
--> statement-breakpoint
ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "patterns" text;
--> statement-breakpoint
ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "exclude" text;
--> statement-breakpoint
ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "show_as_chip" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "filter" ADD COLUMN IF NOT EXISTS "use_as_filter" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_filter_value" ADD COLUMN IF NOT EXISTS "is_override" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
DELETE FROM "product_filter_value" WHERE "product_id" NOT IN (SELECT "id" FROM "product");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_filter_value" ADD CONSTRAINT "product_filter_value_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
