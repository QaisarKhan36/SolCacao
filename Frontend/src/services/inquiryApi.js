const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const submitInquiry = async (inquiry, { signal } = {}) => {
  const payload = {
    name: inquiry.name.trim(),
    email: inquiry.email.trim(),
    category: inquiry.category,
    message: inquiry.message.trim(),
  };
  if (inquiry.samplerSelections) payload.samplerSelections = inquiry.samplerSelections;

  const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const error = new Error('inquiry_request_failed');
    error.code = 'inquiry_request_failed';
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return {};

  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : {};
};