const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const ACCESS_TOKEN_KEY = 'solcacao_access_token';
const ACCOUNT_STORAGE_KEY = 'solcacao_account';

export const USE_DEMO_AUTH = import.meta.env.VITE_USE_DEMO_AUTH === 'true'
  || (import.meta.env.DEV && import.meta.env.VITE_USE_DEMO_AUTH !== 'false');

const readJson = async response => {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : {};
};

const createApiError = (status, payload) => {
  const error = new Error(payload.message ?? 'Authentication request failed.');
  error.status = status;
  error.code = payload.code ?? (status === 401 ? 'invalid_credentials' : status === 409 ? 'account_exists' : 'auth_request_failed');
  return error;
};

export const fetchCurrentAccount = async (token = localStorage.getItem(ACCESS_TOKEN_KEY), { signal } = {}) => {
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) throw createApiError(response.status, payload);

  const account = payload.user ?? payload.account ?? payload.data?.user ?? payload.data?.account ?? payload.data ?? payload;
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  return account;
};

const authenticate = async (endpoint, body) => {
  if (USE_DEMO_AUTH) {
    const account = {
      id: `demo-${body.email.toLowerCase()}`,
      name: body.name ?? body.email.split('@')[0],
      email: body.email,
      accountType: body.accountType ?? 'retail',
      companyName: body.companyName ?? '',
      taxId: body.taxId ?? '',
      demo: true,
    };
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    return { account, token: null, demo: true };
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) throw createApiError(response.status, payload);

  const token = payload.accessToken ?? payload.token ?? payload.data?.accessToken ?? payload.data?.token;
  if (!token) {
    const error = new Error('The authentication response did not include an access token.');
    error.code = 'missing_access_token';
    throw error;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  try {
    const account = await fetchCurrentAccount(token);
    return { account, token, demo: false };
  } catch (error) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    throw error;
  }
};

export const loginAccount = credentials => authenticate('/api/auth/login', credentials);

export const registerAccount = accountDetails => authenticate('/api/auth/register', accountDetails);

export const updateCurrentAccount = async (updates) => {
  const storedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  const currentAccount = storedAccount ? JSON.parse(storedAccount) : {};

  if (USE_DEMO_AUTH) {
    const updatedAccount = { ...currentAccount, ...updates };
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updatedAccount));
    return updatedAccount;
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    const error = new Error('missing_access_token');
    error.code = 'missing_access_token';
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  const payload = await readJson(response);
  if (!response.ok) throw createApiError(response.status, payload);

  const account = response.status === 204
    ? { ...currentAccount, ...updates }
    : payload.user ?? payload.account ?? payload.data?.user ?? payload.data?.account ?? payload.data ?? payload;
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  return account;
};

export const restoreAccountSession = async () => {
  if (USE_DEMO_AUTH) {
    const account = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    return account ? { account: JSON.parse(account), token: null, demo: true } : null;
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  try {
    const account = await fetchCurrentAccount(token);
    return { account, token, demo: false };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      return null;
    }
    throw error;
  }
};

export const clearAccountSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
};