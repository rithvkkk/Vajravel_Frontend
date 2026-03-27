import { useState, useEffect } from 'react';
import { api } from '../api';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiCamera } from 'react-icons/fi';
import useBarcodeScanner from '../hooks/useBarcodeScanner';
import CameraScanner from '../components/CameraScanner';
import BarcodeGenerator from '../components/BarcodeGenerator';
import { FiMaximize, FiPrinter } from 'react-icons/fi';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', price: '', costPrice: '', stock: '', unit: 'pcs', categoryName: '' });

  const load = () => {
    api.getProducts().then(setProducts).catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
  };
  useEffect(load, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.categoryName === activeCategory;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', price: '', costPrice: '', stock: '', unit: 'pcs', categoryName: categories[0]?.name || '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, sku: p.sku, price: p.price, costPrice: p.costPrice, stock: p.stock, unit: p.unit, categoryName: p.categoryName });
    setShowModal(true);
  };

  const handleSave = async () => {
    const data = { ...form, price: Number(form.price), costPrice: Number(form.costPrice), stock: Number(form.stock) };
    if (editProduct) {
      await api.updateProduct(editProduct.id, data);
    } else {
      await api.addProduct(data);
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product permanently?')) {
      await api.deleteProduct(id);
      load();
    }
  };

  const handleScan = (sku) => {
    const existing = products.find(p => p.sku === sku);
    if (existing) {
      openEdit(existing);
    } else {
      setEditProduct(null);
      setForm({ name: '', sku: sku, price: '', costPrice: '', stock: '', unit: 'pcs', categoryName: categories[0]?.name || '' });
      setShowModal(true);
    }
    setShowCamera(false);
  };
  useBarcodeScanner(handleScan);

  const totalValue = products.reduce((a, p) => a + p.price * p.stock, 0);
  const totalItems = products.reduce((a, p) => a + p.stock, 0);

  return (
    <div>
      {/* Quick Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card animate-in animate-in-1">
          <div className="kpi-label">Total Products</div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 6 }}>{products.length}</div>
        </div>
        <div className="kpi-card animate-in animate-in-2">
          <div className="kpi-label">Total Stock Units</div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 6 }}>{totalItems.toLocaleString('en-IN')}</div>
        </div>
        <div className="kpi-card animate-in animate-in-3">
          <div className="kpi-label">Inventory Value</div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 6, color: 'var(--teal)' }}>₹{totalValue >= 100000 ? `${(totalValue / 100000).toFixed(1)}L` : totalValue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="card animate-in" style={{ animationDelay: '.2s' }}>
        <div className="card-header">
          <div className="card-title">Product Catalog</div>
          <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Product</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div className="search-box" style={{ flex: 1 }}>
            <FiSearch className="search-icon" />
            <input placeholder="Search products or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-ghost" title="Scan with Camera" onClick={() => setShowCamera(true)}>
            <FiCamera size={16} /> Scan
          </button>
        </div>

        <div className="filter-tabs">
          <button className={`ftab ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>All ({products.length})</button>
          {categories.map(c => {
            const count = products.filter(p => p.categoryName === c.name).length;
            return (
              <button key={c.id} className={`ftab ${activeCategory === c.name ? 'active' : ''}`} onClick={() => setActiveCategory(c.name)}>
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const margin = p.price > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : 0;
                const stockColor = p.stock < 5 ? 'var(--red)' : p.stock < 20 ? 'var(--amber)' : 'var(--teal)';
                return (
                  <tr key={p.id}>
                    <td className="td-bold">{p.name}</td>
                    <td className="td-muted">{p.sku}</td>
                    <td><span className="tag tag-blue">{p.categoryName}</span></td>
                    <td className="td-bold">₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td className="td-muted">₹{Number(p.costPrice).toLocaleString('en-IN')}</td>
                    <td><span className="tag tag-green">{margin}%</span></td>
                    <td>
                      <span style={{ fontWeight: 600, color: stockColor }}>{p.stock} {p.unit}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" title="Generate Barcode" onClick={() => setBarcodeProduct(p)}><FiMaximize /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><FiEdit2 /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="modal-title" style={{ margin: 0 }}>{editProduct ? 'Edit Product' : 'Add New Product'}</div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><FiX /></button>
            </div>

            <div className="input-group">
              <label>Product Name*</label>
              <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sky Shot Rocket" />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>SKU*</label>
                <input className="input-field" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. RK-004" />
              </div>
              <div className="input-group">
                <label>Category</label>
                <select className="input-field" value={form.categoryName} onChange={e => setForm({ ...form, categoryName: e.target.value })}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Selling Price (₹)*</label>
                <input className="input-field" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Cost Price (₹)</label>
                <input className="input-field" type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Stock Quantity</label>
                <input className="input-field" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Unit</label>
                <select className="input-field" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="pcs">Pieces</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSave}>
                <FiSave /> {editProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARCODE PREVIEW MODAL */}
      {barcodeProduct && (
        <div className="modal-overlay" onClick={() => setBarcodeProduct(null)}>
          <div className="modal" style={{ width: 340, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="modal-title" style={{ margin: 0 }}>Product Barcode</div>
              <button className="icon-btn" onClick={() => setBarcodeProduct(null)}><FiX /></button>
            </div>
            
            <div style={{ padding: 20, background: '#f8f9fa', borderRadius: 12, marginBottom: 20 }}>
              <BarcodeGenerator value={barcodeProduct.sku} width={1.5} height={60} />
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{barcodeProduct.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>SKU: {barcodeProduct.sku}</div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.print()}>
              <FiPrinter /> Print Label
            </button>
          </div>
        </div>
      )}

      {showCamera && (
        <CameraScanner 
          onScan={handleScan} 
          onClose={() => setShowCamera(false)} 
        />
      )}
    </div>
  );
}
