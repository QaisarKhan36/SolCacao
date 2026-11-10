import { normalizeProduct } from '../utils/products';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const fetchProducts = async (filters = {}, { signal } = {}) => {
  const params = new URLSearchParams();
  const search = (filters.search ?? '').trim();

  if (search) params.set('search', search);
  (filters.origins ?? []).forEach(origin => params.append('origin', origin));
  if (filters.minCacaoPct != null && filters.minCacaoPct !== '') params.set('cacaoPctMin', filters.minCacaoPct);
  if (filters.maxCacaoPct != null && filters.maxCacaoPct !== '') params.set('cacaoPctMax', filters.maxCacaoPct);
  if (filters.minPrice != null && filters.minPrice !== '') params.set('priceMin', filters.minPrice);
  if (filters.maxPrice != null && filters.maxPrice !== '') params.set('priceMax', filters.maxPrice);

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/products${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) throw new Error('product_request_failed');

  const payload = await response.json();
  const products = Array.isArray(payload)
    ? payload
    : payload.products ?? payload.data?.products ?? payload.data;

  if (!Array.isArray(products)) throw new Error('invalid_product_response');

  return products.map(normalizeProduct).filter(Boolean);
};