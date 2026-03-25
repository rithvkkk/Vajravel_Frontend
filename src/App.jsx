import { useState, useEffect } from 'react';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SyncManager from './components/SyncManager';
import './index.css';

import { FiHome, FiShoppingCart, FiBox, FiList, FiUsers, FiSettings, FiBell, FiSearch, FiLogOut, FiMenu } from 'react-icons/fi';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiHome /> },
  { id: 'pos', label: 'Point of Sale', icon: <FiShoppingCart /> },
  { id: 'inventory', label: 'Inventory', icon: <FiBox /> },
  { id: 'sales', label: 'Sales History', icon: <FiList /> },
  { id: 'users', label: 'System Users', icon: <FiUsers /> },
];

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('dashboard');
  const [seeded, setSeeded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Auto-seed on first load
    if (user) { // Only seed if logged in
      api.getProducts().then(products => {
        if (products.length === 0 && !seeded) {
          api.seed().then(() => {
            setSeeded(true);
            window.location.reload();
          });
        }
      }).catch(() => {});
    }
  }, [user, seeded]); // Depend on user and seeded state

  const handleLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const pageTitle = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    inventory: 'Inventory & Products',
    sales: 'Sales History',
  };
  const pageSub = {
    dashboard: 'Business overview at a glance',
    pos: 'Create bills & process transactions',
    inventory: 'Manage your crackers catalog',
    sales: 'View all past transactions',
    users: 'Manage cashiers and administrators',
    settings: 'Configure application preferences',
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />}
      
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.jpg" alt="Vajravel Crackers" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: 15 }}>Vajravel</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'DM Sans',sans-serif", fontWeight: 400, letterSpacing: '.04em' }}>CRACKERS POS</div>
          </div>
        </div>

        <div className="sidebar-section">Main Menu</div>
        <nav className="sidebar-nav">
          {NAV.map(n => {
            if (n.id === 'users' && user?.role !== 'admin') return null;
            return (
              <button
                key={n.id}
                className={`nav-item ${page === n.id ? 'active' : ''}`}
                onClick={() => { setPage(n.id); setSidebarOpen(false); }}
              >
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 16 }}>System</div>
        <nav className="sidebar-nav" style={{ paddingBottom: 16 }}>
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => { setPage('settings'); setSidebarOpen(false); }}>
            <span className="nav-icon"><FiSettings /></span>
            Settings
          </button>
        </nav>
      </aside>

      {/* MAIN AREA */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <div>
              <div className="topbar-title">{pageTitle[page]}</div>
              <div className="topbar-sub">{pageSub[page]}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="icon-btn"><FiSearch /></div>
            <div className="icon-btn" style={{ position: 'relative' }}>
              <FiBell />
              <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', border: '2px solid var(--surface)' }}></div>
            </div>
            <div className="avatar">VC</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', textTransform: 'capitalize' }}>{user?.username}</div>
            <button className="icon-btn" title="Logout" onClick={handleLogout}>
              <FiLogOut />
            </button>
          </div>
        </header>

        <div className="page-content">
          {page === 'dashboard' && <Dashboard />}
          {page === 'pos' && <POS />}
          {page === 'inventory' && <Inventory />}
          {page === 'sales' && <Sales />}
          {page === 'users' && user?.role === 'admin' && <Users />}
          {page === 'settings' && <Settings />}
        </div>
        <SyncManager />
      </div>
    </div>
  );
}
