const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const ACCESS_TOKEN_KEY = 'solcacao_access_token';

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const getCartPayload = (cart) => cart.map(item => ({
  productId: String(item.id),
  quantity: item.quantity,
}));

const readCartResponse = async (response, localCart) => {
  if (!response.ok) throw new Error(`cart_request_failed_${response.status}`);
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  const payload = await response.json();
  const entries = Array.isArray(payload)
    ? payload
    : payload.items ?? payload.cart ?? payload.data?.items ?? payload.data?.cart;

  if (!Array.isArray(entries)) throw new Error('invalid_cart_response');

  return entries.map(entry => {
    const product = entry.product ?? entry;
    const id = String(entry.productId ?? product.id ?? product._id ?? '');
    const localItem = localCart.find(item => String(item.id) === id);
    const quantity = Number(entry.quantity);

    if (!id || !Number.isInteger(quantity) || quantity < 1) return null;

    return {
      ...localItem,
      ...product,
      id,
      quantity,
      price: Number(product.price ?? localItem?.price),
    };
  }).filter(item => item && Number.isFinite(item.price));
};

const postCart = async (endpoint, cart, { signal } = {}) => {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(getCartPayload(cart)),
    signal,
  });

  return readCartResponse(response, cart);
};

export const syncCartWithAccount = (guestCart, options) => postCart('/api/cart/sync', guestCart, options);

export const persistCartForAccount = (cart, options) => postCart('/api/cart/persist', cart, options);