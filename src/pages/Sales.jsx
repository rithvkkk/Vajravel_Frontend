import { useState, useEffect } from 'react';
import { api } from '../api';
import { FiSearch, FiEye, FiX, FiCalendar, FiTrash2 } from 'react-icons/fi';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [viewSale, setViewSale] = useState(null);

  const load = () => {
    api.getSales().then(setSales).catch(() => {});
  };
  useEffect(load, []);

  const safeSales = Array.isArray(sales) ? sales : [];

  // UI-level deduplication (Final Guardrail)
  const uniqueSales = [];
  const seen = new Set();
  for (const s of safeSales) {
    const key = s.clientSaleId || s.id || `${s.invoiceNumber}-${s.total}-${s.createdAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSales.push(s);
    }
  }

  const filtered = uniqueSales.filter(s => {
    return s.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
           s.customerName?.toLowerCase().includes(search.toLowerCase());
  });

  const totalRevenue = safeSales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalTax = safeSales.reduce((a, s) => a + Number(s.tax || 0), 0);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* Quick Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card animate-in animate-in-1">
          <div className="kpi-label">Total Sales</div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 6 }}>{safeSales.length}</div>
        </div>
        <div className="kpi-card animate-in animate-in-2">
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 6, color: 'var(--teal)' }}>
            ₹{totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(1)}L` : totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="kpi-card animate-in animate-in-3">
          <div className="kpi-label">Total Tax Collected</div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 6, color: 'var(--amber)' }}>
            ₹{totalTax >= 100000 ? `${(totalTax / 100000).toFixed(1)}L` : totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="card animate-in" style={{ animationDelay: '.2s' }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="card-title">All Transactions</div>
            <span className="tag tag-green">{safeSales.length} records</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div className="search-box" style={{ flex: 1 }}>
            <FiSearch className="search-icon" />
            <input placeholder="Search by invoice # or customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
            <div>No sales found{search ? ' matching your search' : ' — start billing!'}</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="td-bold" style={{ color: 'var(--blue)' }}>{s.invoiceNumber}</td>
                    <td className="td-muted" style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiCalendar size={12} />{formatDate(s.createdAt)}</div>
                    </td>
                    <td>{s.customerName}</td>
                    <td><span className="tag tag-gray">{(s.items || []).length} items</span></td>
                    <td>
                      <span className="tag" style={{
                        background: s.paymentMethod === 'cash' ? 'var(--teal-light)' : s.paymentMethod === 'upi' ? 'var(--purple-light)' : 'var(--blue-light)',
                        color: s.paymentMethod === 'cash' ? 'var(--teal)' : s.paymentMethod === 'upi' ? 'var(--purple)' : 'var(--blue)',
                      }}>
                        {s.paymentMethod === 'cash' ? '💵' : s.paymentMethod === 'upi' ? '📱' : '💳'} {(s.paymentMethod || 'cash').toUpperCase()}
                      </span>
                    </td>
                    <td className="td-bold" style={{ color: 'var(--teal)', fontFamily: "'Syne',sans-serif" }}>₹{Number(s.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td><span className="tag tag-green">Completed</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewSale(s)}><FiEye /> View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW SALE MODAL */}
      {viewSale && (
        <div className="modal-overlay" onClick={() => setViewSale(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div className="modal-title" style={{ margin: 0 }}>Invoice {viewSale.invoiceNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{formatDate(viewSale.createdAt)}</div>
              </div>
              <button className="icon-btn" onClick={() => setViewSale(null)}><FiX /></button>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>Customer</span><span style={{ fontWeight: 500 }}>{viewSale.customerName}</span>
              </div>
              {viewSale.customerPhone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text2)' }}>Phone</span><span>{viewSale.customerPhone}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Payment</span>
                <span className="tag" style={{
                  background: viewSale.paymentMethod === 'cash' ? 'var(--teal-light)' : 'var(--purple-light)',
                  color: viewSale.paymentMethod === 'cash' ? 'var(--teal)' : 'var(--purple)',
                }}>{(viewSale.paymentMethod || 'cash').toUpperCase()}</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Items</div>
              <table style={{ fontSize: 13 }}>
                <thead><tr><th>Product</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {(viewSale.items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName || `Product #${item.productId}`}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{Number(item.price).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(item.total).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="cart-summary">
                <div className="cart-row"><span>Subtotal</span><span>₹{Number(viewSale.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="cart-row"><span>GST (18%)</span><span>₹{Number(viewSale.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                {viewSale.discount > 0 && <div className="cart-row"><span>Discount</span><span>-₹{Number(viewSale.discount).toLocaleString('en-IN')}</span></div>}
                <div className="cart-row total"><span>Total</span><span>₹{Number(viewSale.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
