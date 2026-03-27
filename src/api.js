const API = 'https://vajravel-backend1.onrender.com/api';
import { db } from './db';

async function request(url, options = {}) {
  const token = localStorage.getItem('pos_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
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
  } catch (err) {
    console.warn(`API Request failed (${url}):`, err.message);
    throw err;
  }
}

export const api = {
  // Auth & Users
  login: async (username, password) => {
    try {
      const resp = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      if (resp.user) {
        // Save user profile locally for offline authentication
        await db.users.put({ ...resp.user, cachedAt: new Date().toISOString() });
      }
      return resp;
    } catch (err) {
      // Offline fallback: check local IndexedDB
      const localUser = await db.users.get(username);
      if (localUser) {
        console.warn('Offline login successful for:', username);
        return { token: 'offline_token', user: localUser, isOffline: true };
      }
      throw err;
    }
  },
  getUsers: () => request('/users'),
  addUser: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Categories
  getCategories: async () => {
    try {
      const categories = await request('/categories');
      await db.categories.clear();
      await db.categories.bulkAdd(categories);
      return categories;
    } catch (err) {
      return await db.categories.toArray();
    }
  },
  addCategory: (name) => request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  // Products
  getProducts: async () => {
    try {
      const products = await request('/products');
      await db.products.clear();
      await db.products.bulkAdd(products);
      return products;
    } catch (err) {
      console.log('Using offline product cache');
      return await db.products.toArray();
    }
  },
  addProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: async () => {
    try {
      const remote = await request('/sales');
      const localUnsynced = await db.sales.where('synced').equals(0).toArray();
      return [...localUnsynced, ...remote];
    } catch (err) {
      return await db.sales.toArray();
    }
  },
  createSale: async (data) => {
    // 1. Save locally first
    const localId = await db.sales.add({ ...data, synced: 0, date: new Date().toISOString() });
    
    try {
      // 2. Try to push to remote
      const sale = await request('/sales', { method: 'POST', body: JSON.stringify(data) });
      // 3. Mark as synced
      await db.sales.update(localId, { synced: 1, id: sale.id });
      return sale;
    } catch (err) {
      console.warn('Sale saved offline. Will sync later.');
      const offlineSale = await db.sales.get(localId);
      return { ...offlineSale, id: `offline_${localId}`, isOffline: true };
    }
  },
  clearSales: () => request('/sales', { method: 'DELETE' }),

  // Seed
  seed: () => request('/seed', { method: 'POST' }),

  // Local Sync Helpers
  getUnsyncedCount: () => db.sales.where('synced').equals(0).count(),
  syncOfflineSales: async () => {
    const unsynced = await db.sales.where('synced').equals(0).toArray();
    let count = 0;
    for (const sale of unsynced) {
      try {
        const { localId, synced, ...payload } = sale;
        const remote = await request('/sales', { method: 'POST', body: JSON.stringify(payload) });
        await db.sales.update(localId, { synced: 1, id: remote.id });
        count++;
      } catch (err) { /* ignore single fails */ }
    }
    return count;
  }
};

