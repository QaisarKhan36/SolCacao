// Business reports. These use the views defined in the Phase 1 schema
// (v_low_stock, v_cart_total) and the indexes on quote status / inquiry category.
import { pool } from '../db.js';

export const lowStock = async () => {
  const [rows] = await pool.query(
    `SELECT sku, name_en, quantity_available, low_stock_threshold
     FROM v_low_stock
     ORDER BY quantity_available, sku`,
  );
  return rows;
};

export const quotesByStatus = async () => {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS quote_count, COALESCE(SUM(estimated_units), 0) AS total_units
     FROM b2b_quote_request
     GROUP BY status
     ORDER BY FIELD(status, 'pending', 'under_review', 'quoted', 'accepted', 'declined')`,
  );
  return rows;
};

export const inquiriesByCategory = async () => {
  const [rows] = await pool.query(
    `SELECT category, COUNT(*) AS inquiry_count
     FROM inquiry
     GROUP BY category
     ORDER BY inquiry_count DESC, category`,
  );
  return rows;
};

// Which chocolates visitors pick most often for sampler flights.
export const samplerFavorites = async () => {
  const [rows] = await pool.query(
    `SELECT s.sku, p.name_en, COUNT(*) AS times_selected
     FROM inquiry_sampler_selection s
     JOIN product p ON p.sku = s.sku
     GROUP BY s.sku, p.name_en
     ORDER BY times_selected DESC, s.sku
     LIMIT 10`,
  );
  return rows;
};

export const activeCartTotals = async () => {
  const [rows] = await pool.query(
    `SELECT c.cart_id, c.user_id, t.cart_total
     FROM cart c
     JOIN v_cart_total t ON t.cart_id = c.cart_id
     WHERE c.status = 'active'
     ORDER BY t.cart_total DESC`,
  );
  return rows;
};
