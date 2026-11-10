-- ============================================================================
-- SolCacao Platform - Phase 3: Schema Migration
-- ----------------------------------------------------------------------------
-- Run AFTER solcacao_schema.sql and solcacao_seed_data.sql (Phase 1).
-- The Phase 1 files are kept unchanged. This script adds only what the
-- Phase 2 frontend needs that the Phase 1 design did not have yet.
-- Every change is additive, so all Phase 1 seed rows remain valid.
-- ============================================================================

USE solcacao;

-- ----------------------------------------------------------------------------
-- 4. PRODUCT - storefront feature flags
--    samplerEligible -> product can be picked in the Contact sampler flight
--    seasonal        -> product appears in the home "seasonal" showcase
-- ----------------------------------------------------------------------------
ALTER TABLE product
  ADD COLUMN is_sampler_eligible BOOLEAN NOT NULL DEFAULT FALSE AFTER origin,
  ADD COLUMN is_seasonal         BOOLEAN NOT NULL DEFAULT FALSE AFTER is_sampler_eligible;

-- Supports the catalog "origin" filter.
CREATE INDEX idx_product_origin ON product (origin);

-- ----------------------------------------------------------------------------
-- 8. B2B_QUOTE_REQUEST - structured fields from the 4-step B2B wizard
--    Phase 1 stored the cacao profile as free text only. The wizard sends
--    origin, target %, roast and mold choice separately, so each gets a column.
--    cacao_profile is still filled with a readable summary for compatibility.
-- ----------------------------------------------------------------------------
ALTER TABLE b2b_quote_request
  ADD COLUMN origin               VARCHAR(80)  NULL AFTER company_name,
  ADD COLUMN target_percentage    DECIMAL(5,1) NULL AFTER origin,
  ADD COLUMN roast                ENUM('light','medium','dark') NULL AFTER target_percentage,
  ADD COLUMN mold_required        BOOLEAN      NOT NULL DEFAULT FALSE AFTER roast,
  ADD COLUMN vector_original_name VARCHAR(255) NULL AFTER vector_logo_url,
  ADD CONSTRAINT ck_quote_target_pct CHECK (target_percentage BETWEEN 0 AND 100);

-- ----------------------------------------------------------------------------
-- 9. INQUIRY - categories offered by the Contact page
--    Adds 'sampler' (Custom Sampler Flight Box) and 'gifts' (Corporate Gift
--    Packaging). The Phase 1 values are kept so existing rows stay valid.
-- ----------------------------------------------------------------------------
ALTER TABLE inquiry
  MODIFY category ENUM('general','wholesale','product','support','partnership','sampler','gifts')
                  NOT NULL DEFAULT 'general';

-- ----------------------------------------------------------------------------
-- 10. INQUIRY_SAMPLER_SELECTION  (Weak entity, identifying INQUIRY 1:N)
--     One row per chocolate a visitor picked for a sampler flight (max 4 slots).
--     Multivalued "samplerSelections" -> own relation (1NF), same rule used for
--     product_image in Phase 1. PK = (owner PK + partial key slot_number).
-- ----------------------------------------------------------------------------
CREATE TABLE inquiry_sampler_selection (
  inquiry_id  INT UNSIGNED     NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,                 -- partial key: 1..4
  sku         VARCHAR(40)      NOT NULL,
  CONSTRAINT pk_inquiry_sampler PRIMARY KEY (inquiry_id, slot_number),
  CONSTRAINT ck_inquiry_sampler_slot CHECK (slot_number BETWEEN 1 AND 4),
  CONSTRAINT fk_inquiry_sampler_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiry (inquiry_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_inquiry_sampler_product FOREIGN KEY (sku) REFERENCES product (sku)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- End of Phase 3 migration - 12 base relations + 3 views.
-- ============================================================================
