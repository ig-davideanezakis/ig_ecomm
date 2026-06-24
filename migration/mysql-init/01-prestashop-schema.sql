-- PrestaShop 1.7.7.8 - Core tables for migration
-- Prefix: ps_
-- Collation: utf8mb4_unicode_ci

-- ============================================================
-- CATALOG
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_category (
  id_category INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_parent INT(10) UNSIGNED NOT NULL DEFAULT 0,
  level_depth TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  nleft INT(10) UNSIGNED NOT NULL DEFAULT 0,
  nright INT(10) UNSIGNED NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 0,
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL,
  INDEX id_parent (id_parent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_category_lang (
  id_category INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  description TEXT,
  link_rewrite VARCHAR(255) NOT NULL,
  meta_title VARCHAR(255),
  meta_description VARCHAR(512),
  PRIMARY KEY (id_category, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_category_shop (
  id_category INT(10) UNSIGNED NOT NULL,
  id_shop INT(10) UNSIGNED NOT NULL,
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id_category, id_shop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MANUFACTURER (Brand)
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_manufacturer (
  id_manufacturer INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_manufacturer_lang (
  id_manufacturer INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  description TEXT,
  short_description TEXT,
  meta_title VARCHAR(255),
  meta_description VARCHAR(512),
  PRIMARY KEY (id_manufacturer, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_manufacturer_shop (
  id_manufacturer INT(10) UNSIGNED NOT NULL,
  id_shop INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (id_manufacturer, id_shop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCT
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_product (
  id_product INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_supplier INT(10) UNSIGNED DEFAULT NULL,
  id_manufacturer INT(10) UNSIGNED DEFAULT NULL,
  id_category_default INT(10) UNSIGNED DEFAULT NULL,
  id_shop_default INT(10) UNSIGNED NOT NULL DEFAULT 1,
  reference VARCHAR(64) DEFAULT NULL,
  ean13 VARCHAR(13) DEFAULT NULL,
  isbn VARCHAR(32) DEFAULT NULL,
  upc VARCHAR(12) DEFAULT NULL,
  `price` DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  wholesale_price DECIMAL(20,6) DEFAULT NULL,
  `weight` DECIMAL(20,6) DEFAULT '0.000000',
  `width` DECIMAL(20,6) DEFAULT '0.000000',
  `height` DECIMAL(20,6) DEFAULT '0.000000',
  `depth` DECIMAL(20,6) DEFAULT '0.000000',
  active TINYINT(1) NOT NULL DEFAULT 0,
  `condition` VARCHAR(50) DEFAULT NULL,
  `show_price` TINYINT(1) NOT NULL DEFAULT 1,
  indexed TINYINT(1) NOT NULL DEFAULT 0,
  visibility VARCHAR(10) NOT NULL DEFAULT 'both',
  cache_is_pack TINYINT(1) NOT NULL DEFAULT 0,
  cache_has_attachments TINYINT(1) NOT NULL DEFAULT 0,
  is_virtual TINYINT(1) NOT NULL DEFAULT 0,
  `cache_default_attribute` INT(10) UNSIGNED DEFAULT NULL,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL,
  INDEX id_manufacturer (id_manufacturer),
  INDEX id_category_default (id_category_default),
  INDEX reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_product_lang (
  id_product INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `description` TEXT,
  description_short TEXT,
  link_rewrite VARCHAR(255) NOT NULL,
  meta_title VARCHAR(255),
  meta_description VARCHAR(512),
  `name` VARCHAR(255) NOT NULL,
  available_now VARCHAR(255),
  available_later VARCHAR(255),
  PRIMARY KEY (id_product, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_product_shop (
  id_product INT(10) UNSIGNED NOT NULL,
  id_shop INT(10) UNSIGNED NOT NULL,
  `price` DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  wholesale_price DECIMAL(20,6) DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  `show_price` TINYINT(1) NOT NULL DEFAULT 1,
  `cache_default_attribute` INT(10) UNSIGNED DEFAULT NULL,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL,
  PRIMARY KEY (id_product, id_shop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCT COMBINATION (Variants)
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_product_attribute (
  id_product_attribute INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_product INT(10) UNSIGNED NOT NULL,
  reference VARCHAR(64) DEFAULT NULL,
  ean13 VARCHAR(13) DEFAULT NULL,
  isbn VARCHAR(32) DEFAULT NULL,
  upc VARCHAR(12) DEFAULT NULL,
  wholesale_price DECIMAL(20,6) DEFAULT NULL,
  `price` DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  unit_price_impact DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  `weight` DECIMAL(20,6) DEFAULT '0.000000',
  `default_on` TINYINT(1) UNSIGNED DEFAULT NULL,
  `quantity` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  INDEX id_product (id_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_product_attribute_combination (
  id_attribute INT(10) UNSIGNED NOT NULL,
  id_product_attribute INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (id_attribute, id_product_attribute)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_attribute (
  id_attribute INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_attribute_group INT(10) UNSIGNED NOT NULL,
  `color` VARCHAR(50) DEFAULT NULL,
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  INDEX id_attribute_group (id_attribute_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_attribute_lang (
  id_attribute INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  PRIMARY KEY (id_attribute, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_attribute_group (
  id_attribute_group INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  is_color_group TINYINT(1) NOT NULL DEFAULT 0,
  `group_type` VARCHAR(15) NOT NULL DEFAULT 'select',
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_attribute_group_lang (
  id_attribute_group INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  public_name VARCHAR(64) NOT NULL,
  PRIMARY KEY (id_attribute_group, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- STOCK
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_stock_available (
  id_stock_available INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_product INT(10) UNSIGNED NOT NULL,
  id_product_attribute INT(10) UNSIGNED NOT NULL DEFAULT 0,
  id_shop INT(10) UNSIGNED NOT NULL DEFAULT 1,
  id_shop_group INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `quantity` INT(10) NOT NULL DEFAULT 0,
  out_of_stock TINYINT(1) UNSIGNED NOT NULL DEFAULT 2,
  `depends_on_stock` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  INDEX id_product (id_product),
  INDEX id_product_attribute (id_product_attribute)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- IMAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_image (
  id_image INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_product INT(10) UNSIGNED NOT NULL,
  `position` SMALLINT(2) UNSIGNED NOT NULL DEFAULT 0,
  cover TINYINT(1) UNSIGNED DEFAULT NULL,
  INDEX id_product (id_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_image_lang (
  id_image INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  legend VARCHAR(128) DEFAULT NULL,
  PRIMARY KEY (id_image, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_image_shop (
  id_product INT(10) UNSIGNED NOT NULL,
  id_image INT(10) UNSIGNED NOT NULL,
  id_shop INT(10) UNSIGNED NOT NULL,
  cover TINYINT(1) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id_image, id_shop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FEATURES & FILTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_feature (
  id_feature INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_feature_lang (
  id_feature INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  PRIMARY KEY (id_feature, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_feature_value (
  id_feature_value INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_feature INT(10) UNSIGNED NOT NULL,
  custom TINYINT(3) UNSIGNED DEFAULT NULL,
  `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_feature_value_lang (
  id_feature_value INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `value` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_feature_value, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_feature_product (
  id_feature_value INT(10) UNSIGNED NOT NULL,
  id_product INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (id_feature_value, id_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORY PRODUCT
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_category_product (
  id_category INT(10) UNSIGNED NOT NULL,
  id_product INT(10) UNSIGNED NOT NULL,
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id_category, id_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CUSTOMERS / ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_customer (
  id_customer INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_shop INT(10) UNSIGNED NOT NULL DEFAULT 1,
  id_lang INT(10) UNSIGNED DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  passwd VARCHAR(255) NOT NULL,
  firstname VARCHAR(255) NOT NULL,
  lastname VARCHAR(255) NOT NULL,
  newsletter TINYINT(1) NOT NULL DEFAULT 0,
  optin TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  is_guest TINYINT(1) NOT NULL DEFAULT 0,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL,
  UNIQUE email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_address (
  id_address INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_country INT(10) UNSIGNED NOT NULL,
  id_state INT(10) UNSIGNED DEFAULT NULL,
  id_customer INT(10) UNSIGNED NOT NULL DEFAULT 0,
  id_manufacturer INT(10) UNSIGNED NOT NULL DEFAULT 0,
  id_supplier INT(10) UNSIGNED NOT NULL DEFAULT 0,
  alias VARCHAR(32) NOT NULL,
  company VARCHAR(255) DEFAULT NULL,
  lastname VARCHAR(255) NOT NULL,
  firstname VARCHAR(255) NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255) DEFAULT NULL,
  postcode VARCHAR(12) DEFAULT NULL,
  city VARCHAR(255) NOT NULL,
  phone VARCHAR(32) DEFAULT NULL,
  phone_mobile VARCHAR(32) DEFAULT NULL,
  other TEXT,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL,
  INDEX id_customer (id_customer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_orders (
  id_order INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(191) DEFAULT NULL,
  id_customer INT(10) UNSIGNED NOT NULL,
  id_cart INT(10) UNSIGNED NOT NULL,
  id_address_delivery INT(10) UNSIGNED NOT NULL,
  id_address_invoice INT(10) UNSIGNED NOT NULL,
  current_state INT(10) UNSIGNED NOT NULL,
  total_paid DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  total_paid_real DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  total_products DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  total_shipping DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  payment VARCHAR(255) NOT NULL,
  module VARCHAR(255) DEFAULT NULL,
  conversion_rate DECIMAL(13,6) NOT NULL DEFAULT 1.000000,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL,
  INDEX id_customer (id_customer),
  INDEX reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_order_detail (
  id_order_detail INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_order INT(10) UNSIGNED NOT NULL,
  id_product INT(10) UNSIGNED NOT NULL,
  id_product_attribute INT(10) UNSIGNED DEFAULT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_quantity INT(10) UNSIGNED NOT NULL DEFAULT 1,
  product_price DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  total_price_tax_incl DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  unit_price_tax_incl DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  INDEX id_order (id_order),
  INDEX id_product (id_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_carrier (
  id_carrier INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL,
  active TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  is_free TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  `position` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  deleted TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  date_add DATETIME NOT NULL,
  date_upd DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SPECIFIC PRICES (Discounts / Sale prices)
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_specific_price (
  id_specific_price INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_product INT(10) UNSIGNED DEFAULT NULL,
  id_shop INT(10) UNSIGNED DEFAULT NULL,
  id_customer INT(10) UNSIGNED DEFAULT NULL,
  id_cart INT(10) UNSIGNED DEFAULT NULL,
  from_quantity SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `reduction` DECIMAL(20,6) NOT NULL DEFAULT '0.000000',
  reduction_type VARCHAR(255) NOT NULL,
  `from` DATETIME NOT NULL,
  `to` DATETIME NOT NULL,
  INDEX id_product (id_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TAGS
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_tag (
  id_tag INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_lang INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_product_tag (
  id_product INT(10) UNSIGNED NOT NULL,
  id_tag INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (id_product, id_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDER STATE (status flow)
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_order_state (
  id_order_state INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  send_email TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  `color` VARCHAR(32) DEFAULT NULL,
  logable TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  paid TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  shipped TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  deleted TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ps_order_state_lang (
  id_order_state INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  template VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_order_state, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CARRIER (shipping)
-- ============================================================

CREATE TABLE IF NOT EXISTS ps_carrier_lang (
  id_carrier INT(10) UNSIGNED NOT NULL,
  id_lang INT(10) UNSIGNED NOT NULL,
  delay VARCHAR(512) DEFAULT NULL,
  PRIMARY KEY (id_carrier, id_lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
