const API = import.meta.env.VITE_API_URL || 'https://vajravel-backend1.onrender.com/api';
import * as db from './sqliteService';

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
        await db.saveUser({ ...resp.user, cachedAt: new Date().toISOString() });
      }
      return resp;
    } catch (err) {
      const localUser = await db.getUser(username);
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
      await db.saveCategories(categories);
      return categories;
    } catch (err) {
      return await db.getCategories();
    }
  },
  addCategory: (name) => request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  // Products
  getProducts: async () => {
    try {
      const products = await request('/products');
      // LWW Conflict Resolution for Products handled mostly by backend, but we ensure local DB matches remote
      await db.saveProducts(products);
      return products;
    } catch (err) {
      console.log('Using offline SQLite product cache');
      return await db.getProducts();
    }
  },
  addProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }) }),
  updateProduct: async (id, data) => {
    // Conflict resolution check
    const remote = await request(`/products/${id}`);
    if (remote.updatedAt && data.updatedAt && new Date(remote.updatedAt) > new Date(data.updatedAt)) {
      throw new Error('Conflict: Product was updated by another device. Refreshing.');
    }
    return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }) });
  },
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: async () => {
    try {
      const remote = await request('/sales');
      // Smart Merge into SQLite
      for (const s of remote) {
        await db.saveOnlineSale(s);
      }
      return await db.getAllSales();
    } catch (err) {
      console.warn('Using offline sales history from SQLite');
      return await db.getAllSales();
    }
  },
  createSale: async (data) => {
    const clientSaleId = crypto.randomUUID();
    const now = new Date().toISOString();

    const localCount = await db.getSalesCount();
    const invoiceNumber = `OFL-${String(localCount + 1).padStart(5, '0')}`;

    const localRecord = { 
      ...data, 
      clientSaleId,
      invoiceNumber,
      createdAt: now,
      date: now,
    };
    
    // Save to SQLite
    const localId = await db.saveOfflineSale(localRecord);
    
    try {
      const sale = await request('/sales', { method: 'POST', body: JSON.stringify({ ...data, clientSaleId }) });
      await db.saveOnlineSale(sale, localId);
      return sale;
    } catch (err) {
      console.warn('Sale saved offline in SQLite. Will sync later.');
      return { ...localRecord, localId, id: `offline_${localId}`, isOffline: true };
    }
  },
  clearSales: async () => {
    await request('/sales', { method: 'DELETE' });
    await db.clearAllSales();
  },

  // Seed
  seed: () => request('/seed', { method: 'POST' }),

  // Local Sync Helpers
  getUnsyncedCount: async () => {
    const unsynced = await db.getUnsyncedSales();
    return unsynced.length;
  },
  syncOfflineSales: async () => {
    const unsynced = await db.getUnsyncedSales();
    let count = 0;
    for (const sale of unsynced) {
      try {
        const { localId, synced, ...payload } = sale;
        const remote = await request('/sales', { method: 'POST', body: JSON.stringify(payload) });
        await db.saveOnlineSale(remote, localId);
        count++;
      } catch (err) { 
        // Ignore single fails, will retry later
      }
    }
    return count;
  },
  deduplicateSales: async () => {
    await db.deduplicateSales();
    return 0; // handled in SQL
  }
};

