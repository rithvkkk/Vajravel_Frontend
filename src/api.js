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
  addProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }) }),
  updateProduct: async (id, data) => {
    // Basic conflict resolution: pull latest to check before push (simplified)
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
      // Smart Merge: update existing by clientSaleId or remote id, or add new
      for (const s of remote) {
        const existing = await db.sales.where('clientSaleId').equals(s.clientSaleId).first() 
                      || await db.sales.where('id').equals(s.id).first();
        if (existing) {
          await db.sales.update(existing.localId, { ...s, synced: 1 });
        } else {
          await db.sales.add({ ...s, synced: 1 });
        }
      }
      return await db.sales.toArray();
    } catch (err) {
      console.warn('Using offline sales history');
      return await db.sales.toArray();
    }
  },
  createSale: async (data) => {
    // 1. Generate client-side identifiers immediately
    const clientSaleId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Generate a local invoice number from existing count
    const localCount = await db.sales.count();
    const invoiceNumber = `OFL-${String(localCount + 1).padStart(5, '0')}`;

    const localRecord = { 
      ...data, 
      clientSaleId,
      invoiceNumber,
      createdAt: now,
      date: now,
      synced: 0,
    };
    const localId = await db.sales.add(localRecord);
    
    try {
      // 2. Try to push to remote (server assigns the final VC-XXXXX number)
      const sale = await request('/sales', { method: 'POST', body: JSON.stringify({ ...data, clientSaleId }) });
      // 3. Update local record with server data (official invoice #, id, timestamp)
      await db.sales.update(localId, { 
        synced: 1, 
        id: sale.id, 
        invoiceNumber: sale.invoiceNumber, 
        createdAt: sale.createdAt 
      });
      return sale;
    } catch (err) {
      console.warn('Sale saved offline. Will sync later.');
      return { ...localRecord, localId, id: `offline_${localId}`, isOffline: true };
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
  },
  deduplicateSales: async () => {
    // Client-side cleanup for safety
    const all = await db.sales.toArray();
    const seen = new Set();
    const toDelete = [];
    for (const s of all) {
      const key = s.clientSaleId || s.id || `${s.invoiceNumber}-${s.total}`;
      if (seen.has(key)) toDelete.push(s.localId);
      else seen.add(key);
    }
    if (toDelete.length > 0) {
      await db.sales.bulkDelete(toDelete);
    }
    return toDelete.length;
  }
};

