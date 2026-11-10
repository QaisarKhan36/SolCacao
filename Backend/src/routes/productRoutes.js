// /api/products - public catalog with the filters the Catalog page sends.
import { Router } from 'express';
import { findProductBySku, listProducts } from '../models/productModel.js';
import { HttpError } from '../utils/httpError.js';
import { baseUrlFor, toProduct } from '../utils/mappers.js';
import { Validator } from '../utils/validator.js';

const router = Router();

// GET /api/products?search=&origin=Peru&origin=Ecuador&cacaoPctMin=&cacaoPctMax=&priceMin=&priceMax=
router.get('/', async (req, res) => {
  const query = req.query;
  const validator = new Validator(query);

  const search = validator.string('search', { required: false, max: 100 }) ?? undefined;
  // "origin" can repeat in the URL, so it may arrive as a string or an array.
  const origins = [].concat(query.origin ?? [])
    .filter(origin => typeof origin === 'string' && origin.trim())
    .map(origin => origin.trim().slice(0, 80));
  const cacaoPctMin = validator.number('cacaoPctMin', { required: false, min: 0, max: 100 });
  const cacaoPctMax = validator.number('cacaoPctMax', { required: false, min: 0, max: 100 });
  const priceMin = validator.number('priceMin', { required: false, min: 0, max: 100000 });
  const priceMax = validator.number('priceMax', { required: false, min: 0, max: 100000 });
  const seasonal = validator.boolean('seasonal', { required: false });
  const samplerEligible = validator.boolean('samplerEligible', { required: false });

  if (cacaoPctMin !== undefined && cacaoPctMax !== undefined && cacaoPctMin > cacaoPctMax) {
    validator.fail('cacaoPctMin', 'cacaoPctMin must not be greater than cacaoPctMax.');
  }
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    validator.fail('priceMin', 'priceMin must not be greater than priceMax.');
  }
  validator.assertValid();

  const rows = await listProducts({
    search, origins, cacaoPctMin, cacaoPctMax, priceMin, priceMax, seasonal, samplerEligible,
  });
  const baseUrl = baseUrlFor(req);
  res.json({ products: rows.map(row => toProduct(row, baseUrl)), count: rows.length });
});

router.get('/:sku', async (req, res) => {
  const row = await findProductBySku(req.params.sku);
  if (!row) throw new HttpError(404, 'product_not_found', 'No product with this SKU.');
  res.json({ product: toProduct(row, baseUrlFor(req)) });
});

export default router;
