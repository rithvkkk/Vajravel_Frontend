import { SQLocal } from 'sqlocal';

// sqlocal creates the Web Worker and connects to OPFS automatically
const { sql } = new SQLocal('VajravelPOS.sqlite3');
let isInitialized = false;

export async function initDB() {
  if (isInitialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name TEXT,
      categoryName TEXT,
      price REAL,
      costPrice REAL,
      stock INTEGER,
      unit TEXT,
      updatedAt TEXT
    );
    
    CREATE TABLE IF NOT EXISTS sales (
      localId INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT,
      invoiceNumber TEXT,
      clientSaleId TEXT UNIQUE,
      customerName TEXT,
      customerPhone TEXT,
      subtotal REAL,
      discount REAL,
      tax REAL,
      total REAL,
      paymentMethod TEXT,
      items TEXT,
      synced INTEGER DEFAULT 0,
      createdAt TEXT,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      role TEXT,
      cachedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      val TEXT
    );
  `;
  isInitialized = true;
}

export async function clearDB() {
  await initDB();
  await sql`DELETE FROM products`;
  await sql`DELETE FROM sales`;
  await sql`DELETE FROM categories`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM settings`;
}

// ── CRUD Helpers ──

export async function saveProducts(products) {
  await initDB();
  await sql`BEGIN TRANSACTION;`;
  for (const p of products) {
    await sql`INSERT OR REPLACE INTO products (id, sku, name, categoryName, price, costPrice, stock, unit, updatedAt) VALUES (${p.id}, ${p.sku}, ${p.name}, ${p.categoryName}, ${p.price}, ${p.costPrice}, ${p.stock}, ${p.unit}, ${p.updatedAt || new Date().toISOString()})`;
  }
  await sql`COMMIT;`;
}

export async function getProducts() {
  await initDB();
  return await sql`SELECT * FROM products ORDER BY name`;
}

export async function saveCategories(categories) {
  await initDB();
  await sql`BEGIN TRANSACTION;`;
  for (const c of categories) {
    await sql`INSERT OR REPLACE INTO categories (id, name, updatedAt) VALUES (${c.id}, ${c.name}, ${c.updatedAt || new Date().toISOString()})`;
  }
  await sql`COMMIT;`;
}

export async function getCategories() {
  await initDB();
  return await sql`SELECT * FROM categories ORDER BY name`;
}

export async function saveUser(user) {
  await initDB();
  await sql`INSERT OR REPLACE INTO users (username, role, cachedAt) VALUES (${user.username}, ${user.role}, ${user.cachedAt || new Date().toISOString()})`;
}

export async function getUser(username) {
  await initDB();
  const res = await sql`SELECT * FROM users WHERE username = ${username}`;
  return res.length > 0 ? res[0] : null;
}

export async function saveOfflineSale(sale) {
  await initDB();
  const itemsStr = JSON.stringify(sale.items || []);
  const res = await sql`
    INSERT INTO sales (id, invoiceNumber, clientSaleId, customerName, customerPhone, subtotal, discount, tax, total, paymentMethod, items, synced, createdAt, date)
    VALUES (${sale.id || null}, ${sale.invoiceNumber}, ${sale.clientSaleId}, ${sale.customerName}, ${sale.customerPhone}, ${sale.subtotal}, ${sale.discount}, ${sale.tax}, ${sale.total}, ${sale.paymentMethod}, ${itemsStr}, 0, ${sale.createdAt}, ${sale.date || new Date().toISOString()})
    RETURNING localId;
  `;
  return res[0].localId;
}

export async function saveOnlineSale(sale, localId = null) {
  await initDB();
  const itemsStr = JSON.stringify(sale.items || []);
  
  if (localId) {
    await sql`
      UPDATE sales SET id=${sale.id}, invoiceNumber=${sale.invoiceNumber}, synced=1, createdAt=${sale.createdAt} WHERE localId=${localId}
    `;
  } else {
    // Upsert by clientSaleId
    await sql`
      INSERT OR REPLACE INTO sales (localId, id, invoiceNumber, clientSaleId, customerName, customerPhone, subtotal, discount, tax, total, paymentMethod, items, synced, createdAt, date)
      VALUES (
        (SELECT localId FROM sales WHERE clientSaleId = ${sale.clientSaleId}),
        ${sale.id}, ${sale.invoiceNumber}, ${sale.clientSaleId}, ${sale.customerName}, ${sale.customerPhone},
        ${sale.subtotal}, ${sale.discount}, ${sale.tax}, ${sale.total}, ${sale.paymentMethod}, ${itemsStr}, 1, ${sale.createdAt}, ${sale.date || sale.createdAt}
      )
    `;
  }
}

export async function getUnsyncedSales() {
  await initDB();
  const res = await sql`SELECT * FROM sales WHERE synced = 0`;
  return res.map(row => ({...row, items: JSON.parse(row.items || '[]')}));
}

export async function getAllSales() {
  await initDB();
  const res = await sql`SELECT * FROM sales ORDER BY localId DESC`;
  return res.map(row => ({...row, items: JSON.parse(row.items || '[]')}));
}

export async function getSalesCount() {
  await initDB();
  const res = await sql`SELECT COUNT(*) as count FROM sales`;
  return res[0].count;
}

export async function deduplicateSales() {
  await initDB();
  await sql`
    DELETE FROM sales 
    WHERE localId NOT IN (
      SELECT MIN(localId) 
      FROM sales 
      GROUP BY clientSaleId 
      HAVING clientSaleId IS NOT NULL
    ) 
    AND clientSaleId IS NOT NULL;
  `;
}

export async function clearAllSales() {
  await initDB();
  await sql`DELETE FROM sales;`;
}

export async function saveSettings(settingsArray) {
  await initDB();
  await sql`BEGIN TRANSACTION;`;
  for (const s of settingsArray) {
    await sql`INSERT OR REPLACE INTO settings (key, val) VALUES (${s.key}, ${s.val})`;
  }
  await sql`COMMIT;`;
}

export async function getSettings() {
  await initDB();
  return await sql`SELECT * FROM settings`;
}
