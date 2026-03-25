import { useState, useEffect } from 'react';
import { api } from '../api';
import { FiDollarSign, FiShoppingBag, FiPackage, FiAlertTriangle, FiTrendingUp, FiActivity, FiCloud, FiCloudOff } from 'react-icons/fi';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    api.getDashboard().then(setStats).catch(() => {});
    api.getProducts().then(setProducts).catch(() => {});
    api.getSales().then(s => setSales(s.slice(0, 5))).catch(() => {});
    api.getUnsyncedCount().then(setUnsyncedCount).catch(() => {});
  }, []);

  if (!stats) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading dashboard...</div>;

  const fmt = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  const lowStockProducts = products.filter(p => p.stock < 20).sort((a, b) => a.stock - b.stock).slice(0, 6);
  const topProducts = products.sort((a, b) => b.price - a.price).slice(0, 5);

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi-card animate-in animate-in-1">
          <div className="kpi-top">
            <span className="kpi-label">Sync Status</span>
            <div className="kpi-icon" style={{ 
              background: unsyncedCount > 0 ? 'var(--amber-light)' : 'var(--teal-light)', 
              color: unsyncedCount > 0 ? 'var(--amber)' : 'var(--teal)' 
            }}>
              {unsyncedCount > 0 ? <FiCloudOff /> : <FiCloud />}
            </div>
          </div>
          <div className="kpi-value">{unsyncedCount === 0 ? 'Synced' : unsyncedCount}</div>
          <div className="kpi-meta neutral">
            {unsyncedCount === 0 ? 'All data in cloud' : 'Pending upload'}
          </div>
        </div>
        <div className="kpi-card animate-in animate-in-1">
          <div className="kpi-top">
            <span className="kpi-label">Today's Revenue</span>
            <div className="kpi-icon" style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}><FiDollarSign /></div>
          </div>
          <div className="kpi-value">{fmt(stats.todayRevenue)}</div>
          <div className="kpi-meta up"><FiTrendingUp /> {stats.todayOrders} orders today</div>
        </div>
        <div className="kpi-card animate-in animate-in-2">
          <div className="kpi-top">
            <span className="kpi-label">Total Revenue</span>
            <div className="kpi-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}><FiActivity /></div>
          </div>
          <div className="kpi-value">{fmt(stats.totalRevenue)}</div>
          <div className="kpi-meta neutral">{stats.totalSales} total orders</div>
        </div>
        <div className="kpi-card animate-in animate-in-3">
          <div className="kpi-top">
            <span className="kpi-label">Products</span>
            <div className="kpi-icon" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}><FiPackage /></div>
          </div>
          <div className="kpi-value">{stats.totalProducts}</div>
          <div className="kpi-meta neutral">in catalog</div>
        </div>
        <div className="kpi-card animate-in animate-in-4">
          <div className="kpi-top">
            <span className="kpi-label">Low Stock Alert</span>
            <div className="kpi-icon" style={{ background: 'var(--red-light)', color: 'var(--red)' }}><FiAlertTriangle /></div>
          </div>
          <div className="kpi-value">{stats.lowStock}</div>
          <div className="kpi-meta down">items below threshold</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Sales */}
        <div className="card animate-in" style={{ animationDelay: '.25s' }}>
          <div className="card-header">
            <div className="card-title">Recent Sales</div>
            <span className="tag tag-green">{stats.totalSales} total</span>
          </div>
          {sales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>No sales yet — start billing!</div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id}>
                      <td className="td-bold">{s.invoiceNumber}</td>
                      <td>{s.customerName}</td>
                      <td className="td-bold" style={{ color: 'var(--teal)' }}>₹{Number(s.total).toLocaleString('en-IN')}</td>
                      <td><span className="tag tag-green">Completed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Items */}
        <div className="card animate-in" style={{ animationDelay: '.3s' }}>
          <div className="card-header">
            <div className="card-title">Low Stock Items</div>
            <span className="tag tag-red">{lowStockProducts.length} items</span>
          </div>
          {lowStockProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>All stock levels are healthy 🎉</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStockProducts.map(p => {
                const pct = Math.min((p.stock / 100) * 100, 100);
                const color = p.stock < 5 ? 'var(--red)' : p.stock < 15 ? 'var(--amber)' : 'var(--teal)';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.sku}</div>
                    </div>
                    <div className="stock-level" style={{ minWidth: 140 }}>
                      <div className="stock-bar">
                        <div className="stock-fill" style={{ width: `${pct}%`, background: color }}></div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 50, textAlign: 'right' }}>{p.stock} {p.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card animate-in" style={{ animationDelay: '.35s' }}>
        <div className="card-header">
          <div className="card-title">Top Products by Price</div>
          <span className="tag tag-purple">Premium Items</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
            <tbody>
              {topProducts.map(p => (
                <tr key={p.id}>
                  <td className="td-bold">{p.name}</td>
                  <td className="td-muted">{p.sku}</td>
                  <td><span className="tag tag-blue">{p.categoryName || 'N/A'}</span></td>
                  <td className="td-bold" style={{ color: 'var(--teal)' }}>₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td>{p.stock} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
