import { useEffect, useState } from 'react';
import { api } from '../api';
import { FiCloudOff, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

export default function SyncManager() {
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const checkSyncStatus = async () => {
    const count = await api.getUnsyncedCount();
    setUnsyncedCount(count);
  };

  const performSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const syncedCount = await api.syncOfflineSales();
      if (syncedCount > 0) {
        setLastSyncTime(new Date());
        await checkSyncStatus();
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkSyncStatus();
    
    // Check every 30 seconds
    const statusInterval = setInterval(checkSyncStatus, 30000);
    // Sync every 2 minutes if connected
    const syncInterval = setInterval(performSync, 120000);

    // Pull NEW products/categories every 5 minutes
    const pullInterval = setInterval(async () => {
      try { await api.getProducts(); await api.getCategories(); } catch(e){}
    }, 300000);

    // Also sync on window focus (potential internet return)
    window.addEventListener('focus', checkSyncStatus);

    return () => {
      clearInterval(statusInterval);
      clearInterval(syncInterval);
      clearInterval(pullInterval);
      window.removeEventListener('focus', checkSyncStatus);
    };
  }, []);

  if (unsyncedCount === 0 && !isSyncing) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 2000,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      animation: 'fadeUp 0.3s ease'
    }} onClick={performSync}>
      {isSyncing ? (
        <FiRefreshCw className="spin" style={{ color: 'var(--blue)' }} />
      ) : (
        <FiCloudOff style={{ color: 'var(--amber)' }} />
      )}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {isSyncing ? 'Syncing...' : `${unsyncedCount} sales pending`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {isSyncing ? 'Sending to cloud' : 'Click to manual sync'}
        </div>
      </div>
    </div>
  );
}
