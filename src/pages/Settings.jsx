import { FiSave, FiInfo, FiDatabase, FiPrinter } from 'react-icons/fi';

export default function Settings() {
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
              <input className="input-field" defaultValue="VAJRAVEL CRACKERS" disabled />
            </div>
            <div className="input-group" style={{ maxWidth: 400 }}>
              <label>Contact Phone</label>
              <input className="input-field" defaultValue="9876543210" disabled />
            </div>
          </div>

          <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 15 }}>
              <FiDatabase color="var(--teal)" /> Financials & Tax
            </div>
            <div className="input-group" style={{ maxWidth: 200 }}>
              <label>Default GST Percentage</label>
              <input className="input-field" type="number" defaultValue={18} disabled />
            </div>
          </div>

          <div style={{ padding: 16, background: 'rgba(34, 153, 221, 0.05)', borderRadius: 12, border: '1px solid var(--blue-dark)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 600, fontSize: 14, color: 'var(--blue)' }}>
              <FiInfo /> System Information
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
              <div>Version: <strong>2.4.0 (Cloud)</strong></div>
              <div>Database: <strong>MongoDB Atlas (Connected)</strong></div>
              <div>Environment: <strong>Production</strong></div>
            </div>
          </div>

        </div>

        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => alert('Settings saved successfully!')}>
            <FiSave /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
