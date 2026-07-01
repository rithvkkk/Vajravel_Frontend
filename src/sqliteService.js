import initSqlJs from 'sql.js';
// Vite can import the wasm file url directly
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import localforage from 'localforage';

let db = null;
const DB_KEY = 'VajravelPOS_SQLite';

export async function initDB() {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl
  });

  const savedData = await localforage.getItem(DB_KEY);
  
  if (savedData) {
    db = new SQL.Database(savedData);
  } else {
    db = new SQL.Database();
  }
  
  // Create schemas every time safely to ensure they exist (e.g. for updates)
  db.run(`
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
      items TEXT, -- JSON stringified array of items
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
  `);
  
  // Only saveDB on init if it's a fresh DB
  if (!savedData) saveDB();

  return db;
}

export function saveDB() {
  if (!db) return;
  const data = db.export();
  // Using localforage to persist the SQLite binary string/array
  localforage.setItem(DB_KEY, data).catch(console.error);
}

export async function clearDB() {
  await localforage.removeItem(DB_KEY);
  db = null;
}

// ── CRUD Helpers ──

export async function saveProducts(products) {
  await initDB();
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare('INSERT OR REPLACE INTO products (id, sku, name, categoryName, price, costPrice, stock, unit, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of products) {
    stmt.run([p.id, p.sku, p.name, p.categoryName, p.price, p.costPrice, p.stock, p.unit, p.updatedAt || new Date().toISOString()]);
  }
  stmt.free();
  db.run('COMMIT;');
  saveDB();
}

export async function getProducts() {
  await initDB();
  const res = db.exec('SELECT * FROM products ORDER BY name');
  if (res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export async function saveCategories(categories) {
  await initDB();
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare('INSERT OR REPLACE INTO categories (id, name, updatedAt) VALUES (?, ?, ?)');
  for (const c of categories) {
    stmt.run([c.id, c.name, c.updatedAt || new Date().toISOString()]);
  }
  stmt.free();
  db.run('COMMIT;');
  saveDB();
}

export async function getCategories() {
  await initDB();
  const res = db.exec('SELECT * FROM categories ORDER BY name');
  if (res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export async function saveUser(user) {
  await initDB();
  const stmt = db.prepare('INSERT OR REPLACE INTO users (username, role, cachedAt) VALUES (?, ?, ?)');
  stmt.run([user.username, user.role, user.cachedAt || new Date().toISOString()]);
  stmt.free();
  saveDB();
}

export async function getUser(username) {
  await initDB();
  const res = db.exec(`SELECT * FROM users WHERE username = '${username}'`);
  if (res.length === 0) return null;
  const cols = res[0].columns;
  const obj = {};
  cols.forEach((col, i) => { obj[col] = res[0].values[0][i]; });
  return obj;
}

export async function saveOfflineSale(sale) {
  await initDB();
  const itemsStr = JSON.stringify(sale.items || []);
  const stmt = db.prepare(`
    INSERT INTO sales (id, invoiceNumber, clientSaleId, customerName, customerPhone, subtotal, discount, tax, total, paymentMethod, items, synced, createdAt, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    sale.id || null, sale.invoiceNumber, sale.clientSaleId, sale.customerName, sale.customerPhone,
    sale.subtotal, sale.discount, sale.tax, sale.total, sale.paymentMethod, itemsStr,
    0, sale.createdAt, sale.date || new Date().toISOString()
  ]);
  stmt.free();
  saveDB();
  
  // Return the auto-incremented localId
  const res = db.exec('SELECT last_insert_rowid()');
  return res[0].values[0][0];
}

export async function saveOnlineSale(sale, localId = null) {
  await initDB();
  const itemsStr = JSON.stringify(sale.items || []);
  
  if (localId) {
    const stmt = db.prepare(`
      UPDATE sales SET id=?, invoiceNumber=?, synced=1, createdAt=? WHERE localId=?
    `);
    stmt.run([sale.id, sale.invoiceNumber, sale.createdAt, localId]);
    stmt.free();
  } else {
    // Upsert by clientSaleId
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sales (localId, id, invoiceNumber, clientSaleId, customerName, customerPhone, subtotal, discount, tax, total, paymentMethod, items, synced, createdAt, date)
      VALUES (
        (SELECT localId FROM sales WHERE clientSaleId = ?),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?
      )
    `);
    stmt.run([
      sale.clientSaleId, sale.id, sale.invoiceNumber, sale.clientSaleId, sale.customerName, sale.customerPhone,
      sale.subtotal, sale.discount, sale.tax, sale.total, sale.paymentMethod, itemsStr, sale.createdAt, sale.date || sale.createdAt
    ]);
    stmt.free();
  }
  saveDB();
}

export async function getUnsyncedSales() {
  await initDB();
  const res = db.exec('SELECT * FROM sales WHERE synced = 0');
  if (res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { 
      if (col === 'items') obj[col] = JSON.parse(row[i] || '[]');
      else obj[col] = row[i]; 
    });
    return obj;
  });
}

export async function getAllSales() {
  await initDB();
  const res = db.exec('SELECT * FROM sales ORDER BY localId DESC');
  if (res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { 
      if (col === 'items') obj[col] = JSON.parse(row[i] || '[]');
      else obj[col] = row[i]; 
    });
    return obj;
  });
}

export async function getSalesCount() {
  await initDB();
  const res = db.exec('SELECT COUNT(*) FROM sales');
  if (res.length === 0) return 0;
  return res[0].values[0][0];
}

export async function deduplicateSales() {
  await initDB();
  db.run(`
    DELETE FROM sales 
    WHERE localId NOT IN (
      SELECT MIN(localId) 
      FROM sales 
      GROUP BY clientSaleId 
      HAVING clientSaleId IS NOT NULL
    ) 
    AND clientSaleId IS NOT NULL;
  `);
  saveDB();
}

export async function clearAllSales() {
  await initDB();
  db.run('DELETE FROM sales;');
  saveDB();
}

export async function saveSettings(settingsArray) {
  await initDB();
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, val) VALUES (?, ?)');
  for (const s of settingsArray) {
    stmt.run([s.key, s.val]);
  }
  stmt.free();
  db.run('COMMIT;');
  saveDB();
}

export async function getSettings() {
  await initDB();
  const res = db.exec('SELECT * FROM settings');
  if (res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}
