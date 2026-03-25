import Dexie from 'dexie';

export const db = new Dexie('VajravelPOS');

db.version(1).stores({
  products: 'id, sku, name, categoryName',
  sales: '++localId, id, invoiceNumber, synced', // synced: 0 or 1
  settings: 'key'
});

export async function saveOfflineSale(sale) {
  return await db.sales.add({
    ...sale,
    synced: 0,
    date: new Date().toISOString()
  });
}

export async function getUnsyncedSales() {
  return await db.sales.where('synced').equals(0).toArray();
}

export async function markSaleSynced(localId, remoteId) {
  return await db.sales.update(localId, {
    synced: 1,
    id: remoteId
  });
}
