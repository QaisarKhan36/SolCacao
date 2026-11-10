// Convert database rows (snake_case columns) into the JSON shapes the
// frontend reads (camelCase, localized { en, es } objects).
import { config } from '../config.js';

// Where this API is reachable, e.g. http://localhost:3000 (used for image links).
export const baseUrlFor = req => config.publicBaseUrl || `${req.protocol}://${req.get('host')}`;

export const splitName = fullName => {
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
};

export const toAccount = row => ({
  id: row.user_id,
  name: `${row.first_name} ${row.last_name}`.trim(),
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  accountType: row.role,
  companyName: row.company_name ?? '',
  taxId: row.tax_id ?? '',
  createdAt: row.created_at,
});

// Image paths are stored relative (/images/products/x.jpg). The frontend runs
// on another origin, so it needs an absolute URL.
const absoluteUrl = (value, baseUrl) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
};

export const toProduct = (row, baseUrl) => ({
  id: row.sku,
  sku: row.sku,
  name: { en: row.name_en, es: row.name_es },
  description: { en: row.description_en ?? '', es: row.description_es ?? '' },
  origin: row.origin ?? '',
  price: row.price,
  cacaoPct: row.cacao_percentage,
  imageUrl: absoluteUrl(row.image_url, baseUrl),
  samplerEligible: Boolean(row.is_sampler_eligible),
  seasonal: Boolean(row.is_seasonal),
  quantityAvailable: row.quantity_available ?? 0,
  inStock: (row.quantity_available ?? 0) > 0,
});

export const toQuote = row => ({
  quoteId: row.quote_id,
  companyName: row.company_name,
  origin: row.origin,
  targetPercentage: row.target_percentage,
  roast: row.roast,
  moldRequired: Boolean(row.mold_required),
  packagingTier: row.packaging_tier,
  estimatedUnits: row.estimated_units,
  cacaoProfile: row.cacao_profile,
  brandVectorFileName: row.vector_original_name ?? null,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
