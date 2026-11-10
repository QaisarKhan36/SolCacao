-- ============================================================================
-- SolCacao Platform - Phase 1 Deliverable: Relational Database Schema (DDL)
-- ----------------------------------------------------------------------------
-- Target DBMS : MySQL 8.0+ (InnoDB, utf8mb4)
-- Source      : solcacao_erd.html (Chen ERD + entity/relationship mapping tables)
-- Team        : SolCacao - Bilingual D2C Retail & B2B Wholesale Platform
-- Notes       : CHECK constraints are enforced from MySQL 8.0.16 onwards.
--               Section numbers in comments reference the ERD entities 1-9.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS solcacao
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE solcacao;

-- Drops in reverse dependency order so the script can be re-run cleanly.
DROP VIEW  IF EXISTS v_low_stock;
DROP VIEW  IF EXISTS v_cart_total;
DROP VIEW  IF EXISTS v_cart_item_detail;
DROP TABLE IF EXISTS inquiry;
DROP TABLE IF EXISTS b2b_quote_request;
DROP TABLE IF EXISTS cart_item;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS product_image;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS translation;
DROP TABLE IF EXISTS localization;
DROP TABLE IF EXISTS address;
DROP TABLE IF EXISTS `user`;

-- ----------------------------------------------------------------------------
-- 1. USER  (Strong entity - no parent, PK = user_id)
--    Composite attribute "name" is flattened into first_name / last_name.
-- ----------------------------------------------------------------------------
CREATE TABLE `user` (
  user_id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  email           VARCHAR(190)  NOT NULL,              -- UNIQUE: natural identifier for login
  password_hash   VARCHAR(255)  NOT NULL,
  first_name      VARCHAR(60)   NOT NULL,              -- composite name -> first
  last_name       VARCHAR(60)   NOT NULL,              -- composite name -> last
  role            ENUM('retail','b2b') NOT NULL DEFAULT 'retail',
  company_name    VARCHAR(120)  NULL,                  -- populated for B2B accounts
  tax_id          VARCHAR(30)   NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_user PRIMARY KEY (user_id),
  CONSTRAINT uq_user_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. ADDRESS  (Weak entity, identifying relationship USER 1:N ADDRESS)
--    Weak-entity mapping rule: PK = (owner PK + partial key) = (user_id, address_id).
--    Total participation (double line in ERD) -> ON DELETE CASCADE.
-- ----------------------------------------------------------------------------
CREATE TABLE address (
  user_id       INT UNSIGNED NOT NULL,
  address_id    INT UNSIGNED NOT NULL,                 -- partial key, unique per user
  street        VARCHAR(160) NOT NULL,
  city          VARCHAR(80)  NOT NULL,
  state         VARCHAR(80)  NULL,
  postal_code   VARCHAR(20)  NOT NULL,
  country       CHAR(2)      NOT NULL,                 -- ISO-3166-1 alpha-2
  address_type  ENUM('shipping','billing') NOT NULL DEFAULT 'shipping',
  is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT pk_address PRIMARY KEY (user_id, address_id),
  CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. LOCALIZATION  (Strong entity, PK = lang_code)
-- ----------------------------------------------------------------------------
CREATE TABLE localization (
  lang_code   CHAR(2)     NOT NULL,
  locale_name VARCHAR(40) NOT NULL,
  CONSTRAINT pk_localization PRIMARY KEY (lang_code),
  CONSTRAINT ck_localization_code CHECK (lang_code IN ('en','es'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--    Multivalued "translations" key-value dictionary is resolved into its own
--    relation (1NF): one row per (language, key) pair.
CREATE TABLE translation (
  lang_code CHAR(2)      NOT NULL,
  tkey      VARCHAR(100) NOT NULL,
  tvalue    TEXT         NOT NULL,
  CONSTRAINT pk_translation PRIMARY KEY (lang_code, tkey),
  CONSTRAINT fk_translation_lang FOREIGN KEY (lang_code) REFERENCES localization (lang_code)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. PRODUCT  (Strong entity, PK = sku - natural business key)
--    Bilingual name/description resolved into atomic per-language columns.
-- ----------------------------------------------------------------------------
CREATE TABLE product (
  sku               VARCHAR(40)   NOT NULL,
  name_en           VARCHAR(120)  NOT NULL,
  name_es           VARCHAR(120)  NOT NULL,
  description_en    TEXT          NULL,
  description_es    TEXT          NULL,
  price             DECIMAL(10,2) NOT NULL,
  cacao_percentage  DECIMAL(5,1)  NULL,
  origin            VARCHAR(80)   NULL,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product PRIMARY KEY (sku),
  CONSTRAINT ck_product_price_nonneg CHECK (price >= 0),
  CONSTRAINT ck_product_cacao_range  CHECK (cacao_percentage BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--    Multivalued attribute "images" (double oval in ERD) -> separate relation.
CREATE TABLE product_image (
  image_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku        VARCHAR(40)  NOT NULL,
  image_url  VARCHAR(255) NOT NULL,
  alt_text   VARCHAR(160) NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT pk_product_image PRIMARY KEY (image_id),
  CONSTRAINT uq_product_image UNIQUE (sku, image_url),
  CONSTRAINT fk_product_image_product FOREIGN KEY (sku) REFERENCES product (sku)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. INVENTORY  (Weak entity, identifying PRODUCT 1:1 INVENTORY)
--    Total-total participation: PK = FK = sku, one row per product exactly.
-- ----------------------------------------------------------------------------
CREATE TABLE inventory (
  sku                 VARCHAR(40)  NOT NULL,
  quantity_available  INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10,
  last_updated        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_inventory PRIMARY KEY (sku),
  CONSTRAINT fk_inventory_product FOREIGN KEY (sku) REFERENCES product (sku)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. CART  (Strong entity; USER 1:1 CART, partial-partial -> user_id NULL for
--    guest carts. UNIQUE(user_id) enforces the 1:1; NULLs are exempt, so many
--    guest carts can exist without a user.)
-- ----------------------------------------------------------------------------
CREATE TABLE cart (
  cart_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NULL,
  session_token  VARCHAR(64) NULL,
  status         ENUM('active','converted','abandoned') NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_cart PRIMARY KEY (cart_id),
  CONSTRAINT uq_cart_user    UNIQUE (user_id),
  CONSTRAINT uq_cart_session UNIQUE (session_token),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. CART_ITEM  (Weak entity, identifying CART 1:N CART_ITEM)
--    PK = (cart_id, cart_item_id). PRODUCT 1:N CART_ITEM adds sku FK.
--    "subtotal" is DERIVED -> not stored; provided by view v_cart_item_detail.
-- ----------------------------------------------------------------------------
CREATE TABLE cart_item (
  cart_id      INT UNSIGNED  NOT NULL,
  cart_item_id INT UNSIGNED  NOT NULL,                 -- partial key, unique per cart
  sku          VARCHAR(40)   NOT NULL,
  quantity     INT UNSIGNED NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,                 -- price snapshot at add-time
  added_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_cart_item PRIMARY KEY (cart_id, cart_item_id),
  CONSTRAINT uq_cart_item_sku UNIQUE (cart_id, sku),   -- one line per product per cart
  CONSTRAINT ck_cart_item_qty   CHECK (quantity > 0),
  CONSTRAINT ck_cart_item_price CHECK (unit_price >= 0),
  CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES cart (cart_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cart_item_product FOREIGN KEY (sku) REFERENCES product (sku)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. B2B_QUOTE_REQUEST  (Strong entity; USER 1:N, partial-partial ->
--    user_id NULL so unauthenticated leads can still submit quotes.)
-- ----------------------------------------------------------------------------
CREATE TABLE b2b_quote_request (
  quote_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NULL,
  company_name     VARCHAR(120) NOT NULL,
  cacao_profile    VARCHAR(255) NULL,
  packaging_tier   ENUM('standard','premium','custom') NOT NULL DEFAULT 'standard',
  estimated_units  INT UNSIGNED NULL,
  vector_logo_url  VARCHAR(255) NULL,
  status           ENUM('pending','under_review','quoted','accepted','declined')
                   NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_b2b_quote PRIMARY KEY (quote_id),
  CONSTRAINT fk_quote_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_quote_status ON b2b_quote_request (status);

-- ----------------------------------------------------------------------------
-- 9. INQUIRY  (Strong entity; USER 1:N per diagram page 1 -> nullable FK;
--    sender_name/sender_email kept so guest inquiries remain possible.)
-- ----------------------------------------------------------------------------
CREATE TABLE inquiry (
  inquiry_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NULL,
  sender_name        VARCHAR(100)  NOT NULL,
  sender_email       VARCHAR(190)  NOT NULL,
  category           ENUM('general','wholesale','product','support','partnership')
                     NOT NULL DEFAULT 'general',
  message            TEXT          NOT NULL,
  whatsapp_reference VARCHAR(30)   NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_inquiry PRIMARY KEY (inquiry_id),
  CONSTRAINT fk_inquiry_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_inquiry_category ON inquiry (category);
CREATE INDEX idx_inquiry_email    ON inquiry (sender_email);

-- ----------------------------------------------------------------------------
-- VIEWS - derived attributes & business queries
-- ----------------------------------------------------------------------------
CREATE VIEW v_cart_item_detail AS
SELECT ci.cart_id,
       ci.cart_item_id,
       ci.sku,
       p.name_en,
       p.name_es,
       ci.quantity,
       ci.unit_price,
       (ci.quantity * ci.unit_price) AS subtotal     -- derived attribute (dashed oval)
FROM cart_item ci
JOIN product p ON p.sku = ci.sku;

CREATE VIEW v_cart_total AS
SELECT cart_id,
       SUM(quantity * unit_price) AS cart_total
FROM cart_item
GROUP BY cart_id;

CREATE VIEW v_low_stock AS
SELECT i.sku,
       p.name_en,
       i.quantity_available,
       i.low_stock_threshold
FROM inventory i
JOIN product p ON p.sku = i.sku
WHERE i.quantity_available <= i.low_stock_threshold;

-- ============================================================================
-- End of schema - 9 entities implemented as 11 base relations + 3 views.
-- ============================================================================
