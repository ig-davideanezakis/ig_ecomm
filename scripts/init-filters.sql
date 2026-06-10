-- Create filter tables (new system)
-- Keep old category_filter table for now, will migrate later

CREATE TABLE IF NOT EXISTS "filter" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "type" varchar(50) NOT NULL DEFAULT 'checkbox',
  "is_global" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "filter_option" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "value" varchar(255) NOT NULL,
  "label" varchar(255),
  "slug" varchar(255),
  "color" varchar(50),
  "sort_order" integer NOT NULL DEFAULT 0,
  "filter_id" varchar(255) NOT NULL REFERENCES "filter"(id) ON DELETE CASCADE
);

-- Add new columns to existing category_filter table
ALTER TABLE "category_filter" ADD COLUMN IF NOT EXISTS "filter_id" varchar(255) REFERENCES "filter"(id) ON DELETE CASCADE;
ALTER TABLE "category_filter" ADD COLUMN IF NOT EXISTS "inherit" boolean NOT NULL DEFAULT true;

-- Create product_filter_values table
CREATE TABLE IF NOT EXISTS "product_filter_value" (
  "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" varchar(255) NOT NULL,
  "filter_id" varchar(255) NOT NULL REFERENCES "filter"(id) ON DELETE CASCADE,
  "value" varchar(255) NOT NULL,
  "filter_option_id" varchar(255) REFERENCES "filter_option"(id) ON DELETE CASCADE,
  UNIQUE("product_id", "filter_id", "value")
);

-- Seed global filters
INSERT INTO "filter" (name, slug, type, is_global, sort_order)
VALUES
  ('Prezzo', 'price', 'range', true, 1),
  ('Disponibilità', 'stock', 'checkbox', true, 2),
  ('Marca', 'brand', 'checkbox', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed filter options for stock
INSERT INTO "filter_option" (value, label, slug, filter_id)
SELECT 'in_stock', 'Disponibile', 'in_stock', f.id
FROM "filter" f WHERE f.slug = 'stock' AND NOT EXISTS (
  SELECT 1 FROM "filter_option" fo WHERE fo.filter_id = f.id AND fo.slug = 'in_stock'
);

INSERT INTO "filter_option" (value, label, slug, filter_id)
SELECT 'out_of_stock', 'Non disponibile', 'out_of_stock', f.id
FROM "filter" f WHERE f.slug = 'stock' AND NOT EXISTS (
  SELECT 1 FROM "filter_option" fo WHERE fo.filter_id = f.id AND fo.slug = 'out_of_stock'
);

INSERT INTO "filter_option" (value, label, slug, filter_id)
SELECT 'on_sale', 'In offerta', 'on_sale', f.id
FROM "filter" f WHERE f.slug = 'stock' AND NOT EXISTS (
  SELECT 1 FROM "filter_option" fo WHERE fo.filter_id = f.id AND fo.slug = 'on_sale'
);
