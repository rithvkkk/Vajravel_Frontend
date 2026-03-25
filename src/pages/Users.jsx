import { useState, useEffect } from 'react';
import { api } from '../api';
import { FiPlus, FiTrash2, FiX, FiUserCheck } from 'react-icons/fi';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'cashier' });

  const load = () => {
    api.getUsers().then(setUsers).catch(() => {});
  };
  useEffect(load, []);

  const handleAdd = async () => {
    try {
      await api.addUser(form);
      setShowModal(false);
      setForm({ username: '', password: '', role: 'cashier' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to completely delete this user?')) {
      await api.deleteUser(id);
      load();
    }
  };

  return (
    <div className="animate-in">
      <div className="card">
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">System Users</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <FiPlus /> Add Cashier/Admin
          </button>
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Username</th><th>Role</th><th>System Access</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="td-bold">{u.username}</td>
                  <td>
                    <span className={`tag ${u.role === 'admin' ? 'tag-blue' : 'tag-gray'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td><span className="tag tag-green"><FiUserCheck /> Active</span></td>
                  <td>
                    {u.username !== 'admin' && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(u.id)}>
                        <FiTrash2 /> Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No users found (loading...)</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="modal-title" style={{ margin: 0 }}>Create New User</div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><FiX /></button>
            </div>

            <div className="input-group">
              <label>Username</label>
              <input className="input-field" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="cashier1" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input-field" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>Role</label>
              <select className="input-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Cashier</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={handleAdd}>
              Create User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
