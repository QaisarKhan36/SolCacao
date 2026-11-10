// /api/cart - keeps a signed-in customer's cart in the database.
//   POST /sync    (on sign-in and page reload) merge the browser cart into the account cart
//   POST /persist (on sign-out) save the browser cart as the account cart
//   GET  /        read the account cart
import { Router } from 'express';
import { withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureActiveCart, getCartRows, lockCartItems, replaceCartItems } from '../models/cartModel.js';
import { findActiveProductPrices } from '../models/productModel.js';
import { HttpError } from '../utils/httpError.js';
import { baseUrlFor, toProduct } from '../utils/mappers.js';

const router = Router();
router.use(requireAuth);

const MAX_LINES = 100;
const MAX_QUANTITY = 999;
const roundMoney = value => Math.round(value * 100) / 100;

// Body: [{ "productId": "ESM-72", "quantity": 2 }, ...]  ->  Map(productId -> quantity)
const readCartBody = body => {
  const lines = Array.isArray(body) ? body : body?.items;
  if (!Array.isArray(lines)) {
    throw new HttpError(400, 'validation_error', 'Send the cart as a JSON array of { productId, quantity }.');
  }
  if (lines.length > MAX_LINES) {
    throw new HttpError(400, 'validation_error', `A cart can have at most ${MAX_LINES} lines.`);
  }

  const quantities = new Map();
  const errors = [];
  lines.forEach((line, index) => {
    const productId = ['string', 'number'].includes(typeof line?.productId) ? String(line.productId).trim() : '';
    const quantity = Number(line?.quantity);
    if (!productId || productId.length > 40) {
      errors.push({ field: `[${index}].productId`, message: 'productId is required.' });
    } else if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      errors.push({ field: `[${index}].quantity`, message: `quantity must be a whole number from 1 to ${MAX_QUANTITY}.` });
    } else {
      quantities.set(productId, Math.min(MAX_QUANTITY, (quantities.get(productId) ?? 0) + quantity));
    }
  });
  if (errors.length > 0) throw new HttpError(400, 'validation_error', 'Some cart lines are invalid.', errors);
  return quantities;
};

// Saves the cart in one transaction. Products that no longer exist are skipped
// and reported back. unit_price is the price when the item was first added
// (the schema's "price snapshot"), so it is kept for items already in the cart.
const saveCart = async (userId, incoming, { mergeWithAccountCart }) => withTransaction(async connection => {
  const cartId = await ensureActiveCart(connection, userId);
  const existing = await lockCartItems(connection, cartId);

  const skus = [...new Set([...incoming.keys(), ...existing.map(item => item.sku)])];
  const currentPrices = new Map(
    (await findActiveProductPrices(skus, connection)).map(product => [product.sku, product.price]),
  );
  const snapshotPrices = new Map(existing.map(item => [item.sku, item.unit_price]));

  const lines = new Map();
  if (mergeWithAccountCart) {
    for (const item of existing) {
      if (currentPrices.has(item.sku)) lines.set(item.sku, { quantity: item.quantity, unitPrice: item.unit_price });
    }
  }

  const skipped = [];
  for (const [sku, quantity] of incoming) {
    if (!currentPrices.has(sku)) {
      skipped.push(sku);
      continue;
    }
    // Merge keeps the larger quantity, so syncing the same cart twice (for
    // example after a page reload) never doubles the items.
    const saved = lines.get(sku);
    lines.set(sku, {
      quantity: Math.max(saved?.quantity ?? 0, quantity),
      unitPrice: snapshotPrices.get(sku) ?? currentPrices.get(sku),
    });
  }

  await replaceCartItems(connection, cartId, lines);
  return skipped;
});

// Response shape the frontend's cartApi.js reads: { items: [{ productId, quantity, product }] }
const cartResponse = async (req, skipped = []) => {
  const baseUrl = baseUrlFor(req);
  const items = (await getCartRows(req.user.user_id)).map(row => ({
    productId: row.sku,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    subtotal: roundMoney(row.quantity * row.unit_price),
    product: toProduct(row, baseUrl),
  }));
  return {
    items,
    total: roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0)),
    ...(skipped.length > 0 ? { skipped } : {}),
  };
};

router.get('/', async (req, res) => {
  res.json(await cartResponse(req));
});

router.post('/sync', async (req, res) => {
  const skipped = await saveCart(req.user.user_id, readCartBody(req.body), { mergeWithAccountCart: true });
  res.json(await cartResponse(req, skipped));
});

router.post('/persist', async (req, res) => {
  const skipped = await saveCart(req.user.user_id, readCartBody(req.body), { mergeWithAccountCart: false });
  res.json(await cartResponse(req, skipped));
});

export default router;
