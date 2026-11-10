export const normalizeProduct = (product) => {
  const id = product.id ?? product._id ?? product.sku;
  const price = Number(product.price);
  const cacaoPct = Number(product.cacaoPct ?? product.cacaoPercentage);

  if (id === undefined || !Number.isFinite(price) || !Number.isFinite(cacaoPct)) {
    return null;
  }

  return {
    ...product,
    id: String(id),
    name: product.name ?? product.localizedName ?? '',
    description: product.description ?? product.localizedDescription ?? '',
    origin: product.origin ?? '',
    price,
    cacaoPct,
    imageUrl: product.imageUrl ?? product.image ?? '',
    samplerEligible: product.samplerEligible === true,
    seasonal: product.seasonal === true,
  };
};

export const getLocalizedProductText = (value, language) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  return value[language]
    ?? value.en
    ?? Object.values(value).find(text => typeof text === 'string')
    ?? '';
};