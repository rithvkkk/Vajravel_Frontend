import { useState } from 'react';
import { api } from '../api';
import { FiLock, FiUser, FiArrowRight } from 'react-icons/fi';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.login(username, password);
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card animate-in" style={{ width: 400, padding: 32, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src="/logo.jpg" alt="Vajravel Crackers" style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome Back</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 32 }}>Vajravel Crackers Cloud POS</div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</div>}
          
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label>Username</label>
            <div className="search-box">
              <FiUser className="search-icon" />
              <input className="input-field" style={{ width: '100%', paddingLeft: 40 }} required value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
            </div>
          </div>
          
          <div className="input-group" style={{ marginBottom: 24 }}>
            <label>Password</label>
            <div className="search-box">
              <FiLock className="search-icon" />
              <input type="password" required className="input-field" style={{ width: '100%', paddingLeft: 40 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15 }} disabled={loading}>
            {loading ? 'Authenticating...' : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Sign In <FiArrowRight /></span>}
          </button>
        </form>
      </div>
    </div>
  );
}
