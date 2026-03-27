import { useState, useEffect } from 'react';
import { api } from '../api';
import { db } from '../db';
import { FiSave, FiInfo, FiDatabase, FiPrinter, FiDownload, FiUpload } from 'react-icons/fi';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('VAJRAVEL CRACKERS');
  const [phone, setPhone] = useState('9876543210');
  const [gstin, setGstin] = useState('33ABCDE1234F1ZK');
  const [gstPct, setGstPct] = useState(18);

  useEffect(() => {
    async function load() {
      const s = await db.settings.toArray();
      const map = Object.fromEntries(s.map(i => [i.key, i.val]));
      if (map.storeName) setStoreName(map.storeName);
      if (map.phone) setPhone(map.phone);
      if (map.gstin) setGstin(map.gstin);
      if (map.gstPct) setGstPct(Number(map.gstPct));
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    await db.settings.put({ key: 'storeName', val: storeName });
    await db.settings.put({ key: 'phone', val: phone });
    await db.settings.put({ key: 'gstin', val: gstin });
    await db.settings.put({ key: 'gstPct', val: gstPct });
    alert('Settings saved successfully!');
  };

  const handleExport = async () => {
    const data = {
      products: await db.products.toArray(),
      sales: await db.sales.toArray(),
      categories: await db.categories.toArray(),
      settings: await db.settings.toArray(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vajravel_POS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) return <div style={{ padding: 20, color: 'var(--text3)' }}>Loading settings...</div>;

  return (
    <div className="animate-in">
      <div className="card">
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">System Settings</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 15 }}>
              <FiPrinter color="var(--blue)" /> Receipt Formatting
            </div>
            <div className="input-group" style={{ maxWidth: 400 }}>
              <label>Store Name (Printed on Receipt)</label>
              <input className="input-field" value={storeName} onChange={e => setStoreName(e.target.value)} />
            </div>
            <div className="input-group" style={{ maxWidth: 400 }}>
              <label>Contact Phone</label>
              <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="input-group" style={{ maxWidth: 400 }}>
              <label>GSTIN Number</label>
              <input className="input-field" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="33XXXXX..." />
            </div>
          </div>

          <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 15 }}>
              <FiDatabase color="var(--teal)" /> Financials & Tax
            </div>
            <div className="input-group" style={{ maxWidth: 200 }}>
              <label>Default GST Percentage</label>
              <input className="input-field" type="number" value={gstPct} onChange={e => setGstPct(e.target.value)} />
            </div>
          </div>

          <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 15 }}>
              <FiDatabase color="var(--blue)" /> Data Management & Backup
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Advanced tools to maintain and backup your local and cloud database.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }} onClick={handleExport}>
                <FiDownload style={{ marginRight: 8 }} /> Export Full JSON
              </button>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--blue)', color: 'var(--blue)', background: 'var(--surface)' }} onClick={async () => {
                const count = await api.deduplicateSales();
                alert(`Data repair complete! Removed ${count} duplicate records from local cache. Refreshing...`);
                window.location.reload();
              }}>
                <FiSearch style={{ marginRight: 8 }} /> Repair History
              </button>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--red)', color: 'var(--red)', background: 'var(--surface)' }} onClick={() => {
                if(confirm('DANGER: This will wipe ALL sales history from the cloud permanently! This cannot be undone.')) {
                  api.clearSales().then(() => alert('Cloud sales history cleared successfully.'));
                }
              }}>
                <FiTrash2 style={{ marginRight: 8 }} /> Wipe Cloud Data
              </button>
            </div>
          </div>

          <div style={{ padding: 16, background: 'rgba(34, 153, 221, 0.05)', borderRadius: 12, border: '1px solid var(--blue-dark)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 600, fontSize: 14, color: 'var(--blue)' }}>
              <FiInfo /> System Information
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
              <div>Version: <strong>2.6.0 (Enterprise)</strong></div>
              <div>Database: <strong>IndexedDB (Offline) + MongoDB (Sync)</strong></div>
              <div>Environment: <strong>Production Mode</strong></div>
            </div>
          </div>

        </div>

        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              if (window.confirm('Delete local data?')) { await db.delete(); window.location.reload(); }
            }}>Reset Data</button>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              try { await api.seed(); alert('Seeded!'); window.location.reload(); } catch(e) { alert(e.message); }
            }}>Re-Seed</button>
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            <FiSave /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
