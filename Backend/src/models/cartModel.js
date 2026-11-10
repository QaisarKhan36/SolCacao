// SQL for CART (entity 6) and CART_ITEM (entity 7).
import { pool } from '../db.js';
import { PRODUCT_COLUMNS } from './productModel.js';

// Returns the user's cart id, creating the cart if needed. One statement, so two
// requests at the same time cannot create two carts (UNIQUE(user_id) = 1:1).
// LAST_INSERT_ID(cart_id) makes insertId return the existing id on a duplicate.
export const ensureActiveCart = async (connection, userId) => {
  const [result] = await connection.query(
    `INSERT INTO cart (user_id, status) VALUES (?, 'active')
     ON DUPLICATE KEY UPDATE status = 'active', cart_id = LAST_INSERT_ID(cart_id)`,
    [userId],
  );
  return result.insertId;
};

// Reads the current items and locks them until the transaction ends.
export const lockCartItems = async (connection, cartId) => {
  const [rows] = await connection.query(
    'SELECT sku, quantity, unit_price FROM cart_item WHERE cart_id = ? ORDER BY cart_item_id FOR UPDATE',
    [cartId],
  );
  return rows;
};

// items: Map(sku -> { quantity, unitPrice }). cart_item_id is the weak entity's
// partial key, numbered 1..n inside each cart.
export const replaceCartItems = async (connection, cartId, items) => {
  await connection.query('DELETE FROM cart_item WHERE cart_id = ?', [cartId]);
  if (items.size === 0) return;

  const rows = [...items].map(([sku, item], index) => [cartId, index + 1, sku, item.quantity, item.unitPrice]);
  await connection.query(
    'INSERT INTO cart_item (cart_id, cart_item_id, sku, quantity, unit_price) VALUES ?',
    [rows],
  );
};

export const getCartRows = async userId => {
  const [rows] = await pool.query(
    `SELECT ci.cart_item_id, ci.quantity, ci.unit_price, ci.added_at, ${PRODUCT_COLUMNS}
     FROM cart c
     JOIN cart_item ci ON ci.cart_id = c.cart_id
     JOIN product p ON p.sku = ci.sku
     LEFT JOIN inventory i ON i.sku = p.sku
     WHERE c.user_id = ?
     ORDER BY ci.cart_item_id`,
    [userId],
  );
  return rows;
};
