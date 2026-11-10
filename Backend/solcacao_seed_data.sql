-- ============================================================================
-- SolCacao Platform - Phase 1: Sample Seed Data (for demo / testing)
-- Run AFTER solcacao_schema.sql
-- ============================================================================
USE solcacao;

-- Users: one retail customer, one B2B account
INSERT INTO `user` (email, password_hash, first_name, last_name, role, company_name, tax_id) VALUES
('maria.garcia@example.com',   '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Maria', 'Garcia', 'retail', NULL,                       NULL),
('ramon.torres@chocolatier.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ramon', 'Torres', 'b2b',  'Chocolatier del Valle SAS', 'CO-901234567');

-- Addresses (weak entity: address_id numbered per user)
INSERT INTO address (user_id, address_id, street, city, state, postal_code, country, address_type, is_default) VALUES
(1, 1, 'Calle 10 #25-40, Apt 3B', 'Bogota',   'Cundinamarca', '110111', 'CO', 'shipping', TRUE),
(1, 2, 'Carrera 7 #71-21',        'Bogota',   'Cundinamarca', '110231', 'CO', 'billing',  FALSE),
(2, 1, 'Av. Industria 45, Zona Industrial', 'Medellin', 'Antioquia', '050015', 'CO', 'shipping', TRUE);

-- Localization dictionary
INSERT INTO localization (lang_code, locale_name) VALUES ('en', 'English'), ('es', 'Espanol');

INSERT INTO translation (lang_code, tkey, tvalue) VALUES
('en', 'nav.home',           'Home'),
('es', 'nav.home',           'Inicio'),
('en', 'nav.shop',           'Shop'),
('es', 'nav.shop',           'Tienda'),
('en', 'nav.b2b',            'Wholesale'),
('es', 'nav.b2b',            'Mayorista'),
('en', 'product.add_to_cart','Add to cart'),
('es', 'product.add_to_cart','Anadir al carrito'),
('en', 'cart.title',         'Your cart'),
('es', 'cart.title',         'Tu carrito');

-- Products (multivalued images resolved into product_image)
INSERT INTO product (sku, name_en, name_es, description_en, description_es, price, cacao_percentage, origin) VALUES
('SOL-70-EC', 'Sol 70% Dark - Ecuador', 'Sol 70% Oscuro - Ecuador',
 'Single-origin dark chocolate with floral and red-fruit notes.',
 'Chocolate oscuro de origen unico con notas florales y de frutos rojos.',
 12.50, 70.0, 'Ecuador'),
('SOL-85-PE', 'Sol 85% Dark - Peru', 'Sol 85% Oscuro - Peru',
 'Intense high-cacao bar, slow-roasted Peruvian beans.',
 'Barra intensa de alto cacao, con tostion lenta de granos peruanos.',
 14.00, 85.0, 'Peru'),
('SOL-60-MX', 'Sol 60% Milk - Mexico', 'Sol 60% con Leche - Mexico',
 'Smooth milk chocolate made with single-estate cacao.',
 'Chocolate con leche suave de cacao de finca unica.',
 11.00, 60.0, 'Mexico');

INSERT INTO product_image (sku, image_url, alt_text, sort_order) VALUES
('SOL-70-EC', '/images/products/SOL-70-EC-front.jpg', 'Sol 70% front',        1),
('SOL-70-EC', '/images/products/SOL-70-EC-box.jpg',   'Sol 70% gift box',     2),
('SOL-85-PE', '/images/products/SOL-85-PE-front.jpg', 'Sol 85% front',        1),
('SOL-60-MX', '/images/products/SOL-60-MX-front.jpg', 'Sol 60% milk front',   1);

-- Inventory (1:1 with product; last two rows trigger the low-stock view)
INSERT INTO inventory (sku, quantity_available, low_stock_threshold) VALUES
('SOL-70-EC', 120, 20),
('SOL-85-PE',   8, 15),
('SOL-60-MX',   0, 10);

-- Carts: cart 1 = registered user, cart 2 = guest (session token), cart 3 = converted B2B order
INSERT INTO cart (cart_id, user_id, session_token, status) VALUES
(1, 1,              NULL,           'active'),
(2, NULL,           'sess-a1b2c3d4', 'active'),
(3, 2,              NULL,           'converted');

INSERT INTO cart_item (cart_id, cart_item_id, sku, quantity, unit_price) VALUES
(1, 1, 'SOL-70-EC',  2, 12.50),
(1, 2, 'SOL-85-PE',  1, 14.00),
(2, 1, 'SOL-60-MX',  3, 11.00),
(3, 1, 'SOL-70-EC', 50, 10.00);   -- wholesale snapshot price, not the retail price

-- B2B quote requests (one authenticated, one anonymous lead)
INSERT INTO b2b_quote_request (user_id, company_name, cacao_profile, packaging_tier, estimated_units, vector_logo_url, status) VALUES
(2,    'Chocolatier del Valle SAS', '70% Ecuadorian Nacional, fruity profile', 'custom',   500, '/uploads/logos/chocolatier-valle.svg', 'under_review'),
(NULL, 'Dulce Cacao Ltda.',         '60% milk, nutty profile',                 'standard', 200, NULL,                                   'pending');

-- Inquiries (one guest, one from a registered user)
INSERT INTO inquiry (user_id, sender_name, sender_email, category, message, whatsapp_reference) VALUES
(NULL, 'Ana Ruiz',       'ana.ruiz@example.com',       'wholesale', 'Do you ship wholesale orders to Cali?', '+57 300 123 4567'),
(1,    'Maria Garcia',   'maria.garcia@example.com',   'product',   'Is the 85% bar vegan?', NULL);
