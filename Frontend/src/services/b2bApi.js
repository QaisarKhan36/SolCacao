const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const ACCESS_TOKEN_KEY = 'solcacao_access_token';

export const submitB2BQuote = async (quote, { signal } = {}) => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    const error = new Error('missing_access_token');
    error.code = 'missing_access_token';
    throw error;
  }

  const formData = new FormData();
  formData.append('origin', quote.origin);
  formData.append('targetPercentage', String(quote.targetPercentage));
  formData.append('roast', quote.roast);
  formData.append('moldRequired', String(quote.moldRequired));
  formData.append('packagingTier', quote.packagingTier);
  formData.append('estimatedUnits', String(quote.estimatedUnits));
  if (quote.techPack) formData.append('brandVector', quote.techPack, quote.techPack.name);

  const response = await fetch(`${API_BASE_URL}/api/b2b/quote`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    const error = new Error('quote_request_failed');
    error.code = response.status === 401 || response.status === 403
      ? 'quote_unauthorized'
      : 'quote_request_failed';
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return {};

  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : {};
};