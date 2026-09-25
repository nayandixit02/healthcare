const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('eve_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const url = endpoint.startsWith('http') || endpoint.startsWith('/payments') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.detail || (data.errors ? data.errors.map(e => e.message).join(', ') : 'Request failed');
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getMe: () => request('/auth/me'),

  // Diagnostic Centres
  getCentres: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/centres${query ? `?${query}` : ''}`);
  },
  getCentre: (id) => request(`/centres/${id}`),
  createCentre: (payload) => request('/centres', { method: 'POST', body: payload }),
  addTestToCentre: (centreId, payload) => request(`/centres/${centreId}/tests`, { method: 'POST', body: payload }),

  // Diagnostic Tests
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tests${query ? `?${query}` : ''}`);
  },
  createTest: (payload) => request('/tests', { method: 'POST', body: payload }),

  // Bookings
  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }),
  getBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/bookings${query ? `?${query}` : ''}`);
  },
  getBooking: (id) => request(`/bookings/${id}`),
  cancelBooking: (id, payload = {}) => request(`/bookings/${id}/cancel`, { method: 'POST', body: payload }),

  // Payments (Simulated)
  simulatePayment: (payload) => request('/payments', { method: 'POST', body: payload }),

  // Webhook
  sendWebhook: (payload) => request('/payments/webhook', { method: 'POST', body: payload }),

  // Health
  getHealth: () => request('/health')
};
