import { DEMO_PRODUCTS } from '../data/demoProducts';
import { fetchProducts } from './productApi';
import { normalizeProduct } from '../utils/products';

export const USE_DEMO_PRODUCTS = import.meta.env.VITE_USE_DEMO_PRODUCTS === 'true'
  || (import.meta.env.DEV && import.meta.env.VITE_USE_DEMO_PRODUCTS !== 'false');

export const NORMALIZED_DEMO_PRODUCTS = DEMO_PRODUCTS.map(normalizeProduct).filter(Boolean);

export const loadProducts = (filters, options) => {
  if (USE_DEMO_PRODUCTS) {
    return Promise.resolve(NORMALIZED_DEMO_PRODUCTS);
  }

  return fetchProducts(filters, options);
};