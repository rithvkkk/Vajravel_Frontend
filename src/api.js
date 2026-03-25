const API = 'https://vajravel-backend1.onrender.com/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('pos_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${url}`, {
    headers,
    ...options,
  });
  
  if (res.status === 401 || res.status === 403) {
    if (url !== '/auth/login') {
      localStorage.removeItem('pos_token');
      window.location.reload();
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Categories
  getCategories: () => request('/categories'),
  addCategory: (name) => request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  // Products
  getProducts: () => request('/products'),
  addProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: () => request('/sales'),
  createSale: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  clearSales: () => request('/sales', { method: 'DELETE' }),

  // Seed
  seed: () => request('/seed', { method: 'POST' }),
};
