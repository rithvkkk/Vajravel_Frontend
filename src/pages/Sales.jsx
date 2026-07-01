import { useState, useEffect } from 'react';
import { api } from '../api';
import { FiSearch, FiEye, FiX, FiCalendar, FiTrash2 } from 'react-icons/fi';
import Receipt from '../components/Receipt';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [viewSale, setViewSale] = useState(null);
  const [user] = useState(() => JSON.parse(localStorage.getItem('pos_user')) || {});

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

  const handleExportGSTR1 = () => {
    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Invoice Value', 'Taxable Value', 'CGST (9%)', 'SGST (9%)'];
    const rows = [headers.join(',')];

    safeSales.forEach(s => {
      const date = new Date(s.createdAt).toLocaleDateString('en-IN');
      const invoiceVal = Number(s.total).toFixed(2);
      const taxableVal = (s.total / 1.18).toFixed(2);
      const cgst = ((s.total - (s.total / 1.18)) / 2).toFixed(2);
      const sgst = cgst;
      rows.push(`${s.invoiceNumber},${date},"${s.customerName || 'Cash'}",${invoiceVal},${taxableVal},${cgst},${sgst}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join('\\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR1_Export_${new Date().toLocaleDateString('en-IN').replace(/\\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={handleExportGSTR1}>Export GSTR-1 (CSV)</button>
          )}
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
        <Receipt sale={viewSale} onClose={() => setViewSale(null)} />
      )}
    </div>
  );
}
