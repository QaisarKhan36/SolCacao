// SQL for PRODUCT (entity 4) with its first PRODUCT_IMAGE and INVENTORY row.
import { pool } from '../db.js';

// Columns every product response needs. Reused by the cart queries.
export const PRODUCT_COLUMNS = `
  p.sku, p.name_en, p.name_es, p.description_en, p.description_es, p.price,
  p.cacao_percentage, p.origin, p.is_sampler_eligible, p.is_seasonal,
  COALESCE(i.quantity_available, 0) AS quantity_available,
  (SELECT pi.image_url FROM product_image pi
    WHERE pi.sku = p.sku ORDER BY pi.sort_order, pi.image_id LIMIT 1) AS image_url`;

const PRODUCT_FROM = `
  FROM product p
  LEFT JOIN inventory i ON i.sku = p.sku`;

// Treat % and _ typed by a visitor as normal characters in LIKE searches.
const escapeLike = value => value.replace(/[\\%_]/g, character => `\\${character}`);

export const listProducts = async (filters = {}) => {
  const conditions = ['p.is_active = TRUE'];
  const params = [];

  if (filters.search) {
    // utf8mb4_unicode_ci makes this case- and accent-insensitive (jazmin = jazmín).
    const term = `%${escapeLike(filters.search)}%`;
    conditions.push(`(p.name_en LIKE ? OR p.name_es LIKE ? OR p.sku LIKE ? OR p.origin LIKE ?
      OR p.description_en LIKE ? OR p.description_es LIKE ?)`);
    params.push(term, term, term, term, term, term);
  }
  if (filters.origins?.length) {
    conditions.push('p.origin IN (?)');
    params.push(filters.origins);
  }
  if (filters.cacaoPctMin !== undefined) {
    conditions.push('p.cacao_percentage >= ?');
    params.push(filters.cacaoPctMin);
  }
  if (filters.cacaoPctMax !== undefined) {
    conditions.push('p.cacao_percentage <= ?');
    params.push(filters.cacaoPctMax);
  }
  if (filters.priceMin !== undefined) {
    conditions.push('p.price >= ?');
    params.push(filters.priceMin);
  }
  if (filters.priceMax !== undefined) {
    conditions.push('p.price <= ?');
    params.push(filters.priceMax);
  }
  if (filters.seasonal !== undefined) {
    conditions.push('p.is_seasonal = ?');
    params.push(filters.seasonal);
  }
  if (filters.samplerEligible !== undefined) {
    conditions.push('p.is_sampler_eligible = ?');
    params.push(filters.samplerEligible);
  }

  const [rows] = await pool.query(
    `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM}
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.name_en`,
    params,
  );
  return rows;
};

export const findProductBySku = async sku => {
  const [rows] = await pool.query(
    `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM} WHERE p.is_active = TRUE AND p.sku = ?`,
    [sku],
  );
  return rows[0] ?? null;
};

// sku + current price for the given SKUs that are still for sale.
export const findActiveProductPrices = async (skus, connection = pool) => {
  if (skus.length === 0) return [];
  const [rows] = await connection.query(
    'SELECT sku, price FROM product WHERE is_active = TRUE AND sku IN (?)',
    [skus],
  );
  return rows;
};

export const findSamplerEligibleSkus = async skus => {
  if (skus.length === 0) return [];
  const [rows] = await pool.query(
    'SELECT sku FROM product WHERE is_active = TRUE AND is_sampler_eligible = TRUE AND sku IN (?)',
    [skus],
  );
  return rows.map(row => row.sku);
};
