// /api/reports - business reports for the SolCacao team.
// Every request needs the X-Admin-Key header (value of ADMIN_API_KEY in .env).
import { Router } from 'express';
import { requireAdminKey } from '../middleware/auth.js';
import {
  activeCartTotals, inquiriesByCategory, lowStock, quotesByStatus, samplerFavorites,
} from '../models/reportModel.js';

const router = Router();
router.use(requireAdminKey);

const roundMoney = value => Math.round(value * 100) / 100;

// Products at or below their restock threshold (Phase 1 view v_low_stock).
router.get('/low-stock', async (req, res) => {
  const rows = await lowStock();
  res.json({
    count: rows.length,
    items: rows.map(row => ({
      sku: row.sku,
      name: row.name_en,
      quantityAvailable: row.quantity_available,
      lowStockThreshold: row.low_stock_threshold,
    })),
  });
});

// B2B pipeline: how many quotes are in each status and how many units they cover.
router.get('/quotes', async (req, res) => {
  const rows = await quotesByStatus();
  res.json({
    total: rows.reduce((sum, row) => sum + row.quote_count, 0),
    byStatus: rows.map(row => ({ status: row.status, count: row.quote_count, totalUnits: Number(row.total_units) })),
  });
});

// Contact form: inquiries per category and the most requested sampler chocolates.
router.get('/inquiries', async (req, res) => {
  const [categories, favorites] = await Promise.all([inquiriesByCategory(), samplerFavorites()]);
  res.json({
    total: categories.reduce((sum, row) => sum + row.inquiry_count, 0),
    byCategory: categories.map(row => ({ category: row.category, count: row.inquiry_count })),
    samplerFavorites: favorites.map(row => ({ sku: row.sku, name: row.name_en, timesSelected: row.times_selected })),
  });
});

// Open carts and their value (Phase 1 view v_cart_total).
router.get('/carts', async (req, res) => {
  const rows = await activeCartTotals();
  res.json({
    activeCarts: rows.length,
    totalValue: roundMoney(rows.reduce((sum, row) => sum + row.cart_total, 0)),
    carts: rows.map(row => ({ cartId: row.cart_id, userId: row.user_id, total: row.cart_total })),
  });
});

export default router;
